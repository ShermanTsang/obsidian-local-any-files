import { EXTENSION_PRESETS } from "src/config";

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

export class SettingsValidator {
    static validateSettings(settings: LocalAttachmentsSettings): ValidationResult {
        const errors: string[] = [];

        // Validate tasks
        if (!settings.tasks || settings.tasks.length === 0) {
            errors.push('At least one task must be selected.');
        }

        // Validate extensions
        const allExtensions = this.getAllExtensions(settings);
        if (allExtensions.length === 0) {
            errors.push('At least one file extension must be selected or added.');
        }

        // Validate extension format
        const invalidExtensions = allExtensions.filter(ext => !this.isValidExtension(ext));
        if (invalidExtensions.length > 0) {
            errors.push(`Invalid extension format: ${invalidExtensions.join(', ')}. Extensions must start with a dot and contain only valid characters.`);
        }

        // Validate scope
        if (!['currentFile', 'allFiles', 'currentFolder'].includes(settings.scope)) {
            errors.push('Invalid scope selected.');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    private static getAllExtensions(settings: LocalAttachmentsSettings): string[] {
        // Get actual extensions from presets
        const presetExtensions = (settings.presetExtensions || [])
            .flatMap(presetKey => EXTENSION_PRESETS[presetKey] || []);
            
        const customExtensions = settings.customExtensions || [];
        
        // Combine and remove duplicates
        return [...new Set([...presetExtensions, ...customExtensions])];
    }

    private static isValidExtension(extension: string): boolean {
        return /^\.[a-zA-Z0-9]+$/.test(extension);
    }
}
