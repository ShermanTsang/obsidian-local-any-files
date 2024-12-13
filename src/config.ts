export const EXTENSION_PRESETS = {
	// Image formats
	image: ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp', '.tiff', '.ico', '.raw', '.heic', '.heif', '.avif', '.jfif'],
	
	// Document and office files
	officeFile: ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.pdf', '.odt', '.ods', '.odp', '.rtf', '.txt', '.csv', '.epub', '.pages', '.numbers', '.key'],
	
	// Archive and compression formats
	archivePackage: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.iso', '.tgz', '.z', '.bzip2', '.cab'],
	
	// Audio formats
	music: ['.mp3', '.wav', '.flac', '.m4a', '.ogg', '.aac', '.wma', '.aiff', '.alac', '.mid', '.midi', '.opus', '.amr'],
	
	// Video formats
	video: ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpg', '.mpeg', '.3gp', '.ogv', '.ts', '.vob'],

	// Code and development files
	code: ['.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.scss', '.json', '.xml', '.yaml', '.yml', '.md', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs', '.swift'],
	
	// Font files
	font: ['.ttf', '.otf', '.woff', '.woff2', '.eot'],
	
	// 3D and design files
	design: ['.psd', '.ai', '.eps', '.sketch', '.fig', '.xd', '.blend', '.obj', '.fbx', '.stl', '.3ds', '.dae'],
	
	// Database files
	database: ['.sql', '.db', '.sqlite', '.mdb', '.accdb', '.csv', '.tsv'],
	
	// Ebook formats
	ebook: ['.epub', '.mobi', '.azw', '.azw3', '.fb2', '.lit', '.djvu'],
	
	// Research and academic
	academic: ['.bib', '.tex', '.sty', '.cls', '.csl', '.nb', '.mat', '.r', '.rmd', '.ipynb']
};

export interface LocalAttachmentsSettings {
    tasks: string[];
    scope: string;
    presetExtensions: string[];
    customExtensions: string[];
    storePath: string;
    storeFileName: string;
}

export const DEFAULT_SETTINGS: LocalAttachmentsSettings = {
    tasks: ['extract', 'download', 'replace'],
    scope: 'currentFile',
    presetExtensions: ['image', 'officeFile'],
    customExtensions: [],
    storePath: 'assets/${path}',
    storeFileName: '${originalName}'
};
