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
	isMarkdownImage?: boolean;
}

export class LinkExtractor {
	private extensions: string[];

	constructor(extensions: string[]) {
		// Ensure all extensions are lowercase for case-insensitive comparison
		this.extensions = extensions.map(ext => ext.toLowerCase());
	}

	extractFromText(text: string): ExtractedLink[] {
		const links: ExtractedLink[] = [];
		const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
		const markdownLinkRegex = /(?<!!)\[([^\]]*)\]\(([^)]+)\)/g;
		const directLinkRegex = /(https?:\/\/[^\s<>)"]+)/g;
		const processedUrls = new Set<string>();

		// Extract markdown image links first (these don't need extension validation)
		let match;
		while ((match = markdownImageRegex.exec(text)) !== null) {
			const [fullMatch, imgTitle, imgUrl] = match;
			if (!processedUrls.has(imgUrl)) {
				processedUrls.add(imgUrl);
				links.push({
					originalLink: imgUrl,
					fileExtension: this.getExtension(imgUrl) || '.unknown',
					fileName: imgTitle || this.getFileName(imgUrl),
					position: {
						start: match.index,
						end: match.index + fullMatch.length
					},
					isMarkdownImage: true
				});
			}
		}

		// Extract direct links
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
					},
					isMarkdownImage: false
				});
			}
		}

		// Extract regular markdown links (non-image), but only if the URL hasn't been processed
		while ((match = markdownLinkRegex.exec(text)) !== null) {
			const [fullMatch, linkTitle, linkUrl] = match;
			if (this.hasValidExtension(linkUrl) && !processedUrls.has(linkUrl)) {
				processedUrls.add(linkUrl);
				links.push({
					originalLink: linkUrl,
					fileExtension: this.getExtension(linkUrl),
					fileName: linkTitle || this.getFileName(linkUrl),
					position: {
						start: match.index,
						end: match.index + fullMatch.length
					},
					isMarkdownImage: false
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
			return filename.slice(lastDotIndex).toLowerCase();
		} catch (error) {
			// If URL parsing fails, try to extract extension directly from the string
			const lastDotIndex = url.lastIndexOf('.');
			if (lastDotIndex === -1) return '';
			return url.slice(lastDotIndex).toLowerCase();
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

	private getCleanFileName(url: string): string {
		try {
			// Parse the URL and get the pathname
			const urlObj = new URL(url);
			const pathname = urlObj.pathname;
			
			// Get the filename from the last segment of the path
			let filename = pathname.split('/').pop() || '';
			
			// Remove query parameters if present in the filename
			filename = filename.split('?')[0];
			
			// If no filename found, use a hash of the full URL
			if (!filename) {
				filename = createHash('md5').update(url).digest('hex').substring(0, 8);
			}
			
			return filename;
		} catch (error) {
			// If URL parsing fails, use a hash of the URL
			return createHash('md5').update(url).digest('hex').substring(0, 8);
		}
	}

	private getExtension(fileName: string): string {
		const lastDotIndex = fileName.lastIndexOf('.');
		if (lastDotIndex === -1) return '';
		return fileName.slice(lastDotIndex).toLowerCase();
	}

	private getExtensionFromContentType(contentType: string): string {
		const mimeToExt: { [key: string]: string } = {
			'image/jpeg': '.jpg',
			'image/jpg': '.jpg',
			'image/png': '.png',
			'image/gif': '.gif',
			'image/webp': '.webp',
			'image/svg+xml': '.svg',
			'image/bmp': '.bmp',
			'image/tiff': '.tiff',
			'application/pdf': '.pdf',
			'video/mp4': '.mp4',
			'video/webm': '.webm',
			'audio/mpeg': '.mp3',
			'audio/wav': '.wav',
			'audio/webm': '.weba',
		};

		// Get the base MIME type without parameters
		const baseMimeType = contentType.split(';')[0].trim().toLowerCase();
		return mimeToExt[baseMimeType] || '.unknown';
	}

	private async getLocalPath(originalUrl: string, fileName: string, extension: string): Promise<string> {
		let path = this.storePath;
		const cleanFileName = this.getCleanFileName(originalUrl);

		// Replace variables in path
		Object.entries(this.variables).forEach(([key, value]) => {
			path = path.replace(`\${${key}}`, this.sanitizePath(value));
		});

		// Generate the filename using the pattern
		let generatedFileName = this.storeFileName;
		const fileVariables = {
			...this.variables,
			originalName: cleanFileName,
			md5: createHash('md5').update(originalUrl).digest('hex')
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

	async downloadFile(url: string, fileName: string, isMarkdownImage = false): Promise<DownloadResult> {
		try {
			const response = await requestUrl({ url });

			if (response.status !== 200) {
				return {
					success: false,
					error: `Failed to download file: ${response.status} ${response.text}`,
					localPath: ''
				};
			}

			let extension = this.getExtension(fileName);
			
			// Only use content-type for markdown images without a clear extension
			if (isMarkdownImage && (!extension || extension === '.unknown')) {
				const contentType = response.headers['content-type'];
				if (contentType) {
					extension = this.getExtensionFromContentType(contentType);
				}
			}

			const localPath = await this.getLocalPath(url, fileName, extension);

			// Ensure the directory exists before saving
			const app = (window as any).app;
			const dirPath = localPath.substring(0, localPath.lastIndexOf('/'));
			await app.vault.adapter.mkdir(dirPath);

			// Save the file
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

	private async saveFile(response: RequestUrlResponse, path: string): Promise<void> {
		const app = (window as any).app;
		if (!app?.vault?.adapter) {
			throw new Error('App vault adapter not found');
		}

		// Convert array buffer to binary string if needed
		let data: ArrayBuffer;
		if (response.arrayBuffer) {
			data = response.arrayBuffer;
		} else if (response.text) {
			// Convert text to ArrayBuffer if that's what we got
			const encoder = new TextEncoder();
			data = encoder.encode(response.text).buffer;
		} else {
			throw new Error('No valid data found in response');
		}

		await app.vault.adapter.writeBinary(path, data);
	}
}

export class LinkReplacer {
	replaceInText(text: string, replacements: Map<string, string>): string {
		let newText = text;
		for (const [originalLink, localPath] of replacements.entries()) {
			// Extract just the filename from the full path
			const fileName = localPath.split('/').pop() || localPath;
			
			// Check if the link is part of an image syntax
			const imagePattern = new RegExp(`!\\[([^\\]]*)\\]\\(${this.escapeRegExp(originalLink)}\\)`, 'g');
			// Check if the link is part of a regular markdown link syntax
			const linkPattern = new RegExp(`(?<!!)\\[([^\\]]*)\\]\\(${this.escapeRegExp(originalLink)}\\)`, 'g');
			
			if (imagePattern.test(newText)) {
				// If it's an image link, replace while preserving any alt text
				newText = newText.replace(imagePattern, `![$1](${fileName})`);
			} else if (linkPattern.test(newText)) {
				// If it's a regular link, replace while preserving the link text
				newText = newText.replace(linkPattern, `[$1](${fileName})`);
			} else {
				// If it's a direct URL, convert it to a regular markdown link
				newText = newText.replace(originalLink, `[${fileName}](${fileName})`);
			}
		}
		return newText;
	}

	private escapeRegExp(string: string): string {
		return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}
}
