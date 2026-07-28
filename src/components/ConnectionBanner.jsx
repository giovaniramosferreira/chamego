import { useEffect, useState } from 'react';
import { onConnectionChange } from '../lib/api.js';
import Icon from '../ui/icons.jsx';

// Sem internet o app dizia "nenhum evento" — parecia que os dados sumiram.
// Agora a falha aparece como falha, e some sozinha quando a rede volta.
export default function ConnectionBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const off = onConnectionChange(setOffline);
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      off();
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;
  return (
    <div className="fixed top-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-[430px] px-4 pt-[max(env(safe-area-inset-top),8px)]">
      <div className="flex items-center gap-2.5 rounded-btn bg-ink text-[#fff8f2] px-4 py-2.5 shadow-[0_6px_18px_rgba(43,37,33,.25)]">
        <Icon name="globe" size={16} />
        <span className="flex-1 text-sm">Sem conexão — o que você registrar agora pode não salvar.</span>
        <button onClick={() => window.location.reload()} className="text-sm font-semibold text-[#f6c9b4]">Tentar</button>
      </div>
    </div>
  );
}
