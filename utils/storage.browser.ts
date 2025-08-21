import { debugLog } from './logger';

// קבועים עבור הגדרות מסד הנתונים בדפדפן
const DB_NAME = 'AudioChunksDB';
const STORE_NAME = 'audioChunks';
const DB_VERSION = 1;

// משתנה שיחזיק את ההבטחה (Promise) לחיבור למסד הנתונים (תבנית Singleton)
// זה מונע פתיחת חיבורים מרובים במקביל
let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * פונקציה לקבלת אובייקט החיבור למסד הנתונים.
 * משתמשת בתבנית Singleton כדי להבטיח שרק חיבור אחד נפתח.
 */
function getDB(): Promise<IDBDatabase> {
  if (dbPromise) {
    debugLog('Reusing existing DB connection promise.');
    return dbPromise;
  }
  debugLog('Creating new DB connection promise.');
  dbPromise = new Promise((resolve, reject) => {
    // פתיחת בקשה לחיבור למסד הנתונים
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      debugLog('IndexedDB error:', request.error);
      reject(new Error('Failed to open IndexedDB.'));
      dbPromise = null; // איפוס במקרה של שגיאה כדי לאפשר ניסיון חוזר
    };

    request.onsuccess = () => {
      debugLog('IndexedDB connection successful.');
      resolve(request.result);
    };

    // פונקציה זו רצה רק אם הגרסה של מסד הנתונים השתנתה או שהוא נוצר לראשונה
    request.onupgradeneeded = (event) => {
      debugLog('IndexedDB upgrade needed.');
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        debugLog(`Creating object store: ${STORE_NAME}`);
        db.createObjectStore(STORE_NAME); // יצירת "טבלה" לאחסון המקטעים
      }
    };
  });
  return dbPromise;
}

/**
 * שומר מקטע אודיו (כ-Blob) ושמו ב-IndexedDB.
 * @param key המפתח (מספר המקטע)
 * @param chunkBlob ה-Blob של המקטע
 * @param fileName שם הקובץ של המקטע
 */
export async function saveChunk(key: number, chunkBlob: Blob, fileName: string): Promise<void> {
  debugLog(`Attempting to save chunk to IndexedDB. Key: ${key}, Size: ${chunkBlob.size}, Name: ${fileName}`);
  const db = await getDB();
  const chunkRecord = { blob: chunkBlob, name: fileName }; // אריזת ה-Blob והשם לאובייקט אחד
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(chunkRecord, key);

    request.onsuccess = () => {
        debugLog(`Successfully saved chunk record with key: ${key}`);
        resolve();
    };
    request.onerror = () => {
        console.error('Failed to save chunk:', request.error);
        debugLog('Failed to save chunk:', request.error);
        reject(request.error);
    };
  });
}

/**
 * מאחזר מקטע אודיו מה-IndexedDB.
 * @param key המפתח (מספר המקטע)
 * @returns קובץ המקטע, או undefined אם לא נמצא.
 */
export async function getChunk(key: number): Promise<File | undefined> {
  debugLog(`Attempting to get chunk from IndexedDB. Key: ${key}`);
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => {
        const record = request.result;
        if (record && record.blob && record.name) {
            debugLog(`Successfully retrieved chunk record with key: ${key}`);
            // הרכבה מחדש של אובייקט File מה-Blob והשם
            const chunkFile = new File([record.blob], record.name, { type: record.blob.type });
            resolve(chunkFile);
        } else {
            debugLog(`Chunk record with key ${key} not found or is invalid.`);
            resolve(undefined);
        }
    };
    request.onerror = () => {
        console.error('Failed to get chunk:', request.error);
        debugLog('Failed to get chunk:', request.error);
        reject(request.error);
    };
  });
}

/**
 * מנקה את כל המקטעים מה-IndexedDB.
 */
export async function clearAllChunks(): Promise<void> {
  debugLog('Attempting to clear all chunks from IndexedDB.');
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
        debugLog('Successfully cleared all chunks.');
        resolve();
    };
    request.onerror = () => {
        console.error('Failed to clear chunks:', request.error);
        debugLog('Failed to clear chunks:', request.error);
        reject(request.error);
    };
  });
}