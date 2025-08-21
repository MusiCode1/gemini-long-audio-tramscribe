import { isBrowser, isNode } from './env'; // <-- ייבוא כלי העזר


import { debugLog } from './logger';

// הדפסת הסביבה הנוכחית בעת טעינת המודול
if (isBrowser) {
    debugLog('Code is running in a Browser environment.');
} else if (isNode) {
    debugLog('Code is running in a Node.js (Server) environment.');
}

// אין יותר צורך בפוליפילים גלובליים.
// המימושים הנפרדים מטפלים בהבדלי הסביבות.

if (!isBrowser) {
    globalThis.AudioContext|| ((globalThis.AudioContext as any) = class {
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
}