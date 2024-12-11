
export class UIHelper {
    static addCategoryStyles() {
        const existingStyle = document.getElementById('local-attachments-styles');
        if (existingStyle) return;

        const style = document.createElement('style');
        style.id = 'local-attachments-styles';
        style.textContent = `
            .setting-category {
                margin-top: 18px;
                margin-bottom: 18px;
                padding-bottom: 6px;
                color: var(--text-normal);
                font-size: 1.2em;
                font-weight: 700;
            }
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

    static createCategoryHeader(containerEl: HTMLElement, text: string) {
        return containerEl.createEl('h3', {text, cls: 'setting-category'});
    }
}
