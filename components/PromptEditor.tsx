
import React, { useState, useEffect } from 'react';

// הגדרת מאפייני הרכיב
interface PromptEditorProps {
  initialPrompt: string;
  onSave: (newPrompt: string) => void;
  onCancel: () => void;
  onRestoreDefault: () => void;
}

/**
 * רכיב המאפשר למשתמש לערוך את הוראות המערכת (פרומפט).
 */
const PromptEditor: React.FC<PromptEditorProps> = ({
  initialPrompt,
  onSave,
  onCancel,
  onRestoreDefault,
}) => {
  // מצב פנימי לעריכת הטקסט, כדי לא לעדכן את המצב הראשי בכל הקלדה
  const [editedPrompt, setEditedPrompt] = useState(initialPrompt);

  // סנכרון המצב הפנימי עם הפרומפט החיצוני (למשל, לאחר שחזור ברירת מחדל)
  useEffect(() => {
    setEditedPrompt(initialPrompt);
  }, [initialPrompt]);

  const handleSave = () => {
    onSave(editedPrompt);
  };

  return (
    <div className="w-full flex flex-col">
      <h2 className="text-2xl font-semibold mb-4 text-center">עריכת הוראות מערכת (פרומפט)</h2>
      <div className="relative w-full">
        <textarea
          value={editedPrompt}
          onChange={(e) => setEditedPrompt(e.target.value)}
          className="w-full h-96 p-4 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 font-mono text-sm leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          placeholder="הזן כאן את הוראות התמלול..."
        />
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
        <button
          onClick={handleSave}
          className="w-full sm:w-auto px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md font-semibold transition-colors"
        >
          שמור שינויים
        </button>
        <button
          onClick={onCancel}
          className="w-full sm:w-auto px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-md font-semibold transition-colors"
        >
          ביטול
        </button>
         <button
          onClick={onRestoreDefault}
          className="w-full sm:w-auto px-6 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
        >
          שחזר לברירת מחדל
        </button>
      </div>
    </div>
  );
};

export default PromptEditor;
