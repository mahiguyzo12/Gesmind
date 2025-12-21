import React from 'react';
import ReactDOM from 'react-dom/client';
import AuthGate from './AuthGate';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

// Service Worker Registration for PWA support
// This works in tandem with Native shells. If running in browser, it caches assets.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/serviceWorker.ts')
      .then((registration) => {
        console.log(
          'StockMind PWA ServiceWorker registered: ',
          registration.scope
        );
      })
      .catch((error) => {
        console.log('StockMind PWA ServiceWorker registration failed: ', error);
      });
  });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthGate />
  </React.StrictMode>
);
