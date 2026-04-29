import { isBrowser, isNode } from './env'; // <-- ייבוא כלי העזר
import { config } from 'dotenv'; // טעינת משתני סביבה מקובץ .env

import { debugLog } from './logger';

// הדפסת הסביבה הנוכחית בעת טעינת המודול
if (isBrowser) {
    debugLog('Code is running in a Browser environment.');
} else if (isNode) {
    debugLog('Code is running in a Node.js/Bun (Server) environment.');
}




// אין יותר צורך בפוליפילים גלובליים.
// המplementationים הנפרדים מטפלים בהבדלי הסביבות.

if (!isBrowser) {

    const { join } = await import('node:path');

    config({ path: join(import.meta.dirname, '..', '..', '.env') }); // התאמה לנתיב היחסי בקבצי ES Modules


    process.env.API_KEY = process.env.API_KEY || import.meta.env.VITE_API_KEY;

    globalThis.AudioContext || ((globalThis.AudioContext as any) = class {
        constructor(contextOptions?: AudioContextOptions) {
            throw new Error("AudioContext is not supported in Node.js. Please use a browser environment.");
        }
    });

    globalThis.webkitAudioContext || ((globalThis as any).webkitAudioContext = class {
        constructor() {
            throw new Error("webkitAudioContext is not supported in Node.js. Please use a browser environment.");
        }
    });

    globalThis.indexedDB || ((globalThis as any).indexedDB = {
        open: () => {
            throw new Error("indexedDB is not supported in Node.js. Please use a browser environment.");
        }
    });
} else {
    // @ts-ignore
    globalThis.process || (globalThis.process = {});
    globalThis.process.env ?
        globalThis.process.env.API_KEY = import.meta.env.VITE_API_KEY :
        (globalThis.process.env = {
            API_KEY: import.meta.env.VITE_API_KEY,
        });
}