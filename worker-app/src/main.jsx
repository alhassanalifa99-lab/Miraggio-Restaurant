import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App';
import './index.css';

// In production, set VITE_API_URL (in Vercel's project env vars) to your
// deployed backend's URL, e.g. https://miraggio-backend.up.railway.app
// In local dev, this is left unset and Vite's proxy (vite.config.js) handles
// forwarding /api requests to localhost:3001 instead.
if (import.meta.env.VITE_API_URL) {
  axios.defaults.baseURL = import.meta.env.VITE_API_URL;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
