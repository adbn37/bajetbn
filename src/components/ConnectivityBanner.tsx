import { useEffect, useState } from 'react';

export function ConnectivityBanner() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const markOnline = () => setOnline(true);
    const markOffline = () => setOnline(false);
    window.addEventListener('online', markOnline);
    window.addEventListener('offline', markOffline);
    return () => {
      window.removeEventListener('online', markOnline);
      window.removeEventListener('offline', markOffline);
    };
  }, []);

  if (online) return null;
  return (
    <div className="connectivity-banner" role="status" aria-live="polite">
      <strong>You are offline.</strong>
      <span>You can open the app, but you need internet to load or save money information.</span>
    </div>
  );
}
