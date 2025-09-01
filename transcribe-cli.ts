// ===================================================================================
// Transcribe CLI - כלי שורת פקודה לתמלול קבצי אודיו באמצעות שירות Gemini
// ===================================================================================
//
// שימוש:
// bun run transcribe -- --file <path> [--prompt <path>] [--output <path>] [--concurrent <number>]
//
// דוגמאות:
// bun run transcribe -- --file ./audio/my-podcast.mp3
// bun run transcribe -- --file ./audio/meeting.wav --prompt ./prompts/meeting-prompt.txt
// bun run transcribe -- --file input.mp3 --output result.md
// bun run transcribe -- --file long.mp3 --concurrent 5
//
// ===================================================================================
import 'dotenv/config'; // טעינת משתני סביבה מקובץ .env
import './utils/polyfill'; // ייבוא הפוליפילים ראשון כדי להבטיח שהסביבה מוכנה
import { transcribeAudioFile } from './services/gemini';
import { AudioSource } from './utils/audioProcessor';
import { promises as fs } from 'fs';
import path from 'path';
import { fileTypeFromBuffer } from 'file-type';

/**
 * פונקציה ראשית המריצה את תהליך התמלול מה-CLI.
 */
/**
 * מנתח את הארגומנטים שהועברו משורת הפקודה.
 * @returns אובייקט עם נתיבי הקבצים הנדרשים.
 */
function parseArguments(): { filePath: string; promptPath?: string; outputPath?: string; concurrent?: number } {
    const args = process.argv.slice(2);
    const fileIndex = args.indexOf('--file');
    const promptIndex = args.indexOf('--prompt');
    const outputIndex = args.indexOf('--output');
    const concurrentIndex = args.indexOf('--concurrent');

    if (fileIndex === -1 || !args[fileIndex + 1]) {
        throw new Error('Missing required argument: --file <path_to_audio_file>');
    }

    const filePath = args[fileIndex + 1];
    const promptPath = promptIndex !== -1 ? args[promptIndex + 1] : undefined;
    const outputPath = outputIndex !== -1 ? args[outputIndex + 1] : undefined;
    let concurrent: number | undefined = undefined;
    if (concurrentIndex !== -1 && args[concurrentIndex + 1]) {
        const num = parseInt(args[concurrentIndex + 1], 10);
        if (!isNaN(num) && num > 0) {
            concurrent = num;
        } else {
            console.warn('Warning: Invalid value for --concurrent. Using default.');
        }
    }


    return { filePath, promptPath, outputPath, concurrent };
}

/**
 * טוען קובץ פרומפט מהנתיב הנתון, או מחזיר פרומפט ברירת מחדל.
 * @param promptPath נתיב אופציונלי לקובץ הפרומפט.
 * @returns מחרוזת עם תוכן הפרומפט.
 */
async function loadPrompt(promptPath?: string): Promise<string> {
    if (promptPath) {
        console.log(`🔍 Loading custom prompt from: ${promptPath}`);
        return fs.readFile(promptPath, 'utf-8');
    }
    console.log('📂 Loading default prompt...');
    // הנתיב היחסי לקובץ ברירת המחדל
    return fs.readFile(path.join(__dirname, 'prompts', 'transcribe.md'), 'utf-8');
}

/**
 * מתמלל קובץ שמע מנתיב נתון.
 * זוהי פונקציית הליבה שניתן לייבא ולהשתמש בה במקומות אחרים.
 * @param filePath נתיב לקובץ השמע.
 * @param promptPath נתיב אופציונלי לקובץ פרומפט.
 * @param onProgress קולבק אופציונלי לדיווח על התקדמות.
 * @returns התמלול הסופי כמחרוזת.
 */
export async function transcribe(
    filePath: string,
    promptPath?: string,
    onProgress?: (progress: { message: string }) => void,
    concurrentRequests?: number
): Promise<string> {
    console.log(`🔊 Processing audio file: ${filePath}`);

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

    // 2. טעינת הפרומפט
    const prompt = await loadPrompt(promptPath);

    // 3. קריאה לשירות התמלול עם הצגת התקדמות
    console.log('\n🚀 Starting transcription process...');
    const finalTranscript = await transcribeAudioFile(audioSource, prompt, onProgress, concurrentRequests);

    if (onProgress) {
        process.stdout.write('\r\n'); // שורה חדשה אחרי סיום ההתקדמות
    }

    return finalTranscript;
}


/**
 * פונקציה ראשית המריצה את תהליך התמלול מה-CLI.
 */
async function main() {
    console.log('--- Transcribe CLI Initialized ---');

    const { filePath, promptPath, outputPath, concurrent } = parseArguments();

    if (concurrent) {
        console.log(`⚙️  Running with ${concurrent} concurrent requests.`);
    }

    // קריאה לפונקציית התמלול הראשית
    const finalTranscript = await transcribe(filePath, promptPath, (progress) => {
        // הדפסת עדכוני התקדמות לקונסול
        process.stdout.write(`\r⏳ ${progress.message}`);
    }, concurrent);

    // שמירת התוצאה או הדפסתה
    if (outputPath) {
        const basename = path.basename(filePath);
        const outputContent = [
            `![](./${basename})`,
            '# תמלול: ' + path.basename(filePath),
            finalTranscript
        ].join('\n\n');

        await fs.writeFile(outputPath, outputContent, 'utf-8');
        console.log(`\n✅ Transcription Complete! Output saved to: ${outputPath}`);
    } else {
        console.log('\n✅ Transcription Complete!');
        console.log('------------------------------------');
        console.log(finalTranscript);
        console.log('------------------------------------');
    }
}

// הרצת הפונקציה הראשית וטיפול בשגיאות
main().catch(error => {
    console.error("\n❌ An unexpected error occurred:");
    console.error(error.message);
    process.exit(1);
});