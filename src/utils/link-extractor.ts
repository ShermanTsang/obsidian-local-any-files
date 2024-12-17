// utils/link-extractor.ts
// utils/file-downloader.ts
import { createHash } from 'crypto';
import { requestUrl, RequestUrlResponse } from 'obsidian';

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
	private storeFileName: string;

	constructor(storePath: string, variables: Record<string, string>, storeFileName: string) {
		this.storePath = storePath;
		this.variables = variables;
		this.storeFileName = storeFileName || '${originalName}';
	}

	async downloadFile(url: string, fileName: string): Promise<DownloadResult> {
		try {
			const response = await requestUrl({ url });

			if (response.status !== 200) {
				return {
					success: false,
					error: `Failed to download file: ${response.status} ${response.text}`,
					localPath: ''
				};
			}

			const localPath = this.getLocalPath(fileName);
			await this.saveFile(response, localPath);

			return {
				success: true,
				error: '',
				localPath: localPath
			};
		} catch (error) {
			return {
				success: false,
				error: `Error downloading file: ${error}`,
				localPath: ''
			};
		}
	}

	private sanitizePath(path: string): string {
		// Replace spaces and other common illegal characters with underscores
		return path.replace(/[\s<>:"\\|?*]/g, '_');
	}

	private getLocalPath(fileName: string): string {
		let path = this.storePath;
		const extension = fileName.substring(fileName.lastIndexOf('.'));

		// Replace variables in path
		Object.entries(this.variables).forEach(([key, value]) => {
			path = path.replace(`\${${key}}`, this.sanitizePath(value));
		});

		// Generate the filename using the pattern
		let generatedFileName = this.storeFileName;
		const fileVariables = {
			...this.variables,
			originalName: fileName,
			md5: createHash('md5').update(fileName).digest('hex')
		};

		Object.entries(fileVariables).forEach(([key, value]) => {
			generatedFileName = generatedFileName.replace(`\${${key}}`, this.sanitizePath(value));
		});

		// Ensure the filename has the correct extension
		if (!generatedFileName.endsWith(extension)) {
			generatedFileName += extension;
		}

		// Sanitize the final path
		path = this.sanitizePath(path);
		generatedFileName = this.sanitizePath(generatedFileName);

		return `${path}/${generatedFileName}`;
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

export class LinkReplacer {
	replaceInText(text: string, replacements: Map<string, string>): string {
		let newText = text;
		for (const [originalLink, localPath] of replacements.entries()) {
			// Extract just the filename from the full path
			const fileName = localPath.split('/').pop() || localPath;
			
			// Check if the link is already part of an image syntax
			const imagePattern = new RegExp(`!\\[([^\\]]*)\\]\\(${this.escapeRegExp(originalLink)}\\)`, 'g');
			if (imagePattern.test(newText)) {
				// If it is, just replace the URL part
				newText = newText.replace(imagePattern, `![$1](${fileName})`);
			} else {
				// If it's not, wrap it in image syntax
				newText = newText.replace(originalLink, `![](${fileName})`);
			}
		}
		return newText;
	}

	private escapeRegExp(string: string): string {
		return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}
}
