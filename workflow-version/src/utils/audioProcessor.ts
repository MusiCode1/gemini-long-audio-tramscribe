import { isBrowser } from './env.js';
import * as browserProcessor from './audioProcessor.browser.js';
import * as nodeProcessor from './audioProcessor.node.js';
import { AudioSource } from './audioProcessor.browser.js';

// ייצוא מחדש של הממשק המשותף כדי שיהיה זמין מנקודה אחת
export type { AudioSource };

// הגדרת סוג הפונקציה המשותף
type ChunkAndStoreAudioFn = (
    audioSource: AudioSource,
    onProgress: (message: string) => void
) => Promise<{ totalChunks: number }>;

let chunkAndStoreAudio: ChunkAndStoreAudioFn;

// בחירת המימוש הנכון בזמן ריצה
if (isBrowser) {
    browserProcessor.createAudioContext();
    chunkAndStoreAudio = browserProcessor.chunkAndStoreAudio;
    
} else {
    chunkAndStoreAudio = nodeProcessor.chunkAndStoreAudio;
}

// ייצוא הפונקציה שנבחרה
export { chunkAndStoreAudio };
