import { isBrowser } from './env';
import * as browserStorage from './storage.browser';
import * as nodeStorage from './storage.node';

// הגדרת סוגי הפונקציות המשותפים
type SaveChunkFn = (key: number, chunkBlob: Blob, fileName: string) => Promise<void>;
type GetChunkFn = (key: number) => Promise<File | undefined>;
type ClearAllChunksFn = () => Promise<void>;

// הצהרה על המשתנים שיחזיקו את הפונקציות הנכונות
let saveChunk: SaveChunkFn;
let getChunk: GetChunkFn;
let clearAllChunks: ClearAllChunksFn;

// בחירת המימוש הנכון בזמן ריצה
if (isBrowser) {
  saveChunk = browserStorage.saveChunk;
  getChunk = browserStorage.getChunk;
  clearAllChunks = browserStorage.clearAllChunks;

} else {

  saveChunk = nodeStorage.saveChunk;
  getChunk = nodeStorage.getChunk;
  clearAllChunks = nodeStorage.clearAllChunks;
}

// ייצוא הפונקציות שנבחרו
export { saveChunk, getChunk, clearAllChunks };
