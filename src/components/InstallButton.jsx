import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const LOGO_URL = 'https://media.base44.com/images/public/6a9342ffbeff8b7c5a7bff8a/7b63e08e9_generated_image.png';

export default function InstallButton({ className, variant = 'outline', size = 'sm' }) {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (standalone) setInstalled(true);
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!deferred || installed) return null;

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={async () => {
        deferred.prompt();
        try { await deferred.userChoice; } catch {}
        setDeferred(null);
      }}
    >
      <img src={LOGO_URL} alt="Vision Cortex" className="w-5 h-5 rounded" /> Install app
    </Button>
  );
}