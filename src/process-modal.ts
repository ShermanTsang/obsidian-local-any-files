import {App, Modal} from 'obsidian';
import LocalAttachmentsPlugin from './main';

export class ProcessModal extends Modal {
    private progressBar: HTMLDivElement;
    private progressFill: HTMLDivElement;
    private logsContainer: HTMLDivElement;
    private statsContainer: HTMLDivElement;
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
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.empty();

        // Container for the entire modal
        const modalContainer = contentEl.createDiv({cls: 'local-attachments-modal'});

        // Header section
        const headerSection = modalContainer.createDiv({cls: 'modal-header'});
        headerSection.createEl('h2', {text: 'Local Anything > Processing', cls: 'modal-title'});

        // Stats section
        this.statsContainer = modalContainer.createDiv({cls: 'stats-container'});
        this.updateStats();

        // Logs section
        this.logsContainer = modalContainer.createDiv({cls: 'logs-container'});

        // Progress section
        const progressSection = modalContainer.createDiv({cls: 'progress-section'});
        this.progressBar = progressSection.createDiv({cls: 'progress-bar'});
        this.progressFill = this.progressBar.createDiv({cls: 'progress-fill'});

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
            .local-attachments-modal {
                padding: 20px;
                max-width: 600px;
                margin: 0 auto;
            }

            .modal-header {
                margin-bottom: 20px;
                text-align: center;
            }

            .modal-title {
                margin: 0;
                color: var(--text-normal);
            }

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
                max-height: 200px;
                overflow-y: auto;
                font-family: monospace;
                font-size: 0.9em;
                padding: 10px;
                background: var(--background-primary);
                border-radius: 3px;
            }

            .logs-container > div {
                margin-bottom: 5px;
                padding: 2px 5px;
                border-radius: 3px;
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
            }

            .log-divider {
                height: 1px;
                background-color: var(--background-modifier-border);
                margin: 10px 0;
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

    addLog(message: string, type: 'success' | 'error' | 'info' = 'info', task?: Task) {
        // If task is specified, only show the log if that task is enabled
        if (task && !this.isTaskEnabled(task)) {
            return;
        }

        // Add to logs array
        this.logs.push(message);

        // Create log element
        this.logsContainer.createDiv({
            cls: `log log-${type}`,
            text: message
        });

        // Scroll to bottom of logs
        this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}
