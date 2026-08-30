import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
      <Download className="w-3.5 h-3.5" /> Install app
    </Button>
  );
}