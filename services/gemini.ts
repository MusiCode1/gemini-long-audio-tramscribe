import { GoogleGenAI } from '@google/genai';
import { ProcessingState, TranscriptionProgress } from '../types';
import { chunkAndStoreAudio, AudioSource } from '../utils/audioProcessor';
import { getChunk, clearAllChunks } from '../utils/storage';
import { debugLog } from '../utils/logger';

/**
* פונקציית עזר המבצעת פעולה אסינכרונית עם מנגנון ניסיונות חוזרים והמתנה (Exponential Backoff).
* @param fn הפעולה האסינכרונית לביצוע.
* @param operationName שם הפעולה (לצורכי לוגינג).
* @param chunkIndex אינדקס המקטע המעובד.
* @param onProgress פונקציית callback לדיווח התקדמות.
* @returns את תוצאת הפעולה המוצלחת.
* @throws שגיאה אם כל הניסיונות נכשלים.
*/
async function withRetry<T>(
  fn: () => Promise<T>,
  operationName: string,
  chunkIndex: number,
  onProgress: (update: TranscriptionProgress) => void,
  options: { maxRetries: number; initialBackoffMs: number }
): Promise<T> {
  const { maxRetries, initialBackoffMs } = options;
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      // חישוב זמן המתנה עם הכפלה מעריכית, בתוספת רכיב אקראי קטן למניעת התנגשויות
      const delay = initialBackoffMs * Math.pow(2, attempt - 1) + Math.random() * 1000;
      
      debugLog(`[Chunk ${chunkIndex + 1}] Attempt ${attempt}/${maxRetries} failed for ${operationName}. Retrying in ${delay.toFixed(0)}ms...`, lastError);
      
      // עדכון המשתמש רק אם לא מדובר בניסיון האחרון
      if (attempt < maxRetries) {
        onProgress({
          state: ProcessingState.TRANSCRIBING,
          message: `ניסיון ${attempt}/${maxRetries} נכשל עבור מקטע ${chunkIndex + 1} (${operationName}). מנסה שוב...`
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  // אם כל הניסיונות נכשלו, זרוק שגיאה מפורטת
  throw new Error(`[Chunk ${chunkIndex + 1}] Operation "${operationName}" failed after ${maxRetries} attempts: ${lastError?.message}`);
}

// בדיקה אם מפתח ה-API הוגדר
if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}

// אתחול לקוח ה-API של ג'מיני
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
debugLog('GoogleGenAI service initialized.');

/**
 * יוצר שם משאב ייחודי ותקף עבור ה-File API של Google.
 * @param chunkIndex האינדקס של מקטע האודיו.
 * @returns מחרוזת עם שם משאב ייחודי.
 */
function generateUniqueResourceName(chunkIndex: number): string {
  const randomPart = Math.random().toString(36).substring(2, 12);
  const timePart = Date.now().toString(36).slice(-6);
  const name = `c${chunkIndex}-${randomPart}-${timePart}`;
  debugLog(`Generated unique resource name: ${name} for chunk ${chunkIndex}`);
  return name;
}

/**
 * מאחה שני חלקי טקסט על ידי מציאת החפיפה הטובה ביותר.
 * @param text1 החלק הקודם של התמלול.
 * @param text2 החלק החדש של התמלול.
 * @returns הטקסט המאוחד.
 */
function stitch(text1: string, text2: string): string {
    debugLog('Stitching texts. Text 1 length:', text1.length, 'Text 2 length:', text2.length);
    const searchWindow = Math.min(text1.length, 1000);
    const text1End = text1.substring(text1.length - searchWindow);
    debugLog('Stitch search window (last 1000 chars of text1):', text1End.substring(0, 100) + '...');

    let bestOverlapLength = 0;

    for (let len = Math.min(text2.length, searchWindow); len > 10; len--) {
        const text2Start = text2.substring(0, len);
        if (text1End.endsWith(text2Start)) {
            bestOverlapLength = len;
            debugLog(`Found best overlap of length ${bestOverlapLength}:`, text2Start.substring(0, 100) + '...');
            break;
        }
    }
    if (bestOverlapLength === 0) {
        debugLog('No significant overlap found. Concatenating texts.');
    }
    
    const stitchedText = text1 + text2.substring(bestOverlapLength);
    debugLog('Stitching complete. New total length:', stitchedText.length);
    return stitchedText;
}

/**
 * מתמלל מקטע אודיו בודד.
 * @returns התמלול של המקטע.
 */
async function transcribeChunk(
    chunkIndex: number,
    totalChunks: number,
    audioSource: AudioSource,
    prompt: string,
    onProgress: (update: TranscriptionProgress) => void,
    retryOptions: { maxRetries: number; initialBackoffMs: number }
): Promise<string> {
    debugLog(`--- Processing chunk ${chunkIndex + 1}/${totalChunks} ---`);
    const chunkFile = await getChunk(chunkIndex);
    if (!chunkFile) {
        throw new Error(`שגיאה: לא ניתן היה לאחזר את מקטע מספר ${chunkIndex} מהאחסון.`);
    }
    debugLog(`Retrieved chunk ${chunkIndex} from IndexedDB`, { name: chunkFile.name, size: chunkFile.size });

    let uploadedFile: any;
    try {
        const resourceName = generateUniqueResourceName(chunkIndex);
        const displayName = `chunk_${chunkIndex}_${audioSource.fileName}`;

        debugLog(`Uploading chunk ${chunkIndex} to Google AI`, { resourceName, displayName });
        uploadedFile = await withRetry(
            () => ai.files.upload({
                config: { name: resourceName, displayName: displayName, mimeType: chunkFile.type },
                file: chunkFile,
            }),
            'File Upload',
            chunkIndex,
            onProgress,
            retryOptions
        );

        if (!uploadedFile) {
            throw new Error("העלאת הקובץ ל-API נכשלה, לא התקבל אובייקט קובץ.");
        }
        debugLog('Upload successful:', uploadedFile);

        const audioPart = { fileData: { mimeType: uploadedFile.mimeType, fileUri: uploadedFile.uri } };
        const textPart = { text: prompt };

        debugLog('Calling generateContentStream with URI:', audioPart.fileData.fileUri);
        const stream = await withRetry(
            () => ai.models.generateContentStream({
                model: 'gemini-2.5-flash',
                contents: { parts: [audioPart, textPart] },
            }),
            'Transcription',
            chunkIndex,
            onProgress,
            retryOptions
        );

        let currentChunkTranscript = '';
        for await (const chunk of stream) {
            currentChunkTranscript += chunk.text;
        }
        debugLog(`Finished streaming for chunk ${chunkIndex + 1}. Full text length: ${currentChunkTranscript.length}`);
        return currentChunkTranscript;

    } finally {
        if (uploadedFile?.name) {
            debugLog('Attempting to delete remote file:', uploadedFile.name);
            ai.files.delete({ name: uploadedFile.name })
                .then(() => debugLog(`Successfully deleted remote file: ${uploadedFile?.name}`))
                .catch(e => {
                    console.error("Failed to delete remote file:", e);
                    debugLog("Failed to delete remote file:", e);
                });
        }
    }
}

/**
 * הפונקציה המרכזית המנהלת את כל תהליך התמלול של קובץ אודיו.
 */
export async function transcribeAudioFile(
    audioSource: AudioSource,
    prompt: string,
    onProgress: (update: TranscriptionProgress) => void,
    options: {
        maxConcurrentRequests?: number;
        maxRetries?: number;
        initialBackoffMs?: number;
    } = {}
): Promise<string> {
   const {
       maxConcurrentRequests = 3,
       maxRetries = 5,
       initialBackoffMs = 2000
   } = options;

    debugLog('--- Starting new transcription process ---', {
        file: audioSource.fileName,
        concurrent: maxConcurrentRequests,
        retries: maxRetries,
        backoff: initialBackoffMs
    });
    try {
        onProgress({
            state: ProcessingState.PREPARING,
            message: 'מכין ומקטע את האודיו...',
        });
        const { totalChunks } = await chunkAndStoreAudio(audioSource, (chunkingMessage) => {
            onProgress({ state: ProcessingState.PREPARING, message: chunkingMessage });
        });
        debugLog(`Audio chunking complete. Total chunks: ${totalChunks}`);

        const transcripts = new Array<string | Error>(totalChunks);
        let completedChunks = 0;

        const chunkIndices = Array.from({ length: totalChunks }, (_, i) => i);

        const worker = async () => {
            while (chunkIndices.length > 0) {
                const chunkIndex = chunkIndices.shift();
                if (chunkIndex === undefined) continue;

                try {
                   const retryOptions = { maxRetries, initialBackoffMs };
                    const result = await transcribeChunk(chunkIndex, totalChunks, audioSource, prompt, onProgress, retryOptions);
                    transcripts[chunkIndex] = result;
                } catch (e) {
                    debugLog(`Error processing chunk ${chunkIndex}:`, e);
                    transcripts[chunkIndex] = e instanceof Error ? e : new Error(String(e));
                } finally {
                    completedChunks++;
                    onProgress({
                        state: ProcessingState.TRANSCRIBING,
                        message: `מתמלל... הושלמו ${completedChunks}/${totalChunks} מקטעים.`,
                        currentChunk: completedChunks,
                        totalChunks: totalChunks,
                    });
                }
            }
        };

        const workers = Array(maxConcurrentRequests).fill(null).map(worker);
        await Promise.all(workers);

        const failedChunks = transcripts.reduce((acc, result, index) => {
            if (result instanceof Error) {
                acc.push({ index, error: result.message });
            }
            return acc;
        }, [] as { index: number; error: string }[]);

        if (failedChunks.length > 0) {
            const errorMessages = failedChunks.map(f => `מקטע ${f.index + 1}: ${f.error}`).join('\n');
            throw new Error(`נכשלו ${failedChunks.length} מקטעים:\n${errorMessages}`);
        }

        onProgress({
            state: ProcessingState.TRANSCRIBING,
            message: 'מאחה את כל חלקי התמלול...',
            currentChunk: totalChunks,
            totalChunks: totalChunks,
        });
        debugLog('Stitching all transcripts together.');

        const successfulTranscripts = transcripts.filter(t => typeof t === 'string') as string[];
        if (successfulTranscripts.length === 0) {
            debugLog('No transcripts to stitch, returning empty string.');
            return '';
        }

        let fullTranscript = successfulTranscripts[0];
        for (let i = 1; i < successfulTranscripts.length; i++) {
            fullTranscript = stitch(fullTranscript, successfulTranscripts[i]);
        }
        debugLog('Stitching complete. Final transcript length:', fullTranscript.length);

        return fullTranscript;

    } catch (e) {
        console.error("Gemini API Error:", e);
        debugLog("Caught error in transcribeAudioFile:", e);
        if (e instanceof Error && e.message.includes('permission')) {
             throw new Error("שגיאת הרשאות ב-API. ודא שמפתח ה-API שלך תקף ושה-File API מופעל בפרויקט Google Cloud שלך.");
        }
        const errorMessage = e instanceof Error ? e.message : "שגיאה לא ידועה בתקשורת עם Gemini.";
        throw new Error(errorMessage);
    } finally {
        debugLog('Performing final cleanup of local chunks from IndexedDB.');
        await clearAllChunks();
    }
}