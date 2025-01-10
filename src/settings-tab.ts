import { App, PluginSettingTab } from 'obsidian';
import LocalAttachmentsPlugin from './main';
import { SettingsBuilder } from "./settings-builder";
import { UIHelper } from "./utils/ui-helper";

export class LocalAttachmentsSettingTab extends PluginSettingTab {
    plugin: LocalAttachmentsPlugin;

    constructor(app: App, plugin: LocalAttachmentsPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;
        containerEl.empty();

        // Create settings builder
        const builder = new SettingsBuilder(containerEl, this.plugin);

        // Add shared styles
        UIHelper.addCategoryStyles();

        // Processing
        UIHelper.createCategoryHeader(containerEl, 'Processing');
        builder.addScopeDropdown();
        builder.addTasksDropdown();

        // File Extensions
        UIHelper.createCategoryHeader(containerEl, 'File Extensions');
        builder.addPresetExtensions();
        builder.addCustomExtensions();
        builder.addFinalExtensionsDisplay();

        // Storage
        UIHelper.createCategoryHeader(containerEl, 'Storage');
        builder.addStorePath();
    }
}
