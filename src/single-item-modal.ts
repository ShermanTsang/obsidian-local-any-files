import { App, Modal, Notice } from 'obsidian';
import LocalAttachmentsPlugin from "./main";
import { SettingsBuilder } from "./settings-builder";
import { UIHelper } from "./utils/ui-helper";

export class SingleItemModal extends Modal {
    private settingsBuilder: SettingsBuilder;

    constructor(
        app: App,
        private plugin: LocalAttachmentsPlugin,
        private documentPath: string,
        private onSubmit: () => void
    ) {
        super(app);
        this.settingsBuilder = new SettingsBuilder(this.contentEl, this.plugin, 'singleItem');
        this.titleEl.setText('Local Anything > Download Single Item');
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.empty();

        // Override default modal styles
        UIHelper.overrideDefaultModalStyles();

        // Add shared styles
        UIHelper.addCategoryStyles();

        // Processing Options
        UIHelper.createCategoryHeader(contentEl, 'Processing Options');
        this.settingsBuilder.addScopeDropdown();
        this.settingsBuilder.addTasksDropdown();

        // Target Link
        UIHelper.createCategoryHeader(contentEl, 'Target Link');
        const targetLinkContainer = contentEl.createEl('div', {
            cls: 'setting-item'
        });

        targetLinkContainer.createEl('div', {
            cls: 'setting-item-description target-link-text',
            text: this.documentPath
        });

        // Add truncation styles
        const style = document.createElement('style');
        style.textContent = `
            .target-link-text {
                white-space: wrap;
                word-break: break-all;
                padding: 0 12px;
                font-size: .9rem;
                background-color: var(--background-modifier-form-field);
                border-radius: 4px;
            }
        `;
        document.head.appendChild(style);

        // Storage Options
        UIHelper.createCategoryHeader(contentEl, 'Storage Options');
        this.settingsBuilder.addStorePath();

        // Add submit button
        const submitButton = contentEl.createEl('button', {
            text: 'Start Download',
            cls: 'mod-cta'
        });
        submitButton.addEventListener('click', () => {
            this.handleSubmit();
        });
    }

    private handleSubmit() {
        // Validate settings
        if (!this.plugin.settings.tasks || this.plugin.settings.tasks.length === 0) {
            new Notice('Please select at least one task.');
            return;
        }

        if (!this.plugin.settings.storePath) {
            new Notice('Please specify a storage path.');
            return;
        }

        // Close modal and trigger download
        this.close();
        this.onSubmit();
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}
