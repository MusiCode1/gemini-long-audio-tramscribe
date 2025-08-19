// קובץ זה מגדיר את הטיפוסים והממשקים המרכזיים בשימוש באפליקציה.

/**
 * מגדיר את המצבים האפשריים של תהליך התמלול.
 */
export enum ProcessingState {
  IDLE, // המערכת ממתינה לפעולה
  PREPARING, // שלב הכנת האודיו (פענוח וחיתוך)
  UPLOADING, // שלב העלאת מקטע לשרת
  TRANSCRIBING, // שלב התמלול הפעיל מול Gemini
  COMPLETE, // התהליך הסתיים בהצלחה
  ERROR, // התרחשה שגיאה
}

/**
 * ממשק המייצג את מצב ההתקדמות של תהליך התמלול.
 * אובייקט זה מועבר בין הרכיבים כדי לעדכן את הממשק.
 */
export interface TranscriptionProgress {
  state: ProcessingState; // המצב הנוכחי של התהליך
  message: string; // הודעה למשתמש המתארת את הפעולה הנוכחית
  currentChunk?: number; // מספר המקטע הנוכחי המעובד
  totalChunks?: number; // המספר הכולל של המקטעים
  error?: string; // הודעת שגיאה במקרה של תקלה
  streamedChunkText?: string; // טקסט התמלול המוזרם בזמן אמת עבור המקטע הנוכחי
}