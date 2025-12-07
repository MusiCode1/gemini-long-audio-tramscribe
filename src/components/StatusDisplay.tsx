import React from 'react';
import { TranscriptionProgress, ProcessingState } from '../types';
import { FileIcon, ClockIcon, BrainIcon, CloudUploadIcon } from './Icons';

// הגדרת מאפייני הרכיב
interface StatusDisplayProps {
  progress: TranscriptionProgress; // אובייקט ההתקדמות המלא
  fileName: string; // שם הקובץ המעובד
}

/**
 * רכיב המציג למשתמש את הסטטוס הנוכחי של תהליך התמלול,
 * כולל הודעות, שם הקובץ וסרגל התקדמות.
 */
const StatusDisplay: React.FC<StatusDisplayProps> = ({ progress, fileName }) => {
  const { state, message, currentChunk, totalChunks } = progress;

  // פונקציה לבחירת האייקון המתאים לפי מצב התהליך
  const getIcon = () => {
    switch (state) {
      case ProcessingState.PREPARING:
        return <ClockIcon className="w-8 h-8 text-yellow-400" />;
      case ProcessingState.UPLOADING:
        return <CloudUploadIcon className="w-8 h-8 text-blue-400 animate-pulse" />;
      case ProcessingState.TRANSCRIBING:
        return <BrainIcon className="w-8 h-8 text-purple-400 animate-pulse" />;
      default:
        return <ClockIcon className="w-8 h-8 text-gray-400" />;
    }
  };

  const showOverallProgress = (state === ProcessingState.UPLOADING || state === ProcessingState.TRANSCRIBING) && totalChunks && currentChunk;
  // חישוב אחוז ההתקדמות עבור סרגל ההתקדמות (מייצג מקטעים שהושלמו)
  const progressPercentage = totalChunks && currentChunk ? ((currentChunk - 1) / totalChunks) * 100 : 0;

  return (
    <div className="w-full flex flex-col items-center space-y-6">
      <div className="flex items-center space-x-4 space-x-reverse">
        {getIcon()}
        <h2 className="text-2xl font-semibold text-gray-100">{message}</h2>
      </div>

      <div className="w-full bg-gray-700 rounded-lg p-4 border border-gray-600 space-y-4">
        <div className="flex items-center space-x-3 space-x-reverse text-sm">
          <FileIcon className="w-5 h-5 text-gray-400" />
          <span className="font-mono text-gray-300 truncate">{fileName}</span>
        </div>
        
        {/* הצגת סרגל התקדמות כללי */}
        {showOverallProgress && (
          <div className="w-full space-y-1">
            <div className="flex justify-between text-xs font-medium text-gray-400">
              <span>התקדמות כללית</span>
              <span>{`מקטע ${currentChunk} מתוך ${totalChunks}`}</span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2.5">
                <div
                    className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progressPercentage}%` }}
                ></div>
            </div>
          </div>
        )}

        {/* חיווי מיוחד עבור שלב ההעלאה */}
        {state === ProcessingState.UPLOADING && (
            <div className="w-full pt-2">
                <p className="text-sm text-center text-gray-300 mb-2">מעלה את המקטע הנוכחי...</p>
                <div className="w-full bg-gray-600 rounded-full h-2 overflow-hidden relative">
                    <div className="bg-purple-500 h-full w-1/3 absolute top-0 rounded-full animate-indeterminate"></div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default StatusDisplay;