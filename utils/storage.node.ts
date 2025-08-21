import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { debugLog } from './logger';

let tempDir: string | null = null;

/**
 * יוצר ומחזיר נתיב לספרייה זמנית ייעודית לתהליך.
 */
async function getTempDir(): Promise<string> {
    if (!tempDir) {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'transcribe-chunks-'));
        debugLog(`Created temporary storage directory for chunks: ${tempDir}`);
    }
    return tempDir;
}

/**
 * שומר מקטע אודיו (כ-Blob) בקובץ בספרייה זמנית.
 */
export async function saveChunk(key: number, chunkBlob: Blob, fileName: string): Promise<void> {
    const dir = await getTempDir();
    const filePath = path.join(dir, `${key}-${fileName}`);
    const buffer = Buffer.from(await chunkBlob.arrayBuffer());
    await fs.writeFile(filePath, buffer);
    debugLog(`Saved chunk ${key} to temporary file: ${filePath}`);
}

/**
 * מאחזר מקטע אודיו מקובץ זמני.
 */
export async function getChunk(key: number): Promise<File | undefined> {
    if (!tempDir) return undefined;
    
    // מוצאים את הקובץ בספרייה שמתחיל במפתח המתאים
    const files = await fs.readdir(tempDir);
    const fileName = files.find(f => f.startsWith(`${key}-`));

    if (!fileName) {
        debugLog(`Chunk with key ${key} not found in temporary directory.`);
        return undefined;
    }

    const filePath = path.join(tempDir, fileName);
    const buffer = await fs.readFile(filePath);
    // המרה בטוחה ל-ArrayBuffer
    const arrayBuffer = Uint8Array.from(buffer).buffer;
    const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
    
    // משחזרים את שם הקובץ המקורי מהחלק שאחרי המקף הראשון
    const originalFileName = fileName.substring(fileName.indexOf('-') + 1);
    
    const file = new File([blob], originalFileName, { type: 'audio/wav' });
    debugLog(`Retrieved chunk ${key} from temporary file: ${filePath}`);
    return file;
}

/**
 * מנקה את כל המקטעים על ידי מחיקת הספרייה הזמנית.
 */
export async function clearAllChunks(): Promise<void> {
    if (tempDir) {
        debugLog(`Clearing all chunks by deleting temporary directory: ${tempDir}`);
        await fs.rm(tempDir, { recursive: true, force: true });
        tempDir = null;
    }
}