import { GoogleGenAI } from '@google/genai';
import { ProcessingState, TranscriptionProgress } from '../types';
import { chunkAndStoreAudio } from '../utils/audioProcessor';
import { getChunk, clearAllChunks } from '../utils/storage';
import { debugLog } from '../utils/logger';

// בדיקה אם מפתח ה-API הוגדר
if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}

// אתחול לקוח ה-API של ג'מיני
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
debugLog('GoogleGenAI service initialized.');

/**
 * Generates a unique, valid resource name for the Google AI File API.
 * The name is guaranteed to be under 40 characters and use only valid characters.
 * @param chunkIndex The index of the audio chunk.
 * @returns A unique resource name string.
 *
 * יוצר שם משאב ייחודי ותקף עבור ה-File API של Google.
 * השם מובטח להיות מתחת ל-40 תווים ולהשתמש רק בתווים חוקיים.
 * @param chunkIndex האינדקס של מקטע האודיו.
 * @returns מחרוזת עם שם משאב ייחודי.
 */
function generateUniqueResourceName(chunkIndex: number): string {
  const randomPart = Math.random().toString(36).substring(2, 12); // 10 תווים אקראיים
  const timePart = Date.now().toString(36).slice(-6); // 6 תווים אחרונים של חותמת הזמן
  const name = `c${chunkIndex}-${randomPart}-${timePart}`;
  debugLog(`Generated unique resource name: ${name} for chunk ${chunkIndex}`);
  return name;
}

/**
 * Stitches two text parts together by finding the best overlap.
 * It looks for the longest common suffix of text1 that is also a prefix of text2.
 * @param text1 The previous part of the transcript.
 * @param text2 The new part of the transcript.
 * @returns The combined text.
 *
 * מאחה שני חלקי טקסט על ידי מציאת החפיפה הטובה ביותר.
 * הפונקציה מחפשת את הסיומת המשותפת הארוכה ביותר של text1 שהיא גם קידומת של text2.
 * @param text1 החלק הקודם של התמלול.
 * @param text2 החלק החדש של התמלול.
 * @returns הטקסט המאוחד.
 */
function stitch(text1: string, text2: string): string {
    debugLog('Stitching texts. Text 1 length:', text1.length, 'Text 2 length:', text2.length);
    const searchWindow = Math.min(text1.length, 1000); // כמות התווים אחורה לחיפוש
    const text1End = text1.substring(text1.length - searchWindow);
    debugLog('Stitch search window (last 1000 chars of text1):', text1End.substring(0, 100) + '...');

    let bestOverlapLength = 0;

    // איטרציה מהחפיפה הארוכה ביותר האפשרית אחורה כדי למצוא התאמה
    for (let len = Math.min(text2.length, searchWindow); len > 10; len--) {
        const text2Start = text2.substring(0, len);
        if (text1End.endsWith(text2Start)) {
            bestOverlapLength = len;
            debugLog(`Found best overlap of length ${bestOverlapLength}:`, text2Start.substring(0, 100) + '...');
            break; // מצאנו את ההתאמה הארוכה ביותר
        }
    }
    if (bestOverlapLength === 0) {
        debugLog('No significant overlap found. Concatenating texts.');
    }
    
    // החזרת הטקסט המלא לאחר הסרת החפיפה מהחלק השני
    const stitchedText = text1 + text2.substring(bestOverlapLength);
    debugLog('Stitching complete. New total length:', stitchedText.length);
    return stitchedText;
}

/**
 * הפונקציה המרכזית המנהלת את כל תהליך התמלול של קובץ אודיו.
 * @param file קובץ האודיו שהועלה על ידי המשתמש.
 * @param prompt הוראות התמלול עבור מודל ה-AI.
 * @param onProgress פונקציית callback לדיווח על התקדמות לממשק המשתמש.
 * @returns מחרוזת המכילה את התמלול הסופי והמלא.
 */
export async function transcribeAudioFile(
    file: File,
    prompt: string,
    onProgress: (update: TranscriptionProgress) => void
): Promise<string> {
    debugLog('--- Starting new transcription process ---', { file: file.name });
    try {
        // שלב 1: חיתוך קובץ האודיו למקטעים ואחסונם ב-IndexedDB
        onProgress({
            state: ProcessingState.PREPARING,
            message: 'מכין ומקטע את האודיו...',
        });
        const { totalChunks } = await chunkAndStoreAudio(file, (chunkingMessage) => {
            onProgress({ state: ProcessingState.PREPARING, message: chunkingMessage });
        });
        debugLog(`Audio chunking complete. Total chunks: ${totalChunks}`);

        const transcripts: string[] = [];

        // שלב 2: עיבוד כל מקטע בנפרד
        for (let i = 0; i < totalChunks; i++) {
            debugLog(`--- Processing chunk ${i + 1}/${totalChunks} ---`);
            const chunkFile = await getChunk(i);
            if (!chunkFile) {
                throw new Error(`שגיאה: לא ניתן היה לאחזר את מקטע מספר ${i} מהאחסון.`);
            }
            debugLog(`Retrieved chunk ${i} from IndexedDB`, { name: chunkFile.name, size: chunkFile.size });

            let uploadedFile: any;
            try {
                onProgress({
                    state: ProcessingState.UPLOADING,
                    message: `מעלה מקטע ${i + 1}/${totalChunks}...`,
                    currentChunk: i + 1,
                    totalChunks: totalChunks,
                });

                const resourceName = generateUniqueResourceName(i);
                const displayName = `chunk_${i}_${file.name}`;

                debugLog(`Uploading chunk ${i} to Google AI`, { resourceName, displayName });
                // העלאת מקטע האודיו לשרתים של גוגל באמצעות ה-File API
                uploadedFile = await ai.files.upload({
                    config: { name: resourceName, displayName: displayName, mimeType: chunkFile.type },
                    file: chunkFile,
                    
                });
                
                if (!uploadedFile) {
                    throw new Error("העלאת הקובץ ל-API נכשלה, לא התקבל אובייקט קובץ.");
                }
                debugLog('Upload successful:', uploadedFile);


                const transcribingMessage = `מתמלל מקטע ${i + 1}/${totalChunks}...`;
                onProgress({
                    state: ProcessingState.TRANSCRIBING,
                    message: transcribingMessage,
                    currentChunk: i + 1,
                    totalChunks: totalChunks,
                });

                // הכנת חלקי הבקשה ל-Gemini
                const audioPart = { fileData: { mimeType: uploadedFile.mimeType, fileUri: uploadedFile.uri } };
                const textPart = { text: prompt };

                debugLog('Calling generateContentStream with URI:', audioPart.fileData.fileUri);
                // שליחת בקשת תמלול בסטרימינג
                const stream = await ai.models.generateContentStream({
                    model: 'gemini-2.5-flash',
                    contents: { parts: [audioPart, textPart] },
                });

                // קריאת התוצאות מהסטרים
                let currentChunkTranscript = '';
                for await (const chunk of stream) {
                    const text = chunk.text;
                    // debugLog(`Stream received for chunk ${i}:`, `"${text}"`);
                    currentChunkTranscript += text;
                    // שליחת עדכון התקדמות עם הטקסט המוזרם לממשק המשתמש
                    onProgress({
                        state: ProcessingState.TRANSCRIBING,
                        message: transcribingMessage,
                        currentChunk: i + 1,
                        totalChunks: totalChunks,
                        streamedChunkText: currentChunkTranscript,
                    });
                }
                debugLog(`Finished streaming for chunk ${i + 1}. Full text length: ${currentChunkTranscript.length}`);
                
                transcripts.push(currentChunkTranscript);

            } finally {
                // שלב 3: ניקוי הקובץ שהועלה מהשרתים של גוגל באופן מיידי
                if (uploadedFile?.name) {
                    debugLog('Attempting to delete remote file:', uploadedFile.name);
                    // זוהי פעולת "שגר ושכח", אין צורך לחכות לסיומה כדי לא לעכב את התהליך
                    ai.files.delete({name: uploadedFile.name})
                      .then(() => debugLog(`Successfully deleted remote file: ${uploadedFile?.name}`))
                      .catch(e => {
                          console.error("Failed to delete remote file:", e)
                          debugLog("Failed to delete remote file:", e)
                      });
                }
            }
        }

        // שלב 4: איחוי כל חלקי התמלול לטקסט אחד רציף
        onProgress({
            state: ProcessingState.TRANSCRIBING,
            message: 'מאחה את כל חלקי התמלול...',
            currentChunk: totalChunks,
            totalChunks: totalChunks,
        });
        debugLog('Stitching all transcripts together.');
        
        if (transcripts.length === 0) {
            debugLog('No transcripts to stitch, returning empty string.');
            return '';
        }
        
        let fullTranscript = transcripts[0];
        for (let i = 1; i < transcripts.length; i++) {
            fullTranscript = stitch(fullTranscript, transcripts[i]);
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
        // שלב 5: ניקוי סופי של המקטעים המקומיים מ-IndexedDB
        debugLog('Performing final cleanup of local chunks from IndexedDB.');
        await clearAllChunks();
    }
}