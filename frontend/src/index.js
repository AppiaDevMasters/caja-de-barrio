import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/tokens.css';
import './styles/app.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Aplica el tema guardado antes del primer render para evitar parpadeo.
try {
  const saved = localStorage.getItem('cdb.theme');
  if (saved === 'dark' || saved === 'light') document.documentElement.dataset.theme = saved;
} catch {
  /* sin acceso a localStorage */
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
