
// קובץ זה מרכז את כל הקבועים והגדרות התצורה של האפליקציה.

/**
 * משך הזמן בדקות של כל מקטע אודיו.
 * קבצים ארוכים יותר יפוצלו למקטעים באורך זה.
 */
export const CHUNK_DURATION_MIN = 20;

/**
 * משך הזמן בדקות של החפיפה בין כל שני מקטעים.
 * החפיפה חיונית כדי לאפשר איחוי (stitching) מדויק של התמלולים.
 */
export const OVERLAP_DURATION_MIN = 0.5;

/**
 * Enables or disables detailed console logging for debugging purposes.
 * Set to `true` to see every step of the process in the console.
 * Set to `false` for production or normal use.
 * 
 * מאפשר או משבית הדפסת לוגים מפורטים לקונסולה למטרות דיבוג.
 * יש להגדיר ל-`true` כדי לראות כל שלב בתהליך בקונסולה.
 * יש להגדיר ל-`false` לסביבת פרודקשן או שימוש רגיל.
 */
export const DEBUG_MODE = true;
