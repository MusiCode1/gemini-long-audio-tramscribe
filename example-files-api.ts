
import { GoogleGenAI } from '@google/genai';

// זהו קובץ דוגמה והדגמה, שאינו חלק מהאפליקציה הראשית.
// מטרתו היא לבדוק ולהדגים שימוש בסיסי ב-File API של Gemini.
(async () => {

  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });


  const geminiFiles = ai.files;

  // יצירת קובץ דמה
  const file = {
    config: {
      name: 'file1',
      mimeType: 'audio/wav'
    },
    file: new Blob([], { type: 'audio/wav' })
  }

  // העלאת הקובץ
  const response = await geminiFiles.upload(file);

  // הדפסת ה-URI של הקובץ שהועלה
  console.log(response.uri);

})();
