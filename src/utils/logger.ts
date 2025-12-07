
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
