import {App, PluginSettingTab} from 'obsidian';
import LocalAttachmentsPlugin from './main';
import {SettingsBuilder} from "./settings-builder";

export class LocalAttachmentsSettingTab extends PluginSettingTab {
    plugin: LocalAttachmentsPlugin;

    constructor(app: App, plugin: LocalAttachmentsPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;
        containerEl.empty();

        containerEl.createEl('h2', {text: 'Local Attachments Settings'});

        // Create settings builder
        const builder = new SettingsBuilder(containerEl, this.plugin);

        // Processing Options
        containerEl.createEl('h3', {text: 'Processing Options', cls: 'setting-category'});
        builder.addScopeDropdown();
        builder.addTasksDropdown();

        // File Extension Options
        containerEl.createEl('h3', {text: 'File Extensions', cls: 'setting-category'});
        builder.addPresetExtensions();
        builder.addCustomExtensions();
        builder.addFinalExtensionsDisplay();

        // Storage Options
        containerEl.createEl('h3', {text: 'Storage Options', cls: 'setting-category'});
        builder.addStorePath();

        // Add category styling
        const style = document.createElement('style');
        style.textContent = `
            .setting-category {
                margin-top: 24px;
                margin-bottom: 12px;
                padding-bottom: 6px;
                border-bottom: 1px solid var(--background-modifier-border);
                color: var(--text-normal);
                font-size: 1.2em;
                font-weight: 600;
            }
        `;
        document.head.appendChild(style);
    }
}
