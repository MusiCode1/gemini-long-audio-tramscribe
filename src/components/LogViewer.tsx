
import React, { useEffect, useRef } from 'react';

// הגדרת מאפייני הרכיב
interface LogViewerProps {
  logs: string[]; // מערך הודעות היומן
  liveTranscript?: string; // הטקסט החי שמתקבל מהסטרימינג
}

/**
 * רכיב המציג למשתמש יומן פעילות מתעדכן וטקסט מוזרם בזמן אמת.
 */
const LogViewer: React.FC<LogViewerProps> = ({ logs, liveTranscript }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Hook שרץ בכל פעם שהלוגים או הטקסט החי מתעדכנים.
  // הוא גורם לחלון היומן להיגלל אוטומטית לתחתית כדי שהמשתמש יראה תמיד את העדכון האחרון.
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, liveTranscript]);

  return (
    <div className="w-full mt-6">
      <h3 className="text-lg font-semibold text-gray-300 mb-2 text-center">יומן פעילות</h3>
      <div
        ref={logContainerRef}
        className="w-full h-48 bg-gray-900/80 border border-gray-700 rounded-lg p-4 font-mono text-sm text-gray-400 overflow-y-auto whitespace-pre-wrap"
        aria-live="polite" // מאפיין נגישות שמודיע לקוראי מסך על עדכונים
        aria-atomic="false"
        aria-relevant="additions"
      >
        {/* הצגת הודעות היומן הקבועות */}
        {logs.map((log, index) => (
          <div key={index} className="mb-1 last:mb-0">
            <span className="text-indigo-400 select-none mr-2">{'>'}</span>
            <span>{log}</span>
          </div>
        ))}

        {/* הצגת אזור הטקסט המוזרם בזמן אמת, רק אם קיים */}
        {liveTranscript && (
          <div className="pt-2 mt-2 border-t border-gray-700/50">
            <span className="text-purple-400 select-none mr-2">{'>'}</span>
            <span className="text-gray-300">{liveTranscript}</span>
            {/* סמן מהבהב המדמה כתיבה */}
            <span className="inline-block w-2 h-4 bg-purple-400 animate-pulse ml-1"></span>
          </div>
        )}

        {/* הודעת ברירת מחדל כאשר היומן ריק */}
        {logs.length === 0 && !liveTranscript && <p className="text-gray-500">הפעילות תופיע כאן...</p>}
      </div>
    </div>
  );
};

export default LogViewer;
