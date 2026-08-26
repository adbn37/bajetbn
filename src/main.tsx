import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });

      await registration.update();
      if (registration.waiting) {
        registration.waiting.postMessage('SKIP_WAITING');
      }
    } catch (error) {
      console.error('[BajetBN PWA] Service worker registration failed', error);
    }
  });
}
