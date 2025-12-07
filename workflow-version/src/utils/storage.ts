import { isBrowser } from './env.js';
import * as browserStorage from './storage.browser.js';
import * as nodeStorage from './storage.node.js';

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

// בחירת המימוש הנכון בזמן ריצה
if (isBrowser) {
  saveChunk = browserStorage.saveChunk;
  getChunk = browserStorage.getChunk;
  clearAllChunks = browserStorage.clearAllChunks;
  saveChunkResult = browserStorage.saveChunkResult;
  clearAllResults = browserStorage.clearAllResults;

} else {

  saveChunk = nodeStorage.saveChunk;
  getChunk = nodeStorage.getChunk;
  clearAllChunks = nodeStorage.clearAllChunks;
  saveChunkResult = nodeStorage.saveChunkResult;
  // In node, clearAllChunks handles everything, so clearAllResults is a no-op
  clearAllResults = () => Promise.resolve();
}

// ייצוא הפונקציות שנבחרו
export { saveChunk, getChunk, clearAllChunks, saveChunkResult, clearAllResults };
