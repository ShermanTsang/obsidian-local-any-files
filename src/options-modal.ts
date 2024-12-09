import {App, Modal, Notice} from 'obsidian';
import LocalAttachmentsPlugin from "./main";
import {SettingsBuilder} from "./settings-builder";
import {SettingsValidator} from "./utils/settings-validator";

export class OptionsModal extends Modal {
	private settingsBuilder: SettingsBuilder;

	constructor(
		app: App,
		private plugin: LocalAttachmentsPlugin,
		private onSubmit: () => void
	) {
		super(app);
		this.settingsBuilder = new SettingsBuilder(this.contentEl, this.plugin);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.empty();

		// Title
		contentEl.createEl('h2', {text: 'Local Anything > Options'});

		// Add scope selection
		this.settingsBuilder.addScopeDropdown();

		// Add tasks selection
		this.settingsBuilder.addTasksDropdown();

		// Add store path
		this.settingsBuilder.addStorePath();

		// Add extensions
		this.settingsBuilder.addPresetExtensions();
		this.settingsBuilder.addCustomExtensions();
		this.settingsBuilder.addFinalExtensionsDisplay();

		// Add submit button
		const submitButton = contentEl.createEl('button', {
			text: 'Start Processing',
			cls: 'mod-cta'
		});
		submitButton.addEventListener('click', () => {
			this.handleSubmit();
		});

		// Add styles
		const style = document.createElement('style');
		style.textContent = `
            .modal {
                max-width: 600px;
            }
            button.mod-cta {
                width: 100%;
                padding: 10px;
            }
        `;
		document.head.appendChild(style);
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
