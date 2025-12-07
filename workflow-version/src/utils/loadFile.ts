import { AudioSource } from '../utils/audioProcessor.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileTypeFromBuffer } from 'file-type';


/**
 * טוען קובץ פרומפט מהנתיב הנתון, או מחזיר פרומפט ברירת מחדל.
 * @param promptPath נתיב אופציונלי לקובץ הפרומפט.
 * @returns מחרוזת עם תוכן הפרומפט.
 */
export async function loadPrompt(promptPath?: string): Promise<string> {

    "use step";

    if (promptPath) {
        console.log(`🔍 Loading custom prompt from: ${promptPath}`);
        return fs.readFile(promptPath, 'utf-8');
    }
    console.log('📂 Loading default prompt...');
    // הנתיב היחסי לקובץ ברירת המחדל
    return fs.readFile(path.join(__dirname, 'prompts', 'transcribe.md'), 'utf-8');
}

export async function loadFile(filePath: string): Promise<AudioSource> {

    "use step";

    // 1. טעינת הקובץ והמרתו ל-AudioSource
    const fileBuffer = await fs.readFile(filePath);
    const type = await fileTypeFromBuffer(fileBuffer);
    if (!type) {
        throw new Error('Could not determine file type. Please provide a valid audio file.');
    }
    console.log(`📄 File type detected: ${type.mime}`);

    const audioSource: AudioSource = {
        // יצירת עותק כדי להבטיח שנקבל ArrayBuffer ולא SharedArrayBuffer
        arrayBuffer: Uint8Array.from(fileBuffer).buffer,
        fileName: path.basename(filePath),
        mimeType: type.mime,
    };

    return audioSource;

}

export async function writeFile(filePath: string, content: string, originalFilePath: string): Promise<void> {

    "use step";

    const basename = path.basename(filePath);
    
    const outputContent = [
        `![](./${basename})`,
        '# תמלול: ' + path.basename(filePath),
        content
    ].join('\n\n');

    return await fs.writeFile(filePath, outputContent, 'utf-8');
}
