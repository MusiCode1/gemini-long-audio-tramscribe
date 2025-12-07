import { transcribeAudioFile } from '../workflows/services/gemini.js';
import { loadPrompt, loadFile, writeFile } from '../utils/loadFile.js';


type options = {
    file: string;
    prompt?: string;
    output?: string;
    concurrent?: number;
    retries?: number;
    backoff?: number;
}

/**
 * מתמלל קובץ שמע מנתיב נתון.
 * זוהי פונקציית הליבה שניתן לייבא ולהשתמש בה במקומות אחרים.
 * @param options אובייקט עם אפשרויות התמלול.
 * @returns מחרוזת עם התמלול הסופי.
 */
export async function transcribe(options: options): Promise<string> {

    "use workflow";

    const { file: filePath, prompt: promptPath, output: outputPath, concurrent: concurrentRequests, retries, backoff: initialBackoff } = options;

    const onProgress = (progress: { message: string }) => {
        // הדפסת עדכוני התקדמות לקונסול
        process.stdout.write(`\r⏳ ${progress.message}`);
    };


    console.log(`🔊 Processing audio file: ${filePath}`);

    const audioSource = await loadFile(filePath);

    // onProgress || (onProgress = () => { });


    // 2. טעינת הפרומפט
    const prompt = await loadPrompt(promptPath);

    // 3. קריאה לשירות התמלול עם הצגת התקדמות
    console.log('\n🚀 Starting transcription process...');
    const finalTranscript = await transcribeAudioFile(
        audioSource,
        prompt,
        onProgress,
        {
            maxConcurrentRequests: concurrentRequests,
            maxRetries: retries,
            initialBackoffMs: initialBackoff
        }
    );

    process.stdout.write('\r\n'); // שורה חדשה אחרי סיום ההתקדמות


    if (outputPath) {


        await writeFile(outputPath, finalTranscript, filePath);
        console.log(`\n✅ Transcription Complete! Output saved to: ${outputPath}`);
    }

    return finalTranscript;
}