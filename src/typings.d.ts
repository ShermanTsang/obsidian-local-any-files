type ScopeType = 'singleItem' | 'currentFile' | 'currentFolder' | 'allFiles';
type PresetExtensionType = keyof typeof import('./config').EXTENSION_PRESETS;
type Task = 'extract' | 'download' | 'replace';

interface LocalAttachmentsSettings {
	tasks: (Task)[];
	scope: ScopeType;
	presetExtensions: PresetExtensionType[];
	customExtensions: string[];
	storePath: string;
	storeFileName: string;
}
