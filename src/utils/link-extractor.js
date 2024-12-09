import { __awaiter } from "tslib";
// utils/link-extractor.ts
// utils/file-downloader.ts
import { requestUrl } from 'obsidian';
import { createHash } from 'crypto';
export class LinkExtractor {
    constructor(extensions) {
        // Ensure all extensions are lowercase for case-insensitive comparison
        this.extensions = extensions.map(ext => ext.toLowerCase());
    }
    extractFromText(text) {
        const links = [];
        const markdownLinkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
        const directLinkRegex = /(https?:\/\/[^\s<>)"]+)/g;
        // Extract markdown style links
        let match;
        while ((match = markdownLinkRegex.exec(text)) !== null) {
            const [fullMatch, title, url] = match;
            if (this.hasValidExtension(url)) {
                links.push({
                    originalLink: fullMatch,
                    fileExtension: this.getExtension(url),
                    fileName: title || this.getFileName(url),
                    position: {
                        start: match.index,
                        end: match.index + fullMatch.length
                    }
                });
            }
        }
        // Extract direct links
        while ((match = directLinkRegex.exec(text)) !== null) {
            const [url] = match;
            if (this.hasValidExtension(url)) {
                links.push({
                    originalLink: url,
                    fileExtension: this.getExtension(url),
                    fileName: this.getFileName(url),
                    position: {
                        start: match.index,
                        end: match.index + url.length
                    }
                });
            }
        }
        return links;
    }
    hasValidExtension(url) {
        const urlLower = url.toLowerCase();
        return this.extensions.some(ext => urlLower.endsWith(ext));
    }
    getExtension(url) {
        const match = url.match(/\.[^.\s/?#]+$/);
        return match ? match[0].toLowerCase() : '';
    }
    getFileName(url) {
        try {
            // Handle both absolute and relative URLs
            const urlObj = url.startsWith('http') ? new URL(url) : new URL(url, 'http://dummy.base');
            const pathSegments = urlObj.pathname.split('/');
            const fileName = decodeURIComponent(pathSegments[pathSegments.length - 1]);
            return fileName || 'untitled';
        }
        catch (error) {
            // Fallback for malformed URLs: extract the last segment
            const segments = url.split(/[/?#]/);
            return segments.filter(s => s.length > 0).pop() || 'untitled';
        }
    }
}
export class FileDownloader {
    constructor(storePath, variables) {
        this.storePath = storePath;
        this.variables = variables;
    }
    downloadFile(url, fileName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Handle relative URLs and encode special characters
                let processedUrl = url;
                if (!url.match(/^https?:\/\//i)) {
                    // For relative URLs, ensure they start with /
                    processedUrl = url.startsWith('/') ? url : '/' + url;
                    // Convert to absolute URL if it's relative
                    try {
                        const baseUrl = new URL(url).origin;
                        processedUrl = new URL(processedUrl, baseUrl).toString();
                    }
                    catch (e) {
                        return {
                            success: false,
                            localPath: '',
                            error: 'Invalid URL format:' + JSON.stringify(e)
                        };
                    }
                }
                // Encode URL while preserving the original structure
                try {
                    const urlObj = new URL(processedUrl);
                    processedUrl = urlObj.toString();
                }
                catch (e) {
                    return {
                        success: false,
                        localPath: '',
                        error: 'Invalid URL format:' + JSON.stringify(e)
                    };
                }
                const response = yield requestUrl({
                    url: processedUrl,
                    throw: false,
                    headers: {
                        'User-Agent': 'ObsidianLocalAttachments/1.0'
                    }
                });
                // Handle redirects and successful responses
                if (response.status >= 200 && response.status < 400) {
                    const localPath = this.getLocalPath(fileName);
                    yield this.saveFile(response, localPath);
                    return {
                        success: true,
                        localPath
                    };
                }
                else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            }
            catch (error) {
                return {
                    success: false,
                    localPath: '',
                    error: error.message
                };
            }
        });
    }
    getLocalPath(fileName) {
        let path = this.storePath;
        // Replace variables in path
        Object.entries(this.variables).forEach(([key, value]) => {
            path = path.replace(`\${${key}}`, value);
        });
        // Add MD5 hash if required
        if (path.includes('${md5}')) {
            const hash = createHash('md5').update(fileName).digest('hex');
            path = path.replace('${md5}', hash);
        }
        return path + '/' + fileName;
    }
    saveFile(response, path) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const app = window.app;
            if (!((_a = app === null || app === void 0 ? void 0 : app.vault) === null || _a === void 0 ? void 0 : _a.adapter)) {
                throw new Error('Unable to access Obsidian vault');
            }
            // Ensure the directory exists
            const dirPath = path.substring(0, path.lastIndexOf('/'));
            yield app.vault.adapter.mkdir(dirPath);
            // Save the file
            if (response.arrayBuffer) {
                yield app.vault.adapter.writeBinary(path, response.arrayBuffer);
            }
            else if (response.text) {
                yield app.vault.adapter.write(path, response.text);
            }
            else {
                throw new Error('Response contains no data');
            }
        });
    }
}
// utils/link-replacer.ts
export class LinkReplacer {
    replaceInText(text, replacements) {
        let newText = text;
        for (const [originalLink, localPath] of replacements.entries()) {
            newText = newText.replace(originalLink, `![](${localPath})`);
        }
        return newText;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluay1leHRyYWN0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJsaW5rLWV4dHJhY3Rvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsMEJBQTBCO0FBQzFCLDJCQUEyQjtBQUMzQixPQUFPLEVBQUMsVUFBVSxFQUFxQixNQUFNLFVBQVUsQ0FBQztBQUN4RCxPQUFPLEVBQUMsVUFBVSxFQUFDLE1BQU0sUUFBUSxDQUFDO0FBWWxDLE1BQU0sT0FBTyxhQUFhO0lBR3pCLFlBQVksVUFBb0I7UUFDL0Isc0VBQXNFO1FBQ3RFLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO0lBQzVELENBQUM7SUFFRCxlQUFlLENBQUMsSUFBWTtRQUMzQixNQUFNLEtBQUssR0FBb0IsRUFBRSxDQUFDO1FBQ2xDLE1BQU0saUJBQWlCLEdBQUcsMEJBQTBCLENBQUM7UUFDckQsTUFBTSxlQUFlLEdBQUcsMEJBQTBCLENBQUM7UUFFbkQsK0JBQStCO1FBQy9CLElBQUksS0FBSyxDQUFDO1FBQ1YsT0FBTyxDQUFDLEtBQUssR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFDdkQsTUFBTSxDQUFDLFNBQVMsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFDO1lBQ3RDLElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUNoQyxLQUFLLENBQUMsSUFBSSxDQUFDO29CQUNWLFlBQVksRUFBRSxTQUFTO29CQUN2QixhQUFhLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUM7b0JBQ3JDLFFBQVEsRUFBRSxLQUFLLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUM7b0JBQ3hDLFFBQVEsRUFBRTt3QkFDVCxLQUFLLEVB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QUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxJQUFJLFlBQVksQ0FBQyxPQUFPLEVBQUUsRUFBRTtZQUMvRCxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsT0FBTyxTQUFTLEdBQUcsQ0FBQyxDQUFDO1NBQzdEO1FBQ0QsT0FBTyxPQUFPLENBQUM7SUFDaEIsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdXRpbHMvbGluay1leHRyYWN0b3IudHNcbi8vIHV0aWxzL2ZpbGUtZG93bmxvYWRlci50c1xuaW1wb3J0IHtyZXF1ZXN0VXJsLCBSZXF1ZXN0VXJsUmVzcG9uc2V9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCB7Y3JlYXRlSGFzaH0gZnJvbSAnY3J5cHRvJztcblxuZXhwb3J0IGludGVyZmFjZSBFeHRyYWN0ZWRMaW5rIHtcblx0b3JpZ2luYWxMaW5rOiBzdHJpbmc7XG5cdGZpbGVFeHRlbnNpb246IHN0cmluZztcblx0ZmlsZU5hbWU6IHN0cmluZztcblx0cG9zaXRpb246IHtcblx0XHRzdGFydDogbnVtYmVyO1xuXHRcdGVuZDogbnVtYmVyO1xuXHR9O1xufVxuXG5leHBvcnQgY2xhc3MgTGlua0V4dHJhY3RvciB7XG5cdHByaXZhdGUgZXh0ZW5zaW9uczogc3RyaW5nW107XG5cblx0Y29uc3RydWN0b3IoZXh0ZW5zaW9uczogc3RyaW5nW10pIHtcblx0XHQvLyBFbnN1cmUgYWxsIGV4dGVuc2lvbnMgYXJlIGxvd2VyY2FzZSBmb3IgY2FzZS1pbnNlbnNpdGl2ZSBjb21wYXJpc29uXG5cdFx0dGhpcy5leHRlbnNpb25zID0gZXh0ZW5zaW9ucy5tYXAoZXh0ID0+IGV4dC50b0xvd2VyQ2FzZSgpKTtcblx0fVxuXG5cdGV4dHJhY3RGcm9tVGV4dCh0ZXh0OiBzdHJpbmcpOiBFeHRyYWN0ZWRMaW5rW10ge1xuXHRcdGNvbnN0IGxpbmtzOiBFeHRyYWN0ZWRMaW5rW10gPSBbXTtcblx0XHRjb25zdCBtYXJrZG93bkxpbmtSZWdleCA9IC9cXFsoW15cXF1dKilcXF1cXCgoW14pXSspXFwpL2c7XG5cdFx0Y29uc3QgZGlyZWN0TGlua1JlZ2V4ID0gLyhodHRwcz86XFwvXFwvW15cXHM8PilcIl0rKS9nO1xuXG5cdFx0Ly8gRXh0cmFjdCBtYXJrZG93biBzdHlsZSBsaW5rc1xuXHRcdGxldCBtYXRjaDtcblx0XHR3aGlsZSAoKG1hdGNoID0gbWFya2Rvd25MaW5rUmVnZXguZXhlYyh0ZXh0KSkgIT09IG51bGwpIHtcblx0XHRcdGNvbnN0IFtmdWxsTWF0Y2gsIHRpdGxlLCB1cmxdID0gbWF0Y2g7XG5cdFx0XHRpZiAodGhpcy5oYXNWYWxpZEV4dGVuc2lvbih1cmwpKSB7XG5cdFx0XHRcdGxpbmtzLnB1c2goe1xuXHRcdFx0XHRcdG9yaWdpbmFsTGluazogZnVsbE1hdGNoLFxuXHRcdFx0XHRcdGZpbGVFeHRlbnNpb246IHRoaXMuZ2V0RXh0ZW5zaW9uKHVybCksXG5cdFx0XHRcdFx0ZmlsZU5hbWU6IHRpdGxlIHx8IHRoaXMuZ2V0RmlsZU5hbWUodXJsKSxcblx0XHRcdFx0XHRwb3NpdGlvbjoge1xuXHRcdFx0XHRcdFx0c3RhcnQ6IG1hdGNoLmluZGV4LFxuXHRcdFx0XHRcdFx0ZW5kOiBtYXRjaC5pbmRleCArIGZ1bGxNYXRjaC5sZW5ndGhcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIEV4dHJhY3QgZGlyZWN0IGxpbmtzXG5cdFx0d2hpbGUgKChtYXRjaCA9IGRpcmVjdExpbmtSZWdleC5leGVjKHRleHQpKSAhPT0gbnVsbCkge1xuXHRcdFx0Y29uc3QgW3VybF0gPSBtYXRjaDtcblx0XHRcdGlmICh0aGlzLmhhc1ZhbGlkRXh0ZW5zaW9uKHVybCkpIHtcblx0XHRcdFx0bGlua3MucHVzaCh7XG5cdFx0XHRcdFx0b3JpZ2luYWxMaW5rOiB1cmwsXG5cdFx0XHRcdFx0ZmlsZUV4dGVuc2lvbjogdGhpcy5nZXRFeHRlbnNpb24odXJsKSxcblx0XHRcdFx0XHRmaWxlTmFtZTogdGhpcy5nZXRGaWxlTmFtZSh1cmwpLFxuXHRcdFx0XHRcdHBvc2l0aW9uOiB7XG5cdFx0XHRcdFx0XHRzdGFydDogbWF0Y2guaW5kZXgsXG5cdFx0XHRcdFx0XHRlbmQ6IG1hdGNoLmluZGV4ICsgdXJsLmxlbmd0aFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGxpbmtzO1xuXHR9XG5cblx0cHJpdmF0ZSBoYXNWYWxpZEV4dGVuc2lvbih1cmw6IHN0cmluZyk6IGJvb2xlYW4ge1xuXHRcdGNvbnN0IHVybExvd2VyID0gdXJsLnRvTG93ZXJDYXNlKCk7XG5cdFx0cmV0dXJuIHRoaXMuZXh0ZW5zaW9ucy5zb21lKGV4dCA9PiB1cmxMb3dlci5lbmRzV2l0aChleHQpKTtcblx0fVxuXG5cdHByaXZhdGUgZ2V0RXh0ZW5zaW9uKHVybDogc3RyaW5nKTogc3RyaW5nIHtcblx0XHRjb25zdCBtYXRjaCA9IHVybC5tYXRjaCgvXFwuW14uXFxzLz8jXSskLyk7XG5cdFx0cmV0dXJuIG1hdGNoID8gbWF0Y2hbMF0udG9Mb3dlckNhc2UoKSA6ICcnO1xuXHR9XG5cblx0cHJpdmF0ZSBnZXRGaWxlTmFtZSh1cmw6IHN0cmluZyk6IHN0cmluZyB7XG5cdFx0dHJ5IHtcblx0XHRcdC8vIEhhbmRsZSBib3RoIGFic29sdXRlIGFuZCByZWxhdGl2ZSBVUkxzXG5cdFx0XHRjb25zdCB1cmxPYmogPSB1cmwuc3RhcnRzV2l0aCgnaHR0cCcpID8gbmV3IFVSTCh1cmwpIDogbmV3IFVSTCh1cmwsICdodHRwOi8vZHVtbXkuYmFzZScpO1xuXHRcdFx0Y29uc3QgcGF0aFNlZ21lbnRzID0gdXJsT2JqLnBhdGhuYW1lLnNwbGl0KCcvJyk7XG5cdFx0XHRjb25zdCBmaWxlTmFtZSA9IGRlY29kZVVSSUNvbXBvbmVudChwYXRoU2VnbWVudHNbcGF0aFNlZ21lbnRzLmxlbmd0aCAtIDFdKTtcblx0XHRcdHJldHVybiBmaWxlTmFtZSB8fCAndW50aXRsZWQnO1xuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHQvLyBGYWxsYmFjayBmb3IgbWFsZm9ybWVkIFVSTHM6IGV4dHJhY3QgdGhlIGxhc3Qgc2VnbWVudFxuXHRcdFx0Y29uc3Qgc2VnbWVudHMgPSB1cmwuc3BsaXQoL1svPyNdLyk7XG5cdFx0XHRyZXR1cm4gc2VnbWVudHMuZmlsdGVyKHMgPT4gcy5sZW5ndGggPiAwKS5wb3AoKSB8fCAndW50aXRsZWQnO1xuXHRcdH1cblx0fVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIERvd25sb2FkUmVzdWx0IHtcblx0c3VjY2VzczogYm9vbGVhbjtcblx0bG9jYWxQYXRoOiBzdHJpbmc7XG5cdGVycm9yPzogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgRmlsZURvd25sb2FkZXIge1xuXHRwcml2YXRlIHN0b3JlUGF0aDogc3RyaW5nO1xuXHRwcml2YXRlIHZhcmlhYmxlczogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcblxuXHRjb25zdHJ1Y3RvcihzdG9yZVBhdGg6IHN0cmluZywgdmFyaWFibGVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KSB7XG5cdFx0dGhpcy5zdG9yZVBhdGggPSBzdG9yZVBhdGg7XG5cdFx0dGhpcy52YXJpYWJsZXMgPSB2YXJpYWJsZXM7XG5cdH1cblxuXHRhc3luYyBkb3dubG9hZEZpbGUodXJsOiBzdHJpbmcsIGZpbGVOYW1lOiBzdHJpbmcpOiBQcm9taXNlPERvd25sb2FkUmVzdWx0PiB7XG5cdFx0dHJ5IHtcblx0XHRcdC8vIEhhbmRsZSByZWxhdGl2ZSBVUkxzIGFuZCBlbmNvZGUgc3BlY2lhbCBjaGFyYWN0ZXJzXG5cdFx0XHRsZXQgcHJvY2Vzc2VkVXJsID0gdXJsO1xuXHRcdFx0aWYgKCF1cmwubWF0Y2goL15odHRwcz86XFwvXFwvL2kpKSB7XG5cdFx0XHRcdC8vIEZvciByZWxhdGl2ZSBVUkxzLCBlbnN1cmUgdGhleSBzdGFydCB3aXRoIC9cblx0XHRcdFx0cHJvY2Vzc2VkVXJsID0gdXJsLnN0YXJ0c1dpdGgoJy8nKSA/IHVybCA6ICcvJyArIHVybDtcblx0XHRcdFx0Ly8gQ29udmVydCB0byBhYnNvbHV0ZSBVUkwgaWYgaXQncyByZWxhdGl2ZVxuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGNvbnN0IGJhc2VVcmwgPSBuZXcgVVJMKHVybCkub3JpZ2luO1xuXHRcdFx0XHRcdHByb2Nlc3NlZFVybCA9IG5ldyBVUkwocHJvY2Vzc2VkVXJsLCBiYXNlVXJsKS50b1N0cmluZygpO1xuXHRcdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdHN1Y2Nlc3M6IGZhbHNlLFxuXHRcdFx0XHRcdFx0bG9jYWxQYXRoOiAnJyxcblx0XHRcdFx0XHRcdGVycm9yOiAnSW52YWxpZCBVUkwgZm9ybWF0OicgKyBKU09OLnN0cmluZ2lmeShlKVxuXHRcdFx0XHRcdH07XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gRW5jb2RlIFVSTCB3aGlsZSBwcmVzZXJ2aW5nIHRoZSBvcmlnaW5hbCBzdHJ1Y3R1cmVcblx0XHRcdHRyeSB7XG5cdFx0XHRcdGNvbnN0IHVybE9iaiA9IG5ldyBVUkwocHJvY2Vzc2VkVXJsKTtcblx0XHRcdFx0cHJvY2Vzc2VkVXJsID0gdXJsT2JqLnRvU3RyaW5nKCk7XG5cdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0c3VjY2VzczogZmFsc2UsXG5cdFx0XHRcdFx0bG9jYWxQYXRoOiAnJyxcblx0XHRcdFx0XHRlcnJvcjogJ0ludmFsaWQgVVJMIGZvcm1hdDonICsgSlNPTi5zdHJpbmdpZnkoZSlcblx0XHRcdFx0fTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgcmVzcG9uc2UgPSBhd2FpdCByZXF1ZXN0VXJsKHtcblx0XHRcdFx0dXJsOiBwcm9jZXNzZWRVcmwsXG5cdFx0XHRcdHRocm93OiBmYWxzZSwgLy8gRG9uJ3QgdGhyb3cgb24gbm9uLTIwMCByZXNwb25zZXNcblx0XHRcdFx0aGVhZGVyczoge1xuXHRcdFx0XHRcdCdVc2VyLUFnZW50JzogJ09ic2lkaWFuTG9jYWxBdHRhY2htZW50cy8xLjAnXG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0XHQvLyBIYW5kbGUgcmVkaXJlY3RzIGFuZCBzdWNjZXNzZnVsIHJlc3BvbnNlc1xuXHRcdFx0aWYgKHJlc3BvbnNlLnN0YXR1cyA+PSAyMDAgJiYgcmVzcG9uc2Uuc3RhdHVzIDwgNDAwKSB7XG5cdFx0XHRcdGNvbnN0IGxvY2FsUGF0aCA9IHRoaXMuZ2V0TG9jYWxQYXRoKGZpbGVOYW1lKTtcblx0XHRcdFx0YXdhaXQgdGhpcy5zYXZlRmlsZShyZXNwb25zZSwgbG9jYWxQYXRoKTtcblxuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdHN1Y2Nlc3M6IHRydWUsXG5cdFx0XHRcdFx0bG9jYWxQYXRoXG5cdFx0XHRcdH07XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoYEhUVFAgZXJyb3IhIHN0YXR1czogJHtyZXNwb25zZS5zdGF0dXN9YCk7XG5cdFx0XHR9XG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHN1Y2Nlc3M6IGZhbHNlLFxuXHRcdFx0XHRsb2NhbFBhdGg6ICcnLFxuXHRcdFx0XHRlcnJvcjogZXJyb3IubWVzc2FnZVxuXHRcdFx0fTtcblx0XHR9XG5cdH1cblxuXHRwcml2YXRlIGdldExvY2FsUGF0aChmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nIHtcblx0XHRsZXQgcGF0aCA9IHRoaXMuc3RvcmVQYXRoO1xuXG5cdFx0Ly8gUmVwbGFjZSB2YXJpYWJsZXMgaW4gcGF0aFxuXHRcdE9iamVjdC5lbnRyaWVzKHRoaXMudmFyaWFibGVzKS5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcblx0XHRcdHBhdGggPSBwYXRoLnJlcGxhY2UoYFxcJHske2tleX19YCwgdmFsdWUpO1xuXHRcdH0pO1xuXG5cdFx0Ly8gQWRkIE1ENSBoYXNoIGlmIHJlcXVpcmVkXG5cdFx0aWYgKHBhdGguaW5jbHVkZXMoJyR7bWQ1fScpKSB7XG5cdFx0XHRjb25zdCBoYXNoID0gY3JlYXRlSGFzaCgnbWQ1JykudXBkYXRlKGZpbGVOYW1lKS5kaWdlc3QoJ2hleCcpO1xuXHRcdFx0cGF0aCA9IHBhdGgucmVwbGFjZSgnJHttZDV9JywgaGFzaCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHBhdGggKyAnLycgKyBmaWxlTmFtZTtcblx0fVxuXG5cdHByaXZhdGUgYXN5bmMgc2F2ZUZpbGUocmVzcG9uc2U6IFJlcXVlc3RVcmxSZXNwb25zZSwgcGF0aDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG5cdFx0Y29uc3QgYXBwID0gKHdpbmRvdyBhcyBhbnkpLmFwcDtcblx0XHRpZiAoIWFwcD8udmF1bHQ/LmFkYXB0ZXIpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGFjY2VzcyBPYnNpZGlhbiB2YXVsdCcpO1xuXHRcdH1cblxuXHRcdC8vIEVuc3VyZSB0aGUgZGlyZWN0b3J5IGV4aXN0c1xuXHRcdGNvbnN0IGRpclBhdGggPSBwYXRoLnN1YnN0cmluZygwLCBwYXRoLmxhc3RJbmRleE9mKCcvJykpO1xuXHRcdGF3YWl0IGFwcC52YXVsdC5hZGFwdGVyLm1rZGlyKGRpclBhdGgpO1xuXG5cdFx0Ly8gU2F2ZSB0aGUgZmlsZVxuXHRcdGlmIChyZXNwb25zZS5hcnJheUJ1ZmZlcikge1xuXHRcdFx0YXdhaXQgYXBwLnZhdWx0LmFkYXB0ZXIud3JpdGVCaW5hcnkocGF0aCwgcmVzcG9uc2UuYXJyYXlCdWZmZXIpO1xuXHRcdH0gZWxzZSBpZiAocmVzcG9uc2UudGV4dCkge1xuXHRcdFx0YXdhaXQgYXBwLnZhdWx0LmFkYXB0ZXIud3JpdGUocGF0aCwgcmVzcG9uc2UudGV4dCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignUmVzcG9uc2UgY29udGFpbnMgbm8gZGF0YScpO1xuXHRcdH1cblx0fVxufVxuXG4vLyB1dGlscy9saW5rLXJlcGxhY2VyLnRzXG5leHBvcnQgY2xhc3MgTGlua1JlcGxhY2VyIHtcblx0cmVwbGFjZUluVGV4dCh0ZXh0OiBzdHJpbmcsIHJlcGxhY2VtZW50czogTWFwPHN0cmluZywgc3RyaW5nPik6IHN0cmluZyB7XG5cdFx0bGV0IG5ld1RleHQgPSB0ZXh0O1xuXHRcdGZvciAoY29uc3QgW29yaWdpbmFsTGluaywgbG9jYWxQYXRoXSBvZiByZXBsYWNlbWVudHMuZW50cmllcygpKSB7XG5cdFx0XHRuZXdUZXh0ID0gbmV3VGV4dC5yZXBsYWNlKG9yaWdpbmFsTGluaywgYCFbXSgke2xvY2FsUGF0aH0pYCk7XG5cdFx0fVxuXHRcdHJldHVybiBuZXdUZXh0O1xuXHR9XG59XG4iXX0=