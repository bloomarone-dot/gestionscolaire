import { useEffect, useState } from 'react';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

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

  if (!offline) return null;

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: '#7c3aed',
        color: '#fff',
        padding: '10px 16px',
        textAlign: 'center',
        fontSize: '0.9rem',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.15)',
      }}
    >
      Connexion internet coupée — vos saisies en cours sont conservées localement.
      Reconnectez-vous pour enregistrer sur le serveur.
    </div>
  );
}
