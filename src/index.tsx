
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// קובץ זה הוא נקודת הכניסה הראשית של האפליקציה.
// הוא אחראי על טעינת הקומפוננטה הראשית (App) והכנסתה לתוך ה-DOM של דף ה-HTML.

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
