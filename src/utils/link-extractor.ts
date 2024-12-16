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
		try {
			// Parse the URL and get the pathname
			const urlObj = new URL(url);
			const pathname = urlObj.pathname;
			
			// Get the filename from the last segment of the path
			const filename = pathname.split('/').pop() || '';
			
			// Find the last dot in the filename (not in the query parameters)
			const lastDotIndex = filename.lastIndexOf('.');
			if (lastDotIndex === -1) return '';
			
			// Get everything after the last dot
			const extension = filename.slice(lastDotIndex).toLowerCase();
			
			// Validate that this is one of our accepted extensions
			if (this.extensions.includes(extension)) {
				return extension;
			}
			return '';
		} catch (error) {
			// Fallback for invalid URLs: use simple regex
			const match = url.match(/\.([^.\s/?#]+)(?:[?#]|$)/);
			return match ? `.${match[1].toLowerCase()}` : '';
		}
	}

	private getFileName(url: string): string {
		try {
			const urlObj = new URL(url);
			const pathname = urlObj.pathname;
			
			// Get the filename from the last segment of the path
			const lastSegment = pathname.split('/').pop() || '';
			
			// Remove any query parameters or hash if present
			const filename = lastSegment.split(/[?#]/)[0];
			
			if (!filename) return 'untitled';
			
			// Generate a clean filename by:
			// 1. Removing any problematic characters
			// 2. Preserving the extension we detected
			const extension = this.getExtension(url);
			const nameWithoutExt = filename.substring(0, filename.length - extension.length);
			const cleanName = nameWithoutExt
				.replace(/[^a-zA-Z0-9-_]/g, '_') // Replace invalid characters with underscore
				.replace(/_+/g, '_') // Replace multiple underscores with single one
				.replace(/^_|_$/g, ''); // Remove leading/trailing underscores
			
			return cleanName + extension;
		} catch (error) {
			// Fallback for malformed URLs
			const segments = url.split('/');
			const lastSegment = segments[segments.length - 1] || 'untitled';
			const extension = this.getExtension(url);
			const nameWithoutExt = lastSegment.substring(0, lastSegment.length - extension.length);
			
			return nameWithoutExt
				.replace(/[^a-zA-Z0-9-_]/g, '_')
				.replace(/_+/g, '_')
				.replace(/^_|_$/g, '') + extension;
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
				console.log('localPath', localPath);
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
			// Check if the link is already part of an image syntax
			const imagePattern = new RegExp(`!\\[([^\\]]*)\\]\\(${this.escapeRegExp(originalLink)}\\)`, 'g');
			if (imagePattern.test(newText)) {
				// If it is, just replace the URL part
				newText = newText.replace(imagePattern, `![$1](${localPath})`);
			} else {
				// If it's not, wrap it in image syntax
				newText = newText.replace(originalLink, `![](${localPath})`);
			}
		}
		return newText;
	}

	private escapeRegExp(string: string): string {
		return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}
}
