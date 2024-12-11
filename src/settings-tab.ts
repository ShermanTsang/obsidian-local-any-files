import {App, PluginSettingTab} from 'obsidian';
import LocalAttachmentsPlugin from './main';
import {SettingsBuilder} from "./settings-builder";
import {UIHelper} from "./utils/ui-helper";

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

        // Add shared styles
        UIHelper.addCategoryStyles();

        // Processing Options
        UIHelper.createCategoryHeader(containerEl, 'Processing Options');
        builder.addScopeDropdown();
        builder.addTasksDropdown();

        // File Extension Options
        UIHelper.createCategoryHeader(containerEl, 'File Extensions');
        builder.addPresetExtensions();
        builder.addCustomExtensions();
        builder.addFinalExtensionsDisplay();

        // Storage Options
        UIHelper.createCategoryHeader(containerEl, 'Storage Options');
        builder.addStorePath();
    }
}
