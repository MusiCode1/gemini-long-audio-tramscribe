
import { CHUNK_DURATION_MIN, OVERLAP_DURATION_MIN } from '../constants';
import { saveChunk } from './storage';
import { debugLog } from './logger';

// יצירת AudioContext יחיד (singleton) לשימוש חוזר בכל האפליקציה.
// זה חוסך במשאבים ומונע יצירה מרובה של אובייקטים כבדים.
const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
debugLog('AudioContext initialized.', { sampleRate: audioContext.sampleRate });

/**
 * מפענח את קובץ האודיו ל-AudioBuffer, שהוא ייצוג של האודיו בזיכרון.
 */
async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  debugLog('Starting audio decode...', { name: file.name, size: file.size });
  const arrayBuffer = await file.arrayBuffer();
  debugLog('File read into ArrayBuffer, size:', arrayBuffer.byteLength);
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  debugLog('Audio decode complete.', { duration: audioBuffer.duration, channels: audioBuffer.numberOfChannels, sampleRate: audioBuffer.sampleRate });
  return audioBuffer;
}

/**
 * מקודד AudioBuffer לקובץ WAV (בפורמט Blob).
 * כולל המרה מסטריאו למונו במידת הצורך.
 */
function encodeWAV(audioBuffer: AudioBuffer): Blob {
  debugLog('Starting WAV encoding...');
  const isStereo = audioBuffer.numberOfChannels >= 2;
  let monoChannelData: Float32Array;

  // אם האודיו הוא סטריאו, ממצעים את שני הערוצים לערוץ מונו אחד
  if (isStereo) {
    debugLog('Stereo detected, mixing down to mono.');
    const left = audioBuffer.getChannelData(0);
    const right = audioBuffer.getChannelData(1);
    monoChannelData = new Float32Array(left.length);
    for (let i = 0; i < left.length; i++) {
        monoChannelData[i] = (left[i] + right[i]) / 2;
    }
  } else {
    debugLog('Mono audio detected.');
    monoChannelData = audioBuffer.getChannelData(0);
  }
  
  // בניית ה-header של קובץ ה-WAV, לפי המפרט הסטנדרטי
  const numOfChan = 1; // מונו
  const sampleRate = audioBuffer.sampleRate;
  const length = monoChannelData.length * numOfChan * 2;
  const buffer = new ArrayBuffer(44 + length);
  const view = new DataView(buffer);
  let pos = 0;

  // RIFF header
  writeString(view, pos, 'RIFF'); pos += 4;
  view.setUint32(pos, 36 + length, true); pos += 4;
  writeString(view, pos, 'WAVE'); pos += 4;
  // 'fmt ' sub-chunk
  writeString(view, pos, 'fmt '); pos += 4;
  view.setUint32(pos, 16, true); pos += 4; // Sub-chunk size
  view.setUint16(pos, 1, true); pos += 2; // Audio format 1=PCM
  view.setUint16(pos, numOfChan, true); pos += 2;
  view.setUint32(pos, sampleRate, true); pos += 4;
  view.setUint32(pos, sampleRate * numOfChan * 2, true); pos += 4; // Byte rate
  view.setUint16(pos, numOfChan * 2, true); pos += 2; // Block align
  view.setUint16(pos, 16, true); pos += 2; // Bits per sample
  // 'data' sub-chunk
  writeString(view, pos, 'data'); pos += 4;
  view.setUint32(pos, length, true); pos += 4;

  // כתיבת נתוני האודיו עצמם
  for (let i = 0; i < monoChannelData.length; i++, pos += 2) {
    let s = Math.max(-1, Math.min(1, monoChannelData[i]));
    s = s < 0 ? s * 0x8000 : s * 0x7FFF;
    view.setInt16(pos, s, true);
  }
  
  const blob = new Blob([view], { type: 'audio/wav' });
  debugLog('WAV encoding complete. Blob size:', blob.size);
  return blob;
}

// פונקציית עזר לכתיבת מחרוזות לתוך ה-DataView
function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * הפונקציה המרכזית לחיתוך קובץ אודיו למקטעים ואחסונם ב-IndexedDB.
 * @param file קובץ האודיו המקורי.
 * @param onProgress פונקציית callback לדיווח על התקדמות.
 * @returns אובייקט עם המספר הכולל של המקטעים שנוצרו.
 */
export async function chunkAndStoreAudio(file: File, onProgress: (message: string) => void): Promise<{ totalChunks: number }> {
    onProgress('מפענח את קובץ האודיו...');
    let originalBuffer: AudioBuffer | null = await decodeAudioFile(file);
    const { duration, sampleRate, numberOfChannels } = originalBuffer;

    const chunkDurationSec = CHUNK_DURATION_MIN * 60;
    const overlapDurationSec = OVERLAP_DURATION_MIN * 60;
    debugLog('Chunking parameters:', { chunkDurationSec, overlapDurationSec });
    
    // אם האודיו קצר, אין צורך לחתוך, ניצור מקטע יחיד
    if (duration <= chunkDurationSec) {
        onProgress('האודיו קצר מספיק, אין צורך בחיתוך.');
        debugLog('Audio is shorter than chunk duration, creating a single chunk.');
        const wavBlob = encodeWAV(originalBuffer);
        const chunkFile = new File([wavBlob], `chunk_0.wav`, { type: 'audio/wav' });
        await saveChunk(0, chunkFile);
        originalBuffer = null; // שחרור ה-buffer מהזיכרון
        return { totalChunks: 1 };
    }

    // משך הזמן של כל "צעד" בלולאת החיתוך, תוך התחשבות בחפיפה
    const stepDurationSec = chunkDurationSec - overlapDurationSec;
    debugLog('Calculated step duration:', stepDurationSec);

    let currentTime = 0;
    let chunkIndex = 0;

    // לולאה שרצה על פני האודיו ויוצרת מקטעים
    while (currentTime < duration) {
        onProgress(`יוצר ושומר מקטע ${chunkIndex + 1}...`);
        const startTime = currentTime;
        const endTime = Math.min(currentTime + chunkDurationSec, duration);
        
        const startFrame = Math.floor(startTime * sampleRate);
        const endFrame = Math.floor(endTime * sampleRate);
        const frameCount = endFrame - startFrame;
        
        debugLog(`Creating chunk ${chunkIndex}`, { startTime, endTime, frameCount });
        if (frameCount <= 0) {
            debugLog('Frame count is zero or negative, breaking loop.');
            break;
        }

        // יצירת AudioBuffer חדש עבור המקטע
        let chunkBuffer: AudioBuffer | null = audioContext.createBuffer(numberOfChannels, frameCount, sampleRate);

        for (let i = 0; i < numberOfChannels; i++) {
            const channelData = (originalBuffer as AudioBuffer).getChannelData(i);
            const slicedData = channelData.slice(startFrame, endFrame);
            (chunkBuffer as AudioBuffer).copyToChannel(slicedData, i);
        }
        
        // קידוד המקטע ל-WAV ושמירתו ב-IndexedDB
        const wavBlob = encodeWAV(chunkBuffer);
        chunkBuffer = null; // שחרור ה-buffer של המקטע מהזיכרון

        const chunkFile = new File([wavBlob], `chunk_${chunkIndex}.wav`, { type: 'audio/wav' });
        await saveChunk(chunkIndex, chunkFile);

        chunkIndex++;
        if (endTime >= duration) {
            debugLog('End of audio file reached.');
            break;
        }
        currentTime += stepDurationSec;
    }
    
    // שחרור ה-buffer המקורי והגדול מהזיכרון
    originalBuffer = null;
    debugLog('Released original audio buffer from memory.');

    const totalChunks = chunkIndex;
    onProgress(`יצירת ואחסון המקטעים הושלמו. ${totalChunks} מקטעים נשמרו.`);
    debugLog(`Finished creating and storing all ${totalChunks} chunks.`);
    return { totalChunks };
}
