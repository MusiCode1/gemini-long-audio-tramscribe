import './utils/polyfill';
import React, { useState, useCallback, useEffect } from 'react';
import { ProcessingState, TranscriptionProgress } from './types';
import FileUpload from './components/FileUpload';
import StatusDisplay from './components/StatusDisplay';
import ResultDisplay from './components/ResultDisplay';
import { transcribeAudioFile } from './services/gemini';
import LogViewer from './components/LogViewer';
import { clearAllChunks } from './utils/storage';
import { debugLog } from './utils/logger';
import PromptEditor from './components/PromptEditor';
import { EditIcon } from './components/Icons';

const LOCAL_STORAGE_PROMPT_KEY = 'customTranscriptionPrompt';

// הקומפוננטה הראשית של האפליקציה.
// היא מנהלת את המצב הכללי, מתזמרת את תהליך התמלול ומציגה את הרכיבים המתאימים.
const App: React.FC = () => {
  // ניהול מצב ההתקדמות של התמלול
  const [progress, setProgress] = useState<TranscriptionProgress>({
    state: ProcessingState.IDLE,
    message: 'מוכן להתחיל',
  });
  // התוצאה הסופית של התמלול
  const [result, setResult] = useState<string>('');
  // שם הקובץ המעובד
  const [fileName, setFileName] = useState<string>('');
  // הפרומפט (הוראות) שיישלח ל-Gemini
  const [transcriptionPrompt, setTranscriptionPrompt] = useState<string>('');
  // מערך ההודעות שיוצגו ביומן הפעילות
  const [logMessages, setLogMessages] = useState<string[]>([]);
  // הטקסט החי המוזרם מה-API ומוצג ביומן
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  // מצב עריכת הפרומפט
  const [isEditingPrompt, setIsEditingPrompt] = useState<boolean>(false);

  // פונקציה להוספת הודעה ליומן הפעילות בממשק המשתמש
  const addLog = useCallback((message: string) => {
    debugLog('Adding to UI Log:', message);
    setLogMessages(prev => [...prev, message]);
  }, []);
  
  // פונקציה לטעינת פרומפט ברירת המחדל מהקובץ
  const fetchDefaultPrompt = useCallback(() => {
    debugLog('Fetching default transcription prompt...');
    return fetch('/prompts/transcribe.md')
      .then(response => {
        if (!response.ok) {
          throw new Error(`שגיאת רשת: ${response.statusText}`);
        }
        return response.text();
      })
      .then(text => {
        debugLog('Default transcription prompt fetched successfully.');
        return text;
      });
  }, []);


  // Hook שרץ פעם אחת כשהרכיב נטען, כדי לטעון את פרומפט התמלול
  useEffect(() => {
    debugLog('Component mounted. Checking for custom prompt in localStorage...');
    try {
        const savedPrompt = localStorage.getItem(LOCAL_STORAGE_PROMPT_KEY);
        if (savedPrompt) {
            debugLog('Custom prompt found in localStorage.');
            setTranscriptionPrompt(savedPrompt);
        } else {
            debugLog('No custom prompt found, fetching default.');
            fetchDefaultPrompt().then(setTranscriptionPrompt);
        }
    } catch (error) {
        console.error('Failed to access localStorage, fetching default prompt:', error);
        debugLog('Failed to access localStorage, fetching default prompt:', error);
        fetchDefaultPrompt().then(setTranscriptionPrompt);
    }
  }, [fetchDefaultPrompt]);
  
  // טיפול בשמירת הפרומפט הערוך
  const handleSavePrompt = useCallback((newPrompt: string) => {
    debugLog('Saving custom prompt.');
    setTranscriptionPrompt(newPrompt);
    try {
        localStorage.setItem(LOCAL_STORAGE_PROMPT_KEY, newPrompt);
        addLog('הוראות המערכת עודכנו בהצלחה.');
    } catch (error) {
        console.error('Failed to save prompt to localStorage:', error);
        addLog('שגיאה בשמירת ההוראות. השינויים יהיו זמניים בלבד.');
    }
    setIsEditingPrompt(false);
  }, [addLog]);

  // טיפול בשחזור פרומפט ברירת המחדל
  const handleRestoreDefaultPrompt = useCallback(async () => {
    debugLog('Restoring default prompt.');
    try {
        const defaultPrompt = await fetchDefaultPrompt();
        setTranscriptionPrompt(defaultPrompt);
        localStorage.removeItem(LOCAL_STORAGE_PROMPT_KEY);
        addLog('הוראות המערכת שוחזרו לברירת המחדל.');
    } catch (error) {
        console.error('Failed to restore default prompt:', error);
        addLog('שגיאה בשחזור הוראות ברירת המחדל.');
    }
  }, [addLog, fetchDefaultPrompt]);

  // פונקציה לאיפוס מלא של מצב האפליקציה
  const handleReset = useCallback(async () => {
    debugLog('Resetting application state...');
    await clearAllChunks(); // ניקוי אחסון המקטעים
    addLog("איפוס המערכת וניקוי המקטעים.");
    const promptStillLoaded = !!transcriptionPrompt;
    // איפוס כל משתני המצב לערכים ההתחלתיים שלהם
    setProgress({
        state: promptStillLoaded ? ProcessingState.IDLE : ProcessingState.ERROR,
        message: promptStillLoaded ? 'מוכן להתחיל' : 'שגיאה בטעינת הוראות התמלול.',
        error: promptStillLoaded ? undefined : 'לא ניתן היה לטעון את קובץ ההוראות. אנא רענן את הדף ונסה שוב.'
    });
    setResult('');
    setFileName('');
    setLogMessages([]);
    setLiveTranscript('');
    setIsEditingPrompt(false);
    debugLog('Application state reset complete.');
  }, [transcriptionPrompt, addLog]);

  // הפונקציה המרכזית שמטפלת בהעלאת קובץ ומתחילה את תהליך התמלול
  const handleFileUpload = useCallback(async (file: File) => {
    debugLog('File upload initiated.', { name: file.name, size: file.size, type: file.type });
    if (!transcriptionPrompt) {
      debugLog('Upload blocked: transcription prompt not loaded yet.');
      setProgress({
        state: ProcessingState.ERROR,
        message: 'ההוראות עדיין בטעינה.',
        error: 'אנא המתן רגע ונסה להעלות את הקובץ שוב.',
      });
      return;
    }

    await handleReset(); // איפוס המצב לפני התחלת תהליך חדש
    setFileName(file.name);
    addLog(`התחלת עיבוד הקובץ: ${file.name}`);

    // Callback שמועבר לשירות התמלול כדי לקבל עדכוני התקדמות
    const progressCallback = (update: TranscriptionProgress) => {
      setProgress(prevProgress => {
        // הוספת הודעות חדשות ליומן רק פעם אחת
        if (prevProgress.message !== update.message && !update.streamedChunkText) {
          addLog(update.message);
        }
        
        // זיהוי מעבר למקטע חדש כדי לאפס את תצוגת הטקסט החי
        const isNewChunk = prevProgress.currentChunk !== update.currentChunk;
        
        if (isNewChunk) {
            debugLog(`New chunk detected. Old: ${prevProgress.currentChunk}, New: ${update.currentChunk}. Resetting live transcript.`);
            setLiveTranscript(update.streamedChunkText || '');
        } else if (update.streamedChunkText) {
            // לוגיקה זו מטפלת בעדכוני סטרימינג על ידי הצגת הטקסט המצטבר
            setLiveTranscript(currentLive => {
                if (update.streamedChunkText && update.streamedChunkText.startsWith(currentLive)) {
                    return update.streamedChunkText;
                }
                // גיבוי למקרה שהסטרים לא מגיע בסדר הצפוי
                return currentLive + (update.streamedChunkText || '');
            });
        }
        
        return update; // עדכון מצב ההתקדמות הכללי
      });
    };

    try {
      debugLog('Calling transcribeAudioFile service...');
      // המרת קובץ ה-File ל-AudioSource שירות התמלול מצפה לקבל
      const arrayBuffer = await file.arrayBuffer();
      const audioSource = {
        arrayBuffer: arrayBuffer,
        fileName: file.name,
        mimeType: file.type,
      };
      debugLog('Created AudioSource object from File.', audioSource);

      // קריאה לשירות התמלול עם ה-AudioSource, הפרומפט ופונקציית ה-callback
      const finalTranscript = await transcribeAudioFile(
        audioSource,
        transcriptionPrompt,
        progressCallback
      );
      debugLog('transcribeAudioFile service finished successfully.');

      const markdownOutput = `# תמלול הקובץ: ${file.name}\n\n${finalTranscript}`;
      setResult(markdownOutput);
      setProgress({ state: ProcessingState.COMPLETE, message: 'התמלול הושלם בהצלחה!' });
      addLog("התמלול הושלם!");

    } catch (error) {
      console.error('An error occurred during transcription:', error);
      debugLog('Error caught in handleFileUpload:', error);
      const errorMessage = error instanceof Error ? error.message : 'שגיאה לא ידועה.';
      addLog(`שגיאה: ${errorMessage}`);
      setProgress({
        state: ProcessingState.ERROR,
        message: 'אופס! משהו השתבש.',
        error: errorMessage,
      });
    } finally {
        debugLog('Transcription process finished, resetting live transcript.');
        // איפוס תצוגת הטקסט החי בסיום התהליך (הצלחה או כישלון)
        setLiveTranscript('');
    }
  }, [transcriptionPrompt, addLog, handleReset]);

  // לוגיקה לקביעת אילו חלקים של הממשק להציג בהתבסס על המצב הנוכחי
  const showStatus = progress.state !== ProcessingState.IDLE && progress.state !== ProcessingState.COMPLETE && progress.state !== ProcessingState.ERROR;
  const showResult = progress.state === ProcessingState.COMPLETE || (progress.state === ProcessingState.ERROR && result);
  const showErrorBlock = progress.state === ProcessingState.ERROR && !result;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center text-center">
        <header className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
            מערכת תמלול אודיו
          </h1>
          <p className="text-gray-400 mt-2 text-lg">
            העלה קובץ אודיו ארוך וקבל תמלול מדויק בעזרת Gemini
          </p>
        </header>

        <main className="w-full bg-gray-800/50 rounded-2xl shadow-2xl p-6 md:p-8 border border-gray-700 backdrop-blur-sm">
          {/* תצוגה ראשית במצב התחלתי */}
          {progress.state === ProcessingState.IDLE && (
            isEditingPrompt ? (
                <PromptEditor
                    initialPrompt={transcriptionPrompt}
                    onSave={handleSavePrompt}
                    onCancel={() => setIsEditingPrompt(false)}
                    onRestoreDefault={handleRestoreDefaultPrompt}
                />
            ) : (
                <>
                    <FileUpload onFileUpload={handleFileUpload} />
                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setIsEditingPrompt(true)}
                            className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors flex items-center justify-center gap-2 mx-auto"
                        >
                            <EditIcon className="w-5 h-5" />
                            <span>ערוך הוראות מערכת (פרומפט)</span>
                        </button>
                    </div>
                </>
            )
          )}

          {/* תצוגת סטטוס והתקדמות בזמן עיבוד */}
          {showStatus && (
             <>
                <StatusDisplay progress={progress} fileName={fileName} />
                <LogViewer logs={logMessages} liveTranscript={liveTranscript} />
             </>
          )}

          {/* תצוגת התוצאה הסופית */}
          {showResult && (
            <ResultDisplay text={result} fileName={fileName} onReset={handleReset} />
          )}
          
          {/* תצוגת שגיאה */}
          {showErrorBlock && (
             <div className="mt-6 text-center">
                <p className="text-red-400 font-semibold">{progress.message}</p>
                <p className="text-red-500 mt-1">{progress.error}</p>
                <LogViewer logs={logMessages} liveTranscript={liveTranscript}/>
                <button
                    onClick={handleReset}
                    className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md font-semibold transition-colors"
                >
                    נסה שוב
                </button>
             </div>
          )}
        </main>
      </div>
       <footer className="mt-8 text-gray-500 text-sm">
        <p>מופעל על ידי Gemini API</p>
      </footer>
    </div>
  );
};

export default App;