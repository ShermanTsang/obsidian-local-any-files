import { App, Modal, Notice } from 'obsidian';
import LocalAttachmentsPlugin from "./main";
import { SettingsBuilder } from "./settings-builder";
import { SettingsValidator } from "./utils/settings-validator";
import { UIHelper } from "./utils/ui-helper";

export class OptionsModal extends Modal {
    private settingsBuilder: SettingsBuilder;

    constructor(
        app: App,
        private plugin: LocalAttachmentsPlugin,
        private onSubmit: () => void,
        private defaultScope?: 'currentFile' | 'currentFolder' | 'allFiles'
    ) {
        super(app);
        this.settingsBuilder = new SettingsBuilder(this.contentEl, this.plugin, this.defaultScope);
        this.titleEl.setText('Local Anything > Options');
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.empty();

        // Override default modal styles
        UIHelper.overrideDefaultModalStyles();

        // Add shared styles
        UIHelper.addCategoryStyles();

        // Processing Options
        UIHelper.createCategoryHeader(contentEl, 'Processing');
        this.settingsBuilder.addScopeDropdown();
        this.settingsBuilder.addTasksDropdown();

        // File Extension Options
        UIHelper.createCategoryHeader(contentEl, 'File Extensions');
        this.settingsBuilder.addPresetExtensions();
        this.settingsBuilder.addCustomExtensions();
        this.settingsBuilder.addFinalExtensionsDisplay();

        // Storage Options
        UIHelper.createCategoryHeader(contentEl, 'Storage');
        this.settingsBuilder.addStorePath();

        // Add submit button
        const submitButton = contentEl.createEl('button', {
            text: 'Start Processing',
            cls: 'mod-cta'
        });
        submitButton.addEventListener('click', () => {
            this.handleSubmit();
        });
    }

    private async handleSubmit() {
        const validationResult = SettingsValidator.validateSettings(this.plugin.settings);
        if (!validationResult.isValid) {
            new Notice('Please fix the following issues:\n' + validationResult.errors.join('\n'), 5000);
            return;
        }
        this.close();
        this.onSubmit();
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}
