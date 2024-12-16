export class UIHelper {
    static overrideDefaultModalStyles() {  
        const style = document.createElement('style');     
        style.textContent = `
            .modal-header {
                padding: 16px 20px;
                border-bottom: 1px solid var(--background-modifier-border);
            }

            .modal-content {
                padding: 10px;
                overflow-y: auto;
                max-height: 1000px;
            }
    `;
    document.head.appendChild(style);
    }


    static addCategoryStyles() {
        const existingStyle = document.getElementById('local-attachments-styles');
        if (existingStyle) return;

        const style = document.createElement('style');
        style.id = 'local-attachments-styles';
        style.textContent = `
            .setting-category {
                padding-bottom: 2px;
                padding-top: 12px;
                border-top: 1px solid var(--background-modifier-border);
                color: var(--text-normal);
                font-size: 1.1em;
                font-weight: 600;
            }

            button.mod-cta {
                width: 100%;
                padding: 10px;
            }
        `;
        document.head.appendChild(style);
    }

    static createCategoryHeader(containerEl: HTMLElement, text: string) {
        return containerEl.createEl('h3', {text, cls: 'setting-category'});
    }
}
