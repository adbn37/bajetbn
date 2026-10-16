import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import './styles/global.css';
import './styles/design-combined-v1.css';
import './styles/design-combined-v2.css';
import './styles/design-motion-v3.css';
import './styles/design-motion-v4.css';
import './styles/design-motion-v5.css';
import './styles/design-motion-v6.css';
import './styles/design-motion-v6-stabilization.css';
import './styles/design-motion-v6-money-repair.css';
import './styles/design-stabilization-v7.css';
import './styles/design-transaction-success-v8.css';
import './styles/design-smart-category-v10.css';
import './styles/design-neon-icons-v102.css';
import './styles/design-financial-avatars-v103.css';

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
