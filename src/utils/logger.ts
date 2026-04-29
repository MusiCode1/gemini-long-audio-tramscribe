
import { DEBUG_MODE } from '../constants';

/**
 * Logs messages to the console only when DEBUG_MODE is true.
 * This helps keep the console clean in production while providing rich
 * debugging information during development.
 * @param args - The values to log to the console.
 *
 * רושמת הודעות לקונסולה רק כאשר DEBUG_MODE מופעל (true).
 * זה עוזר לשמור על קונסולה נקייה בסביבת פרודקשן, תוך מתן מידע עשיר
 * לדיבוג במהלך הפיתוח.
 * @param args - הערכים שברצונך לרשום לקונסולה.
 */
export function debugLog(...args: any[]): void {
  if (DEBUG_MODE) {
    console.log('[DEBUG]', ...args);
  }
}

/**
 * Instrumentation log for debugging - prints to console AND reports to debug server
 * פונקציית לוגינג מרוכזת לצורכי דיבוג - מדפיסה לקונסול ודווחת לשרת דיבוג
 */
export function instrumentLog(params: {
  location: string;
  message: string;
  data?: any;
  hypothesisId?: string;
}): void {
  const { location, message, data, hypothesisId } = params;
  
  // Print to console with clear formatting
  console.log(`[INSTRUMENT ${location}] ${message}`, data ? data : '');
  
  // Report to debug server (non-blocking)
  const payload = {
    location,
    message,
    data,
    timestamp: Date.now(),
    sessionId: 'debug-session',
    hypothesisId
  };
  
  fetch('http://127.0.0.1:7244/ingest/1932e39f-8477-4b68-95f6-01e4bf34fe82', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(() => {}); // Silent fail if server not available
}