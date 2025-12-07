import { isBrowser } from './env';


// הגדרת סוגי הפונקציות המשותפים
type SaveChunkFn = (key: number, chunkBlob: Blob, fileName: string) => Promise<void>;
type GetChunkFn = (key: number) => Promise<File | undefined>;
type ClearAllChunksFn = () => Promise<void>;
type SaveChunkResultFn = (key: number, audioFile: File, transcript: string) => Promise<void>;
type ClearAllResultsFn = () => Promise<void>;


// הצהרה על המשתנים שיחזיקו את הפונקציות הנכונות
let saveChunk: SaveChunkFn;
let getChunk: GetChunkFn;
let clearAllChunks: ClearAllChunksFn;
let saveChunkResult: SaveChunkResultFn;
let clearAllResults: ClearAllResultsFn | undefined; // Optional, as node doesn't need it
import * as browserStorage from './storage.browser';
import * as nodeStorage from './storage.node';
// בחירת המימוש הנכון בזמן ריצה
if (isBrowser) {
  import('./storage.browser').then((storageBrowser) => {
    saveChunk = storageBrowser.saveChunk;
    getChunk = storageBrowser.getChunk;
    clearAllChunks = storageBrowser.clearAllChunks;
    saveChunkResult = storageBrowser.saveChunkResult;
    clearAllResults = storageBrowser.clearAllResults;
  });

} else {

  import('./storage.node').then((storageNode) => {
    saveChunk = storageNode.saveChunk;
    getChunk = storageNode.getChunk;
    clearAllChunks = storageNode.clearAllChunks;
    saveChunkResult = storageNode.saveChunkResult;
    // In node, clearAllChunks handles everything, so clearAllResults is a no-op
    clearAllResults = () => Promise.resolve();
  });

}

// ייצוא הפונקציות שנבחרו
export { saveChunk, getChunk, clearAllChunks, saveChunkResult, clearAllResults };
