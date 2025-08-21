import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { CHUNK_DURATION_MIN, OVERLAP_DURATION_MIN } from '../constants';
import { saveChunk } from './storage';
import { debugLog } from './logger';

interface AudioSource {
    arrayBuffer: ArrayBuffer;
    fileName: string;
    mimeType: string;
}

/**
 * עוטף את ffprobe ב-Promise כדי לקבל מטא-דאטה של קובץ.
 */
function getAudioDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                return reject(err);
            }
            const duration = metadata.format.duration;
            if (duration === undefined) {
                return reject(new Error('Could not determine audio duration.'));
            }
            resolve(duration);
        });
    });
}

/**
 * חותך מקטע מהקובץ המקורי, ממיר אותו ל-WAV, ומחזיר אותו כ-Buffer.
 */
function extractAndEncodeChunk(
    inputPath: string,
    startTime: number,
    duration: number
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const buffers: Buffer[] = [];
        ffmpeg(inputPath)
            .setStartTime(startTime)
            .setDuration(duration)
            .audioCodec('pcm_s16le') // קידוד ל-WAV, 16-bit
            .audioChannels(1) // מונו
            .audioFrequency(16000) // קצב דגימה סטנדרטי לתמלול
            .format('wav')
            .on('error', reject)
            .on('end', () => resolve(Buffer.concat(buffers)))
            .pipe()
            .on('data', (chunk) => buffers.push(chunk));
    });
}

/**
 * מימוש Node.js לחיתוך קובץ אודיו למקטעים באמצעות FFmpeg.
 */
export async function chunkAndStoreAudio(
    audioSource: AudioSource,
    onProgress: (message: string) => void
): Promise<{ totalChunks: number }> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'audio-chunks-'));
    const tempInputPath = path.join(tempDir, audioSource.fileName);

    try {
        onProgress('מכין קובץ זמני לעיבוד...');
        await fs.writeFile(tempInputPath, Buffer.from(audioSource.arrayBuffer));
        debugLog(`Created temporary file for processing: ${tempInputPath}`);

        onProgress('מאחזר מטא-דאטה של אודיו...');
        const duration = await getAudioDuration(tempInputPath);
        debugLog(`Audio duration retrieved: ${duration}s`);

        const chunkDurationSec = CHUNK_DURATION_MIN * 60;
        const overlapDurationSec = OVERLAP_DURATION_MIN * 60;

        if (duration <= chunkDurationSec) {
            onProgress('האודיו קצר מספיק, אין צורך בחיתוך.');
            const wavBuffer = await extractAndEncodeChunk(tempInputPath, 0, duration);
            const wavArrayBuffer = Uint8Array.from(wavBuffer).buffer;
            const wavBlob = new Blob([wavArrayBuffer], { type: 'audio/wav' });
            await saveChunk(0, wavBlob, `chunk_0_${audioSource.fileName}.wav`);
            return { totalChunks: 1 };
        }

        const stepDurationSec = chunkDurationSec - overlapDurationSec;
        let currentTime = 0;
        let chunkIndex = 0;

        while (currentTime < duration) {
            onProgress(`יוצר ושומר מקטע ${chunkIndex + 1}...`);
            const startTime = currentTime;
            const currentChunkDuration = Math.min(chunkDurationSec, duration - startTime);
            
            if (currentChunkDuration <= 0) break;

            debugLog(`Processing chunk ${chunkIndex}`, { startTime, duration: currentChunkDuration });
            const wavBuffer = await extractAndEncodeChunk(tempInputPath, startTime, currentChunkDuration);
            const wavArrayBuffer = Uint8Array.from(wavBuffer).buffer;
            const wavBlob = new Blob([wavArrayBuffer], { type: 'audio/wav' });
            
            const chunkFileName = `chunk_${chunkIndex}_${audioSource.fileName}.wav`;
            await saveChunk(chunkIndex, wavBlob, chunkFileName);

            chunkIndex++;
            if (startTime + currentChunkDuration >= duration) break;
            currentTime += stepDurationSec;
        }

        onProgress(`יצירת ואחסון המקטעים הושלמו. ${chunkIndex} מקטעים נשמרו.`);
        return { totalChunks: chunkIndex };

    } finally {
        debugLog(`Cleaning up temporary directory: ${tempDir}`);
        await fs.rm(tempDir, { recursive: true, force: true });
    }
}