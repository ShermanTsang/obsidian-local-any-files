// utils/link-extractor.ts
// utils/file-downloader.ts
import {requestUrl, RequestUrlResponse} from 'obsidian';
import {createHash} from 'crypto';

export interface ExtractedLink {
	originalLink: string;
	fileExtension: string;
	fileName: string;
	position: {
		start: number;
		end: number;
	};
}

export class LinkExtractor {
	private extensions: string[];

	constructor(extensions: string[]) {
		// Ensure all extensions are lowercase for case-insensitive comparison
		this.extensions = extensions.map(ext => ext.toLowerCase());
	}

	extractFromText(text: string): ExtractedLink[] {
		const links: ExtractedLink[] = [];
		const markdownLinkRegex = /!\[([^\]]*)\]\(([^)]+)\)|(?<!!)\[([^\]]*)\]\(([^)]+)\)/g;
		const directLinkRegex = /(https?:\/\/[^\s<>)"]+)/g;
		const processedUrls = new Set<string>();

		// Extract direct links first
		let match;
		while ((match = directLinkRegex.exec(text)) !== null) {
			const [url] = match;
			if (this.hasValidExtension(url) && !processedUrls.has(url)) {
				processedUrls.add(url);
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

		// Extract markdown style links, but only if the URL hasn't been processed
		while ((match = markdownLinkRegex.exec(text)) !== null) {
			const [fullMatch, imgTitle, imgUrl, linkTitle, linkUrl] = match;
			const url = imgUrl || linkUrl;
			
			if (this.hasValidExtension(url) && !processedUrls.has(url)) {
				processedUrls.add(url);
				links.push({
					originalLink: url,  // Use the plain URL instead of the full markdown syntax
					fileExtension: this.getExtension(url),
					fileName: imgTitle || linkTitle || this.getFileName(url),
					position: {
						start: match.index,
						end: match.index + fullMatch.length
					}
				});
			}
		}

		return links;
	}

	private hasValidExtension(url: string): boolean {
		const urlLower = url.toLowerCase();
		return this.extensions.some(ext => urlLower.endsWith(ext));
	}

	private getExtension(url: string): string {
		const match = url.match(/\.[^.\s/?#]+$/);
		return match ? match[0].toLowerCase() : '';
	}

	private getFileName(url: string): string {
		try {
			const urlObj = new URL(url);
			const lastSegment = urlObj.pathname.split('/').pop() || '';
			return lastSegment || 'untitled';
		} catch (error) {
			// Fallback for malformed URLs: extract the last segment
			const segments = url.split('/');
			return segments[segments.length - 1] || 'untitled';
		}
	}
}

export interface DownloadResult {
	success: boolean;
	localPath: string;
	error?: string;
}

export class FileDownloader {
	private storePath: string;
	private variables: Record<string, string>;

	constructor(storePath: string, variables: Record<string, string>) {
		this.storePath = storePath;
		this.variables = variables;
	}

	async downloadFile(url: string, fileName: string): Promise<DownloadResult> {
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
				} catch (e) {
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
			} catch (e) {
				return {
					success: false,
					localPath: '',
					error: 'Invalid URL format:' + JSON.stringify(e)
				};
			}

			const response = await requestUrl({
				url: processedUrl,
				throw: false, // Don't throw on non-200 responses
				headers: {
					'User-Agent': 'ObsidianLocalAttachments/1.0'
				}
			});

			// Handle redirects and successful responses
			if (response.status >= 200 && response.status < 400) {
				const localPath = this.getLocalPath(fileName);
				await this.saveFile(response, localPath);

				return {
					success: true,
					localPath
				};
			} else {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
		} catch (error) {
			return {
				success: false,
				localPath: '',
				error: error.message
			};
		}
	}

	private getLocalPath(fileName: string): string {
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

	private async saveFile(response: RequestUrlResponse, path: string): Promise<void> {
		const app = (window as any).app;
		if (!app?.vault?.adapter) {
			throw new Error('Unable to access Obsidian vault');
		}

		// Ensure the directory exists
		const dirPath = path.substring(0, path.lastIndexOf('/'));
		await app.vault.adapter.mkdir(dirPath);

		// Save the file
		if (response.arrayBuffer) {
			await app.vault.adapter.writeBinary(path, response.arrayBuffer);
		} else if (response.text) {
			await app.vault.adapter.write(path, response.text);
		} else {
			throw new Error('Response contains no data');
		}
	}
}

// utils/link-replacer.ts
export class LinkReplacer {
	replaceInText(text: string, replacements: Map<string, string>): string {
		let newText = text;
		for (const [originalLink, localPath] of replacements.entries()) {
			newText = newText.replace(originalLink, `![](${localPath})`);
		}
		return newText;
	}
}
