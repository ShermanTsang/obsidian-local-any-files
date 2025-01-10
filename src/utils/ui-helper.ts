export class UIHelper {

    static createCategoryHeader(containerEl: HTMLElement, text: string) {
        return containerEl.createEl('h3', {text, cls: 'setting-category'});
    }
}
