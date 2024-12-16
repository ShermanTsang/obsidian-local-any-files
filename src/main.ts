import {Plugin, TFile, Notice, Menu, Editor, MarkdownView} from 'obsidian';
import {LocalAttachmentsSettingTab} from "./settings-tab";
import {DEFAULT_SETTINGS, EXTENSION_PRESETS} from "./config";
import {FileDownloader, LinkExtractor, LinkReplacer} from "./utils/link-extractor";
import {ProcessModal} from "./process-modal";
import {OptionsModal} from './options-modal';
import {SingleItemModal} from './single-item-modal';
import {SettingsValidator} from './utils/settings-validator';

export default class LocalAttachmentsPlugin extends Plugin {
    settings: LocalAttachmentsSettings;

    async onload() {
        await this.loadSettings();

        // Add commands
        this.addCommand({
            id: 'local-anything',
            name: 'Download attachments from links',
            callback: () => this.handleDownloadWithOptions()
        });

        this.addCommand({
            id: 'local-anything-use-previous-options',
            name: 'Download attachments from links (use previous options)',
            callback: () => this.handleDownload()
        });

        // Register context menu events

        this.registerEvent(
            this.app.workspace.on('editor-menu', (menu, editor, view) => {
                if (view instanceof MarkdownView) {
                    const pos = editor.getCursor();
                    const line = editor.getLine(pos.line);
                    const linkMatch = line.match(/\[([^\]]*)\]\(([^)]+)\)/);
                    const imageMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
                    
                    if (linkMatch || imageMatch) {
                        const match = linkMatch || imageMatch;
                        if (match) {
                            const url = match[2];
                            // Extract extension from URL, handling query parameters and paths
                            let ext = '';
                            try {
                                const urlObj = new URL(url);
                                const pathname = urlObj.pathname;
                                const filename = pathname.split('/').pop() || '';
                                ext = '.' + (filename.split('.').pop() || '').toLowerCase();
                            } catch {
                                // If not a valid URL, try basic extension extraction
                                ext = '.' + (url.split('.').pop() || '').toLowerCase().split(/[?#]/)[0];
                            }
                            
                            // Check if it's an image URL or matches preset extensions
                            const isImage = EXTENSION_PRESETS.image.includes(ext);
                            const finalExtensions = this.getFinalExtensions();
                            const isPresetExtension = finalExtensions && finalExtensions.includes(ext);

                            console.debug('URL:', url, 'Extension:', ext, 'Is Image:', isImage, 'Is Preset:', isPresetExtension);
                            
                            if (isImage || isPresetExtension) {
                                menu.addItem((item) => {
                                    item
                                        .setTitle('Download to local')
                                        .setIcon('download')
                                        .onClick(async () => {
                                            if (this.settings) {
                                                new SingleItemModal(this.app, this, url, async () => {
                                                    await this.handleSingleDownload(url);
                                                }).open();
                                            }
                                        });
                                });
                            }
                        }
                    }
                }
            })
        );

        // Add settings tab
        this.addSettingTab(new LocalAttachmentsSettingTab(this.app, this));
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    private async validateAndProcess(processCallback: () => Promise<void>): Promise<boolean> {
        const validationResult = SettingsValidator.validateSettings(this.settings);
        if (!validationResult.isValid) {
            new Notice('Invalid settings detected:\n' + validationResult.errors.join('\n'), 5000);
            return false;
        }
        return true;
    }

    private async handleDownloadWithOptions() {
        new OptionsModal(
            this.app,
            this,
            () => this.handleDownload()
        ).open();
    }

    private async handleDownload() {
        if (!await this.validateAndProcess(() => Promise.resolve())) {
            return;
        }

        const modal = new ProcessModal(this.app, this, async () => {
            try {
                // Get files to process based on scope
                let documents: TFile[] = [];
                const activeDocument = this.app.workspace.getActiveFile();
                
                switch (this.settings.scope) {
                    case 'currentFile':
                        documents = activeDocument ? [activeDocument] : [];
                        break;
                    case 'allFiles':
                        documents = this.app.vault.getMarkdownFiles();
                        break;
                    case 'currentFolder':
                        if (activeDocument) {
                            const currentFolder = activeDocument.parent?.path || '';
                            documents = this.app.vault.getMarkdownFiles()
                                .filter(document => document.parent?.path === currentFolder);
                        }
                        break;
                }

                let processedDocuments = 0;
                const totalDocuments = documents.length;

                if (totalDocuments === 0) {
                    modal.addLog('No documents found in the selected scope.', 'error');
                    return;
                }

                // Initialize stats
                modal.updateStats({
                    totalFiles: totalDocuments,
                    processedFiles: 0,
                    totalLinks: 0,
                    downloadedFiles: 0,
                    failedFiles: 0
                });

                let totalLinks = 0;
                let downloadedFiles = 0;
                let failedFiles = 0;

                for (const document of documents) {
                    modal.startDocumentLog(document.path);
                    const content = await this.app.vault.read(document);

                    // Extract links
                    const extractor = new LinkExtractor(this.getFinalExtensions());
                    const links = extractor.extractFromText(content);
                    totalLinks += links.length;
                    modal.addLog(`Found ${links.length} links in ${document.path}`, 'success', 'extract');

                    // Download files
                    if (this.settings.tasks.includes('download')) {
                        const downloader = new FileDownloader(
                            this.settings.storePath,
                            {
                                path: document.path,
                                title: document.basename,
                                datetime: new Date().toISOString()
                            }
                        );

                        let fileSuccessCount = 0;
                        let fileFailedCount = 0;

                        const replacements = new Map<string, string>();
                        for (const link of links) {
                            modal.addDivider();
                            modal.addLog(`File: ${link.originalLink}`, 'info', 'download');
                            
                            const result = await downloader.downloadFile(
                                link.originalLink,
                                link.fileName
                            );

                            if (result.success) {
                                replacements.set(link.originalLink, result.localPath);
                                modal.addLog(`Status: ✓ Success`, 'success', 'download');
                                modal.addSavedPath(result.localPath);
                                downloadedFiles++;
                                fileSuccessCount++;
                            } else {
                                modal.addLog(`Status: ✗ Failed`, 'error', 'download');
                                modal.addLog(`Error: ${result.error}`, 'error', 'download');
                                failedFiles++;
                                fileFailedCount++;
                            }

                            modal.updateDocumentProgress(document.path, links.length, fileSuccessCount, fileFailedCount);

                            // Update stats after each download
                            modal.updateStats({
                                totalLinks,
                                downloadedFiles,
                                failedFiles
                            });
                        }

                        // Replace links
                        if (this.settings.tasks.includes('replace') && replacements.size > 0) {
                            modal.addDivider();
                            const replacer = new LinkReplacer();
                            const newContent = replacer.replaceInText(content, replacements);
                            await this.app.vault.modify(document, newContent);
                            modal.addLog(`Updated links in ${document.path}`, 'success', 'replace');
                        }
                    }

                    processedDocuments++;
                    modal.updateProgress((processedDocuments / totalDocuments) * 100);
                    modal.updateStats({ processedFiles: processedDocuments });
                }

                modal.addLog('Processing complete!', 'success');
            } catch (error) {
                modal.addLog(`Error: ${error.message}`, 'error');
            }
        });
        modal.open();
    }

    private async handleSingleDownload(documentPath: string) {
        if (!await this.validateAndProcess(() => Promise.resolve())) {
            return;
        }

        const modal = new ProcessModal(this.app, this, async () => {
            modal.startDocumentLog(documentPath);
            const downloader = new FileDownloader(
                this.settings.storePath,
                {
                    path: documentPath,
                    title: documentPath.split('/').pop() || 'untitled',
                    datetime: new Date().toISOString()
                }
            );

            try {
                // Extract links to verify if it's a valid target
                const extractor = new LinkExtractor(this.getFinalExtensions());
                const links = extractor.extractFromText(documentPath);
                const totalLinks = links.length;

                if (totalLinks === 0) {
                    modal.addLog(`Status: ✗ Failed`, 'error');
                    modal.addLog(`Error: No valid links found with target extensions`, 'error');
                    modal.updateDocumentProgress(documentPath, 0, 0, 0);
                    modal.updateStats({
                        totalFiles: 1,
                        processedFiles: 1,
                        totalLinks: 0,
                        downloadedFiles: 0,
                        failedFiles: 0
                    });
                    return;
                }

                const result = await downloader.downloadFile(documentPath, documentPath.split('/').pop() || 'untitled');
                
                if (result.success) {
                    modal.addLog(`Status: ✓ Success`, 'success');
                    modal.addSavedPath(result.localPath);
                    modal.updateDocumentProgress(documentPath, totalLinks, 1, 0);
                    modal.updateStats({
                        totalFiles: 1,
                        processedFiles: 1,
                        totalLinks,
                        downloadedFiles: 1,
                        failedFiles: 0
                    });
                } else {
                    modal.addLog(`Status: ✗ Failed`, 'error');
                    modal.addLog(`Error: ${result.error}`, 'error');
                    modal.updateDocumentProgress(documentPath, totalLinks, 0, 1);
                    modal.updateStats({
                        totalFiles: 1,
                        processedFiles: 1,
                        totalLinks,
                        downloadedFiles: 0,
                        failedFiles: 1
                    });
                }
            } catch (error) {
                modal.addLog(`Error downloading attachment: ${error.message}`, 'error');
                modal.updateStats({
                    totalFiles: 1,
                    processedFiles: 1,
                    totalLinks: 0,
                    downloadedFiles: 0,
                    failedFiles: 1
                });
            }
        });

        modal.open();
    }

    private getFinalExtensions(): string[] {
        const presetExts = this.settings.presetExtensions
            .flatMap(preset => EXTENSION_PRESETS[preset]);
        return [...new Set([...presetExts, ...this.settings.customExtensions])];
    }
}
