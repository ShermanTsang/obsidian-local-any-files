import { App, Modal } from 'obsidian';
import LocalAttachmentsPlugin from './main';
import { UIHelper } from './utils/ui-helper';

export class ProcessModal extends Modal {
    private progressBar: HTMLDivElement;
    private progressFill: HTMLDivElement;
    private logsContainer: HTMLDivElement;
    private statsContainer: HTMLDivElement;
    private currentLogContainer: HTMLDivElement | null = null;
    private documentStats: Map<string, { links: number, success: number, failed: number }> = new Map();
    private progress = 0;
    private logs: string[] = [];
    private processCallback: () => Promise<void>;
    private plugin: LocalAttachmentsPlugin;
    private currentTask: Task | null = null;
    private taskDisplayNames: Record<Task, string> = {
        extract: 'Extract Links',
        download: 'Download Files',
        replace: 'Replace Links'
    };
    private stats = {
        totalFiles: 0,
        processedFiles: 0,
        totalLinks: 0,
        downloadedFiles: 0,
        failedFiles: 0
    };

    constructor(app: App, plugin: LocalAttachmentsPlugin, processCallback: () => Promise<void>) {
        super(app);
        this.plugin = plugin;
        this.processCallback = processCallback;
        this.titleEl.setText('Local Anything > Processing')
    }

    onOpen() {

        const {contentEl} = this;
        contentEl.empty();
        
        // Override default modal styles
        UIHelper.overrideDefaultModalStyles();

        // Stats section
        this.statsContainer = contentEl.createDiv({cls: 'stats-container'});
        this.updateStats();

        // Progress section
        const progressSection = contentEl.createDiv({cls: 'progress-section'});
        this.progressBar = progressSection.createDiv({cls: 'progress-bar'});
        this.progressFill = this.progressBar.createDiv({cls: 'progress-fill'});

        // Logs section
        this.logsContainer = contentEl.createDiv({cls: 'logs-container'});

        // Initialize progress
        this.updateProgress(0);

        // Add styles
        this.addStyles();

        // Start processing
        this.processCallback();
    }

    private addStyles() {
        const style = document.createElement('style');
        style.textContent = `

            .stats-container {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 10px;
                margin-bottom: 20px;
                padding: 10px;
                background: var(--background-secondary);
                border-radius: 5px;
            }

            .stat-item {
                text-align: center;
            }

            .stat-value {
                font-size: 1.2em;
                font-weight: bold;
            }

            .stat-value-processed {
                color: var(--text-accent);
            }

            .stat-value-total {
                color: var(--text-normal);
            }

            .stat-value-found {
                color: var(--text-success);
            }

            .stat-value-downloads {
                color: var(--interactive-accent);
            }

            .stat-value-failed {
                color: var(--text-error);
            }

            .stat-label {
                font-size: 0.8em;
                color: var(--text-muted);
            }

            .progress-section {
                margin-bottom: 20px;
            }

            .progress-bar {
                height: 8px;
                background: var(--background-modifier-border);
                border-radius: 4px;
                overflow: hidden;
            }

            .progress-fill {
                height: 100%;
                background: var(--interactive-accent);
                transition: width 0.3s ease;
            }

            .logs-section {
                background: var(--background-secondary);
                border-radius: 5px;
                padding: 10px;
            }

            .logs-title {
                margin: 0 0 10px 0;
                font-size: 1em;
                color: var(--text-normal);
            }

            .logs-container {
                max-height: 300px;
                overflow-y: auto;
                font-family: monospace;
                font-size: 0.98rem;
                background: var(--background-primary);
            }

            .logs-container > div {
                margin-bottom: 5px;
            }

            .logs-container > div:hover {
                background: var(--background-secondary);
            }

            .log-success {
                color: var(--text-success);
            }

            .log-error {
                color: var(--text-error);
            }

            .log-info {
                color: var(--text-muted);
                word-break: break-all;
            }

            .log-divider {
                border-bottom: 1px solid var(--background-modifier-border);
                margin: 10px 0;
                opacity: 0.5;
            }

            .log-divider.thick {
                border-bottom: 2px solid var(--background-modifier-border);
                opacity: 0.85;
            }

            .log-saved-path {
                color: var(--text-accent);
                padding-left: 10px;
                font-family: monospace;
            }

            .log-task-header {
                color: var(--text-accent);
                font-weight: bold;
                margin: 10px 0 5px;
                padding: 5px;
                background-color: var(--background-secondary);
                border-radius: 3px;
            }

            .log-url {
                color: var(--text-accent);
                text-decoration: underline;
                word-break: break-all;
            }
            .log-entry {
                display: flex;
                gap: 8px;
                padding: 4px 0;
                border-bottom: 1px solid var(--background-modifier-border);
            }
            .log-timestamp {
                color: var(--text-muted);
                font-size: 0.9em;
                white-space: nowrap;
            }
            .log-message {
                flex: 1;
                word-break: break-word;
            }
            .log-error {
                color: var(--text-error);
            }
            .log-success {
                color: var(--text-success);
            }
            .log-warning {
                color: var(--text-warning);
            }

            .log-document-container {
                margin-bottom: 10px;
                border: 1px solid var(--background-modifier-border);
                border-radius: 5px;
                overflow: hidden;
            }

            .log-document-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                background: var(--background-secondary);
                cursor: pointer;
                user-select: none;
                position: relative;
            }

            .log-document-header:hover {
                background: var(--background-modifier-hover);
            }

            .log-document-title {        
                color: var(--text-normal);
                flex: 1;
            }

            .log-document-stats {
                color: var(--text-muted);
                font-size: 0.9em;
                margin-right: 24px;
            }

            .log-document-header:after {
                content: "▽";
                position: absolute;
                right: 12px;
                transition: transform 0.15s ease;
                color: rgba(0,0,0,.8);
            }

            .log-document-header.collapsed:after {
                transform: rotate(-90deg);
            }

            .log-document-content {
                font-size: 0.8em;
                padding: 10px;
                background: var(--background-primary);
            }

            .log-document-content.collapsed {
                display: none;
            }
        `;
        document.head.appendChild(style);
    }

    private isTaskEnabled(task: Task): boolean {
        return this.plugin.settings.tasks.includes(task);
    }

    updateProgress(value: number) {
        this.progress = value;
        if (this.progressFill) {
            this.progressFill.style.width = `${value}%`;
        }
    }

    updateStats(stats?: Partial<typeof this.stats>) {
        if (stats) {
            this.stats = { ...this.stats, ...stats };
        }

        if (this.statsContainer) {
            this.statsContainer.empty();
            
            const createStatItem = (value: number, label: string, type: string) => {
                const item = this.statsContainer.createDiv({cls: 'stat-item'});
                item.createDiv({cls: `stat-value stat-value-${type}`, text: value.toString()});
                item.createDiv({cls: 'stat-label', text: label});
            };

            createStatItem(this.stats.processedFiles, 'Files Processed', 'processed');
            createStatItem(this.stats.totalFiles, 'Total Files', 'total');
            createStatItem(this.stats.totalLinks, 'Links Found', 'found');
            createStatItem(this.stats.downloadedFiles, 'Downloads', 'downloads');
            createStatItem(this.stats.failedFiles, 'Failed', 'failed');
        }
    }

    startDocumentLog(docTitle: string) {
        // Create a new document container
        const container = this.logsContainer.createDiv({ cls: 'log-document-container' });
        
        // Create header with title and stats
        const header = container.createDiv({ cls: 'log-document-header' });
        header.createDiv({ cls: 'log-document-title', text: docTitle });
        header.createDiv({ cls: 'log-document-stats' });
        
        // Initialize stats for this document
        this.documentStats.set(docTitle, { links: 0, success: 0, failed: 0 });
        this.updateDocumentStats(docTitle);

        // Create content container
        const content = container.createDiv({ cls: 'log-document-content' });
        
        // Add click handler for collapsing
        header.addEventListener('click', () => {
            header.toggleClass('collapsed', !header.hasClass('collapsed'));
            content.toggleClass('collapsed', header.hasClass('collapsed'));
        });

        this.currentLogContainer = content;
        return content;
    }

    updateDocumentStats(docTitle: string, statsElement?: HTMLElement) {
        const stats = this.documentStats.get(docTitle);
        if (!stats) return;

        const statsText = `Links: ${stats.links} / Success: ${stats.success} / Failed: ${stats.failed}`;
        if (statsElement) {
            statsElement.setText(statsText);
        }
    }

    addLog(message: string, type: 'success' | 'error' | 'info' = 'info', task?: Task) {
        if (task && !this.isTaskEnabled(task)) {
            return;
        }

        this.logs.push(message);

        if (this.currentLogContainer) {
            this.currentLogContainer.createDiv({
                cls: `log log-${type}`,
                text: message
            });
        } else {
            this.logsContainer.createDiv({
                cls: `log log-${type}`,
                text: message
            });
        }

        this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
    }

    updateDocumentProgress(docTitle: string, links: number, success: number, failed: number) {
        const stats = this.documentStats.get(docTitle);
        if (stats) {
            stats.links = links;
            stats.success = success;
            stats.failed = failed;
            this.updateDocumentStats(docTitle);
        }
    }

    addDivider(thick = false) {
        const container = this.currentLogContainer || this.logsContainer;
        container.createDiv({
            cls: `log-divider${thick ? ' thick' : ''}`
        });
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}
