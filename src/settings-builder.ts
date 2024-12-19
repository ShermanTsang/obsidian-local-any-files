import { Notice, Setting } from 'obsidian';
import { EXTENSION_PRESETS } from "./config";
import LocalAttachmentsPlugin from "./main";

export class SettingsBuilder {
	constructor(
		private containerEl: HTMLElement,
		private plugin: LocalAttachmentsPlugin,
		private defaultScope?: 'currentFile' | 'currentFolder' | 'allFiles' | 'singleItem'
	) {
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		containerEl.createEl('h2', {text: 'Local Attachments Settings'});

		// Processing Options
		containerEl.createEl('h3', {text: 'Processing Options', cls: 'setting-category'});
		this.addScopeDropdown();
		this.addTasksDropdown();

		// File Extension Options
		containerEl.createEl('h3', {text: 'File Extensions', cls: 'setting-category'});
		this.addPresetExtensions();
		this.addCustomExtensions();

		// Storage Options
		containerEl.createEl('h3', {text: 'Storage Options', cls: 'setting-category'});
		this.addStorePath();

		// Add category styling
		const style = document.createElement('style');
		style.textContent = `

            .setting-item {
                border: none !important;
            }

            .setting-item .setting-item-info {
                flex-direction: column;
                align-items: flex-start;
                gap: 4px;
            }

            .setting-item .setting-item-name {
                margin-bottom: 0;
                font-weight: 600;
            }

            .setting-item .setting-item-description {
                margin-top: 0;
                color: var(--text-muted);
            }
        `;
		document.head.appendChild(style);
	}

	addScopeDropdown(): void {
		const options = {
			currentFile: 'Current File Only',
			currentFolder: 'Current Folder',
			allFiles: 'All Files in Vault'
		};

		// For single item modal, only show the single item option
		if (this.defaultScope === 'singleItem') {
			new Setting(this.containerEl)
				.setName('Scope')
				.setDesc('Download single item')
				.addDropdown(dropdown => {
					dropdown
						.addOption('singleItem', 'Single Item')
						.setValue('singleItem')
						.onChange(async (value) => {
							this.plugin.settings.scope = value as 'currentFile' | 'allFiles' | 'currentFolder' | 'singleItem';
							await this.plugin.saveSettings();
						});
				});
			return;
		}

		// For regular options modal
		new Setting(this.containerEl)
			.setName('Scope')
			.setDesc('Select which files to process')
			.addDropdown(dropdown => {
				Object.entries(options).forEach(([value, name]) => {
					dropdown.addOption(value, name);
				});
				console.log('default scope', this.defaultScope);
				console.log('settings scope', this.plugin.settings.scope);
				dropdown
					.setValue((()=> {
						if(this.plugin.settings.scope === 'singleItem') {
							return 'currentFile';
						}
						return this.defaultScope || this.plugin.settings.scope
					})())
					.onChange(async (value) => {
						this.plugin.settings.scope = value as 'currentFile' | 'allFiles' | 'currentFolder';
						await this.plugin.saveSettings();
					});
			});
	}

	addTasksDropdown(): void {
		const tasksSetting = new Setting(this.containerEl)
			.setName('Tasks')
			.setDesc('Select which tasks to perform')
			.setClass('tasks-setting');

		const tasksContainer = tasksSetting.settingEl.createDiv('tasks-container');

		const tasks = {
			extract: 'Extract Links',
			download: 'Download Files',
			replace: 'Replace Links'
		};

		const taskToggles: Record<string, any> = {};

		// Create settings in order of dependency
		Object.entries(tasks).forEach(([key, name]) => {
			new Setting(tasksContainer)
				.setClass('task-item')
				.setName(name)
				.addToggle(toggle => {
					taskToggles[key] = toggle;
					toggle
						.setValue(this.plugin.settings.tasks.includes(key as Task))
						.onChange(async (value) => {
							if (value) {
								// When enabling a task, enable all prerequisite tasks
								if (key === 'download') {
									if (!this.plugin.settings.tasks.includes('extract')) {
										this.plugin.settings.tasks.push('extract');
										taskToggles['extract'].setValue(true);
									}
								} else if (key === 'replace') {
									if (!this.plugin.settings.tasks.includes('extract')) {
										this.plugin.settings.tasks.push('extract');
										taskToggles['extract'].setValue(true);
									}
									if (!this.plugin.settings.tasks.includes('download')) {
										this.plugin.settings.tasks.push('download');
										taskToggles['download'].setValue(true);
									}
								}

								if (!this.plugin.settings.tasks.includes(key as Task)) {
									this.plugin.settings.tasks.push(key as Task);
								}
							} else {
								// When disabling a task, check if it's required by other enabled tasks
								if (key === 'extract' &&
									(this.plugin.settings.tasks.includes('download') ||
										this.plugin.settings.tasks.includes('replace'))) {
									// Cannot disable extract if download or replace is enabled
									toggle.setValue(true);
									new Notice('Cannot disable Extract Links while Download Files or Replace Links is enabled');
									return;
								} else if (key === 'download' &&
									this.plugin.settings.tasks.includes('replace')) {
									// Cannot disable download if replace is enabled
									toggle.setValue(true);
									new Notice('Cannot disable Download Files while Replace Links is enabled');
									return;
								} else {
									this.plugin.settings.tasks = this.plugin.settings.tasks
										.filter(task => task !== key);
								}
							}
							await this.plugin.saveSettings();
						});
				});
		});

		// Add some styling
		const style = document.createElement('style');
		style.textContent = `
            .tasks-setting {
                margin-bottom: 0;
            }

            .tasks-container {
                margin-top: 6px;
                margin-left: 36px;
                border-left: 2px solid var(--background-modifier-border);
                padding-left: 8px;
            }

            .task-item {
                border: none;
                padding: 4px 0;
                margin: 0;
            }

            .task-item .setting-item-info {
                padding: 0;
            }

            .task-item .setting-item-control {
                padding: 0;
            }
        `;
		document.head.appendChild(style);
	}

	addPresetExtensions(): void {
		const presetSetting = new Setting(this.containerEl)
			.setName('Preset Extensions')
			.setDesc('Select preset file types')
			.setClass('presets-setting');

		const presetsContainer = presetSetting.settingEl.createDiv('presets-container');

		const presets = {
			image: 'Image Files',
			officeFile: 'Office Documents',
			archivePackage: 'Archive Files',
			music: 'Music Files',
			video: 'Video Files',
			code: 'Code & Development',
			font: 'Font Files',
			design: '3D & Design Files',
			database: 'Database Files',
			ebook: 'E-book Formats',
			academic: 'Research & Academic'
		};

		Object.entries(presets).forEach(([key, name]) => {
			new Setting(presetsContainer)
				.setClass('preset-item')
				.setName(name)
				.addToggle(toggle => {
					toggle
						.setValue(this.plugin.settings.presetExtensions.includes(key as any))
						.onChange(async (value) => {
							if (value && !this.plugin.settings.presetExtensions.includes(key as any)) {
								this.plugin.settings.presetExtensions.push(key as any);
							} else if (!value) {
								this.plugin.settings.presetExtensions = this.plugin.settings.presetExtensions
									.filter(preset => preset !== key);
							}
							await this.plugin.saveSettings();
							this.addFinalExtensionsDisplay(); // Update final display
						});
				});
		});

		// Add styling - reuse the same pattern as tasks
		const style = document.createElement('style');
		style.textContent = `
            .presets-setting {
                margin-bottom: 0;
            }

            .presets-container {
                margin-top: 6px;
                margin-left: 36px;
                border-left: 2px solid var(--background-modifier-border);
                padding-left: 8px;
            }

            .preset-item {
                border: none;
                padding: 4px 0;
                margin: 0;
            }

            .preset-item .setting-item-info {
                padding: 0;
            }

            .preset-item .setting-item-control {
                padding: 0;
            }
        `;
		document.head.appendChild(style);
	}

	addStorePath(): void {
		new Setting(this.containerEl)
			.setName('Store Path')
			.setDesc('Set the path pattern for downloaded files. Available variables: ${date}, ${time}, ${path}, ${notename}')
			.addText(text => {
				text.setValue(this.plugin.settings.storePath)
					.onChange(async (value) => {
						this.plugin.settings.storePath = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(this.containerEl)
			.setName('Store File Name')
			.setDesc('Set the file name pattern for downloaded files. Available variables: ${originalName}, ${md5}, ${notename}, ${date}, ${time}')
			.addText(text => {
				text.setValue(this.plugin.settings.storeFileName)
					.onChange(async (value) => {
						this.plugin.settings.storeFileName = value;
						await this.plugin.saveSettings();
					});
			});
	}

	addCustomExtensions(): void {
		const customSetting = new Setting(this.containerEl)
			.setName('Custom Extensions')
			.setDesc('Add custom file extensions (format: .ext). Use | to add multiple extensions at once (e.g., .pdf|.txt|.md)')
			.setClass('custom-extensions-setting');

		const customContainer = customSetting.settingEl.createDiv('custom-extensions-container');
		customContainer.addClass('vertical-layout');

		// Input for new extensions
		const inputContainer = customContainer.createDiv('custom-input-container');
		const input = inputContainer.createEl('input', {
			type: 'text',
			placeholder: '.pdf|.txt|.md'
		});
		const addButton = inputContainer.createEl('button', {
			text: 'Add',
			cls: 'mod-cta'
		});

		// Container for existing custom extensions
		const tagsContainer = customContainer.createDiv('custom-extensions-tags');

		const updateCustomTags = () => {
			tagsContainer.empty();
			this.plugin.settings.customExtensions.forEach(ext => {
				const tag = tagsContainer.createDiv('extension-tag custom-extension-tag');
				tag.setText(ext);

				// Add remove button
				const removeButton = tag.createSpan('extension-tag-remove');
				removeButton.setText('×');
				removeButton.addEventListener('click', async () => {
					this.plugin.settings.customExtensions = this.plugin.settings.customExtensions
						.filter(e => e !== ext);
					await this.plugin.saveSettings();
					updateCustomTags();
					this.addFinalExtensionsDisplay(); // Update final display
				});
			});
		};

		// Initial render of custom tags
		updateCustomTags();

		// Handle adding new extension
		const addExtension = async () => {
			const value = input.value.trim();
			if (!value) return;

			// Split by | and filter out empty strings
			const extensions = value.split('|')
				.map(ext => ext.trim().toLowerCase()) // Convert to lowercase
				.filter(ext => ext);
			let validExtensionsAdded = false;

			for (const ext of extensions) {
				if (this.isValidExtension(ext) && !this.plugin.settings.customExtensions.includes(ext)) {
					this.plugin.settings.customExtensions.push(ext);
					validExtensionsAdded = true;
				}
			}

			if (validExtensionsAdded) {
				await this.plugin.saveSettings();
				input.value = '';
				updateCustomTags();
				this.addFinalExtensionsDisplay(); // Update final display
			}
		};

		addButton.addEventListener('click', addExtension);
		input.addEventListener('keypress', (e) => {
			if (e.key === 'Enter') {
				addExtension();
			}
		});

		// Add styling
		const style = document.createElement('style');
		style.textContent = `
            .vertical-layout {
                display: flex;
                flex-direction: column;
                gap: 12px;
                width: 100%;
            }

            .custom-extensions-setting {
                margin-bottom: 0;
            }

            .custom-extensions-container {
                margin-top: 6px;
                margin-left: 36px;
                padding-left: 8px;
            }

            .custom-input-container {
                display: flex;
                gap: 8px;
                width: 100%;
                align-items: center;
            }

            .custom-input-container input {
                flex-grow: 1;
                background: var(--background-secondary);
                border: 1px solid var(--background-modifier-border);
                padding: 4px 8px;
                border-radius: 4px;
                height: 28px;
            }

            .custom-input-container button {
                height: 28px;
                padding: 4px;
                display: flex;
                align-items: center;
            }

            .custom-extensions-tags {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                min-height: 32px;
                padding: 8px;
                background: var(--background-secondary);
                border-radius: 4px;
                width: 100%;
            }

            .custom-extension-tag {
                padding-right: 4px;
            }

            .extension-tag-remove {
                margin-left: 4px;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background-color: rgba(var(--background-modifier-error-rgb), 0.2);
                color: var(--text-on-accent);
                font-size: 14px;
                line-height: 1;
            }

            .extension-tag-remove:hover {
                background-color: rgba(var(--background-modifier-error-rgb), 0.4);
            }
        `;
		document.head.appendChild(style);
	}

	addFinalExtensionsDisplay(): void {
		// Remove all existing displays
		const existingDisplays = this.containerEl.querySelectorAll('.extensions-preview-setting');
		existingDisplays.forEach(display => display.remove());

		// Find the insertion point - after the custom extensions section
		const customExtensionsSection = this.containerEl.querySelector('.custom-extensions-setting');
		if (!customExtensionsSection) {
			console.warn('Custom extensions section not found');
			return;
		}

		// Create the preview setting
		const previewSetting = new Setting(this.containerEl)
			.setName('Active Extensions')
			.setDesc('File extensions that will be processed')
			.setClass('extensions-preview-setting');

		// Move the preview setting after the custom extensions section
		customExtensionsSection.after(previewSetting.settingEl);

		const previewContainer = previewSetting.settingEl.createDiv('extensions-preview-container');
		previewContainer.addClass('vertical-layout');

		// Combine and sort all extensions
		const allExtensions = [
			...this.plugin.settings.presetExtensions.flatMap(presetKey => EXTENSION_PRESETS[presetKey] || []),
			...this.plugin.settings.customExtensions.map(ext => ext.toLowerCase())
		].sort((a, b) => a.localeCompare(b));

		// Create container for all extensions
		if (allExtensions.length > 0) {
			const extensionsBox = previewContainer.createDiv('extensions-box');
			allExtensions.forEach(ext => {
				const tag = extensionsBox.createDiv('extension-tag');
				tag.setText(ext);
			});
		} else {
			const emptyBox = previewContainer.createDiv('extensions-box');
			emptyBox.createDiv('extension-empty-text').setText('No extensions selected');
		}

		// Add styling
		const existingStyle = document.head.querySelector('style[data-extensions-preview]');
		if (existingStyle) {
			existingStyle.remove();
		}

		const style = document.createElement('style');
		style.setAttribute('data-extensions-preview', '');
		style.textContent = `
            .extensions-preview-setting {
                margin-bottom: 0;
            }

            .extensions-preview-container {
                margin-top: 6px;
                margin-left: 36px;
                padding-left: 8px;
            }

            .extensions-box {
                background-color: var(--background-secondary);
                border-radius: 4px;
                padding: 8px;
                min-height: 32px;
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                align-items: center;
                width: 100%;
            }

            .extension-empty-text {
                color: var(--text-muted);
                font-style: italic;
                padding: 4px;
            }

            .extension-tag {
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 12px;
                line-height: 16px;
                font-weight: 500;
                display: inline-flex;
                align-items: center;
            }
        `;
		document.head.appendChild(style);
	}

	static validateSettings(settings: any): { isValid: boolean; errors: string[] } {
		const errors: string[] = [];

		// Validate storage path
		if (!settings.storePath) {
			errors.push('Storage path is required');
		}

		// Validate that at least one extension source is selected
		if (settings.presetExtensions.length === 0 && settings.customExtensions.length === 0) {
			errors.push('At least one file extension must be selected or added');
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	private getFinalExtensions(): string[] {
		// Get all extensions from selected presets (already lowercase from config)
		const presetExtensions = this.plugin.settings.presetExtensions
			.flatMap(presetKey => EXTENSION_PRESETS[presetKey] || []);

		// Ensure custom extensions are lowercase
		const customExtensions = this.plugin.settings.customExtensions.map(ext => ext.toLowerCase());

		// Combine preset extensions with custom extensions and remove duplicates
		const allExtensions = new Set([...presetExtensions, ...customExtensions]);

		// Convert to array and sort
		return Array.from(allExtensions).sort((a, b) => a.localeCompare(b));
	}

	private isValidExtension(extension: string): boolean {
		// RegExp to validate file extensions:
		// ^\.              - Must start with a dot
		// [a-zA-Z0-9]+    - Must have at least one alphanumeric character
		// [a-zA-Z0-9-]*   - Can be followed by alphanumeric characters or hyphens
		// $               - Must end there
		const extensionRegex = /^\.[a-zA-Z0-9]+[a-zA-Z0-9-]*$/;

		if (!extension) return false;

		// Convert to lowercase before validation
		const lowerExt = extension.toLowerCase();
		const isValid = extensionRegex.test(lowerExt);
		if (!isValid) {
			new Notice('Invalid extension format. Extensions must start with a dot followed by letters/numbers (e.g., .pdf)', 3000);
		}
		return isValid;
	}
}
