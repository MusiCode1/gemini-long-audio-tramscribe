
import React, { useState } from 'react';
import { CopyIcon, DownloadIcon, CheckIcon } from './Icons';

// הגדרת מאפייני הרכיב
interface ResultDisplayProps {
  text: string; // טקסט התמלול הסופי
  fileName: string; // שם הקובץ המקורי, עבור יצירת שם קובץ להורדה
  onReset: () => void; // פונקציה לאיפוס האפליקציה והתחלת תהליך חדש
}

/**
 * רכיב המציג את התמלול הסופי למשתמש
 * ומספק פעולות כמו העתקה, הורדה והתחלה מחדש.
 */
const ResultDisplay: React.FC<ResultDisplayProps> = ({ text, fileName, onReset }) => {
  const [copied, setCopied] = useState(false); // מצב המציין אם הטקסט הועתק

  // פונקציה להעתקת הטקסט ללוח (clipboard)
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    // איפוס מצב ה"הועתק" לאחר 2 שניות
    setTimeout(() => setCopied(false), 2000);
  };

  // פונקציה להורדת התמלול כקובץ Markdown
  const handleDownload = () => {
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // יצירת שם קובץ להורדה על בסיס שם הקובץ המקורי, עם סיומת .md
    const downloadFileName = fileName ? `${fileName.split('.').slice(0, -1).join('.') || fileName}.md` : 'transcription.md';
    a.download = downloadFileName;
    document.body.appendChild(a);
    a.click(); // סימולציה של לחיצה על הקישור כדי להתחיל את ההורדה
    document.body.removeChild(a);
    URL.revokeObjectURL(url); // שחרור ה-URL מהזיכרון
  };

  return (
    <div className="w-full flex flex-col">
      <h2 className="text-2xl font-semibold mb-4 text-center">התמלול שלך מוכן</h2>
      <div className="relative w-full">
        <textarea
          readOnly
          value={text}
          className="w-full h-96 p-4 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 font-mono text-sm leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          placeholder="התמלול יופיע כאן..."
        />
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
        <button
          onClick={handleCopy}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-md font-semibold transition-colors"
        >
          {copied ? <CheckIcon className="w-5 h-5 text-green-400" /> : <CopyIcon className="w-5 h-5" />}
          {copied ? 'הועתק!' : 'העתק טקסט'}
        </button>
        <button
          onClick={handleDownload}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-md font-semibold transition-colors"
        >
          <DownloadIcon className="w-5 h-5" />
          הורד כקובץ Markdown
        </button>
        <button
          onClick={onReset}
          className="w-full sm:w-auto px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md font-semibold transition-colors"
        >
          תמלל קובץ חדש
        </button>
      </div>
    </div>
  );
};

export default ResultDisplay;