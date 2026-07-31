import { track } from './subscription.js';

const MARCA = 'chamego:pwa-visto';

// O `?source=pwa` do manifest só serve pra alguma coisa se alguém contar. Uma
// marca por dia basta pra responder "quanta gente usa o app instalado?" — que é
// a única pergunta que justifica a camada de instalação existir.
// Falha em silêncio: métrica nunca atrapalha o uso.
export function registrarAberturaPwa() {
  try {
    const instalado = new URLSearchParams(window.location.search).get('source') === 'pwa'
      || window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
    if (!instalado) return;

    const hoje = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(MARCA) === hoje) return;
    localStorage.setItem(MARCA, hoje);
    track('abriu_pwa', 'instalado');
  } catch { /* navegador sem localStorage: sem métrica, app igual */ }
}
