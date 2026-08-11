import { useEffect, useState } from 'react';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [apiDown, setApiDown] = useState(false);

  useEffect(() => {
    const onOff = () => setOffline(true);
    const onOn = () => setOffline(false);
    window.addEventListener('offline', onOff);
    window.addEventListener('online', onOn);
    return () => {
      window.removeEventListener('offline', onOff);
      window.removeEventListener('online', onOn);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const checkApi = async () => {
      try {
        const res = await fetch('/health', { method: 'GET', cache: 'no-store' });
        if (active) setApiDown(!res.ok);
      } catch {
        if (active) setApiDown(true);
      }
    };
    checkApi();
    const timer = setInterval(checkApi, 20000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  if (!offline && !apiDown) return null;

  const message = offline
    ? 'Connexion internet coupée — vos saisies en cours sont conservées localement.'
    : 'Serveur indisponible. Lancez : docker compose up -d — puis rechargez (Ctrl+Shift+R).';

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: '#b45309',
        color: '#fff',
        padding: '10px 16px',
        textAlign: 'center',
        fontSize: '0.9rem',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.15)',
      }}
    >
      {message}
    </div>
  );
}
