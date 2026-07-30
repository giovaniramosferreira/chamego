import { useEffect, useState } from 'react';
import { onConnectionChange } from '../lib/api.js';
import Icon from '../ui/icons.jsx';

// Sem internet o app dizia "nenhum evento" — parecia que os dados sumiram.
// Mas o contrário também é ruim: acusar queda que não houve. Por isso a faixa
// se testa sozinha a cada 5s e some assim que o servidor responde.
export default function ConnectionBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    // O evento diz se está ONLINE; a faixa mostra o contrário disso.
    // (Sem o `!`, toda chamada bem-sucedida ligava a faixa — era o motivo de
    // ela aparecer justamente quando o app estava funcionando.)
    const off = onConnectionChange((online) => setOffline(!online));
    const voltou = () => setOffline(false);
    // `navigator.onLine` e o evento 'offline' mentem: no iOS disparam com a
    // internet funcionando (e num app instalado isso vira faixa presa na tela).
    // Quem decide é o nosso servidor responder ou não.
    const caiu = () => {
      fetch('/api/health', { cache: 'no-store' })
        .then((r) => setOffline(!r.ok))
        .catch(() => setOffline(true));
    };
    window.addEventListener('online', voltou);
    window.addEventListener('offline', caiu);
    return () => {
      off();
      window.removeEventListener('online', voltou);
      window.removeEventListener('offline', caiu);
    };
  }, []);

  // Enquanto está fora do ar, tenta de novo sozinha: ninguém deve precisar
  // recarregar a página pra faixa sumir.
  useEffect(() => {
    if (!offline) return;
    let vivo = true;
    const tentar = () => {
      fetch('/api/health', { cache: 'no-store' })
        .then((r) => { if (vivo && r.ok) setOffline(false); })
        .catch(() => {});
    };
    const t = setInterval(tentar, 5000);
    return () => { vivo = false; clearInterval(t); };
  }, [offline]);

  if (!offline) return null;
  // Em fluxo, não flutuando: empurra o conteúdo em vez de cobrir a saudação.
  return (
    <div className="pt-2">
      <div className="flex items-center gap-2.5 rounded-btn bg-ink text-[#fff8f2] px-4 py-2.5 shadow-[0_6px_18px_rgba(43,37,33,.25)]">
        <Icon name="globe" size={16} />
        <span className="flex-1 text-sm">Sem conexão — o que você registrar agora pode não salvar.</span>
        <button onClick={() => window.location.reload()} className="text-sm font-semibold text-[#f6c9b4]">Tentar</button>
      </div>
    </div>
  );
}
