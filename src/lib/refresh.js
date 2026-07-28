import { useEffect } from 'react';

// O "+" global cria coisas de qualquer tela. Quem já está montado precisa
// saber que o conteúdo mudou — sem isso a pessoa adiciona e "não acontece nada".
const DATA_EVENT = 'chamego:data-changed';

export function notifyDataChanged() {
  window.dispatchEvent(new Event(DATA_EVENT));
}

export function useDataRefresh(handler) {
  useEffect(() => {
    window.addEventListener(DATA_EVENT, handler);
    return () => window.removeEventListener(DATA_EVENT, handler);
  }, [handler]);
}
