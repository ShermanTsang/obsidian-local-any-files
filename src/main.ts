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
                let files: TFile[] = [];
                const activeFile = this.app.workspace.getActiveFile();
                
                switch (this.settings.scope) {
                    case 'currentFile':
                        files = activeFile ? [activeFile] : [];
                        break;
                    case 'allFiles':
                        files = this.app.vault.getMarkdownFiles();
                        break;
                    case 'currentFolder':
                        if (activeFile) {
                            const currentFolder = activeFile.parent?.path || '';
                            files = this.app.vault.getMarkdownFiles()
                                .filter(file => file.parent?.path === currentFolder);
                        }
                        break;
                }

                let processedFiles = 0;
                const totalFiles = files.length;

                if (totalFiles === 0) {
                    modal.addLog('No files found in the selected scope.', 'error');
                    return;
                }

                // Initialize stats
                modal.updateStats({
                    totalFiles,
                    processedFiles: 0,
                    totalLinks: 0,
                    downloadedFiles: 0,
                    failedFiles: 0
                });

                let totalLinks = 0;
                let downloadedFiles = 0;
                let failedFiles = 0;

                for (const file of files) {
                    modal.addLog(`Processing ${file.path}...`, 'info');
                    const content = await this.app.vault.read(file);

                    // Extract links
                    const extractor = new LinkExtractor(this.getFinalExtensions());
                    const links = extractor.extractFromText(content);
                    totalLinks += links.length;
                    modal.addLog(`Found ${links.length} links in ${file.path}`, 'success', 'extract');

                    // Download files
                    if (this.settings.tasks.includes('download')) {
                        const downloader = new FileDownloader(
                            this.settings.storePath,
                            {
                                path: file.path,
                                title: file.basename,
                                datetime: new Date().toISOString()
                            }
                        );

                        const replacements = new Map<string, string>();
                        for (const link of links) {
                            const result = await downloader.downloadFile(
                                link.originalLink,
                                link.fileName
                            );

                            if (result.success) {
                                replacements.set(link.originalLink, result.localPath);
                                modal.addLog(`Downloaded ${link.fileName}`, 'success', 'download');
                                downloadedFiles++;
                            } else {
                                modal.addLog(`Failed to download ${link.fileName}: ${result.error}`, 'error', 'download');
                                failedFiles++;
                            }

                            // Update stats after each download
                            modal.updateStats({
                                totalLinks,
                                downloadedFiles,
                                failedFiles
                            });
                        }

                        // Replace links
                        if (this.settings.tasks.includes('replace')) {
                            const replacer = new LinkReplacer();
                            const newContent = replacer.replaceInText(content, replacements);
                            await this.app.vault.modify(file, newContent);
                            modal.addLog(`Updated links in ${file.path}`, 'success', 'replace');
                        }
                    }

                    processedFiles++;
                    modal.updateProgress((processedFiles / totalFiles) * 100);
                    modal.updateStats({ processedFiles });
                }

                modal.addLog('Processing complete!', 'success');
            } catch (error) {
                modal.addLog(`Error: ${error.message}`, 'error');
            }
        });
        modal.open();
    }

    private getFinalExtensions(): string[] {
        const presetExts = this.settings.presetExtensions
            .flatMap(preset => EXTENSION_PRESETS[preset]);
        return [...new Set([...presetExts, ...this.settings.customExtensions])];
    }

    private async handleSingleDownload(path: string) {
        const modal = new ProcessModal(this.app, this, async () => {
            const downloader = new FileDownloader(
                this.settings.storePath,
                {
                    path: path,
                    title: path.split('/').pop()?.split('.')[0] || 'untitled',
                    datetime: new Date().toISOString().replace(/:/g, '-').slice(0, 19)
                }
            );

            // Initialize stats for single file
            modal.updateStats({
                totalFiles: 1,
                processedFiles: 0,
                totalLinks: 1,
                downloadedFiles: 0,
                failedFiles: 0
            });

            try {
                modal.addLog(`Downloading ${path}...`, 'info');
                const result = await downloader.downloadFile(path, path.split('/').pop() || 'untitled');
                
                if (result.success) {
                    modal.addLog(`Successfully downloaded attachment to ${result.localPath}`, 'success');
                    modal.updateStats({
                        totalFiles: 1,
                        processedFiles: 1,
                        totalLinks: 1,
                        downloadedFiles: 1,
                        failedFiles: 0
                    });
                } else {
                    modal.addLog(`Failed to download attachment: ${result.error}`, 'error');
                    modal.updateStats({
                        totalFiles: 1,
                        processedFiles: 1,
                        totalLinks: 1,
                        downloadedFiles: 0,
                        failedFiles: 1
                    });
                }
            } catch (error) {
                modal.addLog(`Error downloading attachment: ${error.message}`, 'error');
                modal.updateStats({
                    totalFiles: 1,
                    processedFiles: 1,
                    totalLinks: 1,
                    downloadedFiles: 0,
                    failedFiles: 1
                });
            }
        });

        modal.open();
    }
}
