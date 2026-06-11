// Tokens de Reivindicação: prova de posse das páginas criadas neste navegador.
// Mapa slug -> token em localStorage; some quando a página é reivindicada.
const KEY = 'chamego-claims';

export function getClaims() {
  try {
    const map = JSON.parse(localStorage.getItem(KEY) || '{}');
    return Object.entries(map).map(([slug, token]) => ({ slug, token }));
  } catch {
    return [];
  }
}

export function addClaim(slug, token) {
  try {
    const map = JSON.parse(localStorage.getItem(KEY) || '{}');
    map[slug] = token;
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch { /* localStorage indisponível (modo privado antigo) */ }
}

export function removeClaim(slug) {
  try {
    const map = JSON.parse(localStorage.getItem(KEY) || '{}');
    delete map[slug];
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch { /* idem */ }
}

export function hasClaims() {
  return getClaims().length > 0;
}
