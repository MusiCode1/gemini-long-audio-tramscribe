import { isBrowser, isNode } from './env'; // <-- ייבוא כלי העזר


import { debugLog } from './logger';

import "fake-indexeddb/auto";
import { AudioContext } from 'web-audio-api';
import { indexedDB } from "fake-indexeddb";


// הדפסת הסביבה הנוכחית בעת טעינת המודול
if (isBrowser) {
    debugLog('Code is running in a Browser environment.');
} else if (isNode) {
    debugLog('Code is running in a Node.js (Server) environment.');
}

if (!isBrowser) {
    global.AudioContext || (global.AudioContext = AudioContext);
    global.indexedDB || (global.indexedDB = indexedDB);
}