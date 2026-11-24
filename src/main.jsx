import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { WyshProvider } from './WyshContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <WyshProvider>
        <App />
      </WyshProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

// Register PWA Service Worker (production only)
// In dev, the cache-first service worker would serve stale source modules and break HMR,
// so remove any previously registered worker and its caches instead.
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Service Worker registration failed:', err);
      });
    });
  } else {
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((reg) => reg.unregister()));
    if ('caches' in window) {
      caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
    }
  }
}
