import { useEffect, useState } from 'react';

// No iPhone, abrir o teclado **não** encolhe a página. Ele encolhe só a
// "viewport visual" — a janelinha por onde se enxerga. Quem está com
// `position: fixed` no rodapé continua exatamente onde estava: atrás do
// teclado. É por isso que dá pra digitar sem ver o que se digita.
//
// Quem sabe o tamanho do teclado é o `visualViewport`, e é ele que a gente
// escuta. Sem essa API (navegador antigo), devolve 0 e nada muda — o layout
// volta a ser o de antes, nunca pior.

const MINIMO = 80; // abaixo disso é barra do navegador aparecendo/sumindo

/**
 * Quanto da janela está escondido embaixo. Pura pra ser testável sem navegador
 * — é uma conta de três números, e é onde mora todo o risco desta feature.
 */
export function alturaEscondida(alturaDaJanela, viewport) {
  if (!viewport) return 0;
  const escondido = alturaDaJanela - viewport.height - (viewport.offsetTop || 0);
  return escondido > MINIMO ? Math.round(escondido) : 0;
}

export function useAlturaDoTeclado() {
  const [altura, setAltura] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;

    // O que sobrou embaixo, fora do campo de visão, é o teclado.
    const medir = () => setAltura(alturaEscondida(window.innerHeight, vv));

    medir();
    vv.addEventListener('resize', medir);
    vv.addEventListener('scroll', medir);
    return () => {
      vv.removeEventListener('resize', medir);
      vv.removeEventListener('scroll', medir);
    };
  }, []);

  return altura;
}

// O campo que ganhou o foco precisa entrar no campo de visão. O atraso não é
// frescura: no iOS o teclado leva ~300ms subindo, e rolar antes disso rola
// para o lugar errado.
export function trazerParaAVista(evento) {
  const alvo = evento.target;
  if (!alvo?.matches?.('input, textarea, select')) return;
  setTimeout(() => {
    alvo.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, 320);
}
