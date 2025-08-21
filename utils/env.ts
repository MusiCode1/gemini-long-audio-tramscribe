// filepath: utils/env.ts
/**
 * בודק אם הקוד רץ בסביבת דפדפן.
 * @returns {boolean} - true אם רץ בדפדפן, אחרת false.
 */
export const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

/**
 * בודק אם הקוד רץ בסביבת שרת (Node.js).
 * @returns {boolean} - true אם רץ ב-Node.js, אחרת false.
 */
export const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
