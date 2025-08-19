
import React, { useState, useCallback, useRef } from 'react';
import { UploadIcon } from './Icons';

// הגדרת מאפייני הרכיב
interface FileUploadProps {
  onFileUpload: (file: File) => void; // פונקציה שתופעל כאשר המשתמש מעלה קובץ תקין
}

// רשימת סוגי הקבצים הנתמכים (MIME types)
const SUPPORTED_FORMATS = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/flac', 'audio/mp3'];

/**
 * רכיב המאפשר למשתמש להעלות קובץ אודיו,
 * הן על ידי בחירה מסייר הקבצים והן על ידי גרירה ושחרור (Drag and Drop).
 */
const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload }) => {
  const [isDragging, setIsDragging] = useState(false); // מצב המציין אם המשתמש גורר קובץ מעל האזור
  const [error, setError] = useState<string | null>(null); // הודעת שגיאה למשתמש
  const fileInputRef = useRef<HTMLInputElement>(null); // רפרנס לרכיב ה-input הנסתר

  // פונקציה מרכזית לטיפול בקובץ שהועלה
  const handleFile = useCallback((file: File | null) => {
    if (!file) return;
    
    // בדיקה אם פורמט הקובץ נתמך
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      setError(`פורמט קובץ לא נתמך. אנא העלה MP3, WAV, M4A, או FLAC.`);
      return;
    }
    
    setError(null); // ניקוי הודעת שגיאה קודמת
    onFileUpload(file); // הפעלת ה-callback עם הקובץ התקין
  }, [onFileUpload]);

  // הנדלרים של אירועי גרירה ושחרור
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);
  
  // הנדלר של שינוי ברכיב ה-input (כאשר המשתמש בוחר קובץ)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  // פתיחת סייר הקבצים בלחיצה על אזור ההעלאה
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`w-full p-10 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-300
          ${isDragging ? 'border-indigo-400 bg-gray-700/50' : 'border-gray-600 hover:border-indigo-500 hover:bg-gray-700/30'}`}
      >
        <div className="flex flex-col items-center justify-center text-center">
          <UploadIcon className="w-12 h-12 text-gray-400 mb-4" />
          <p className="font-semibold text-lg text-gray-200">גרור ושחרר את קובץ האודיו שלך כאן</p>
          <p className="text-gray-400">או</p>
          <button
            type="button"
            className="mt-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md font-semibold transition-colors"
          >
            בחר קובץ
          </button>
          {/* רכיב ה-input האמיתי, מוסתר מהמשתמש */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleInputChange}
            accept={SUPPORTED_FORMATS.join(',')}
            className="hidden"
          />
        </div>
      </div>
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      <p className="text-xs text-gray-500">פורמטים נתמכים: MP3, WAV, M4A, FLAC</p>
    </div>
  );
};

export default FileUpload;
