import crypto from 'crypto';

// Sem SESSION_SECRET o segredo é regenerado a cada boot: todo deploy desloga
// todo mundo. Funciona, mas configure a env no Render.
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('SESSION_SECRET ausente — sessões serão invalidadas a cada deploy');
}

const SESSION_DAYS = 30;

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

// Valida o ID token do Google Identity Services via endpoint tokeninfo.
// Volume baixo não justifica a dependência google-auth-library (JWKS local).
export async function verifyGoogleToken(credential) {
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!res.ok) return null;
    const t = await res.json();
    if (!process.env.GOOGLE_CLIENT_ID || t.aud !== process.env.GOOGLE_CLIENT_ID) return null;
    // Só email verificado pelo Google prova posse — sem isso qualquer conta
    // recém-criada com email alheio sequestraria a identidade.
    if (t.email_verified !== 'true' && t.email_verified !== true) return null;
    return { email: normalizeEmail(t.email), name: t.name || '', picture: t.picture || '' };
  } catch {
    return null;
  }
}

export function createSession({ email, name = '' }) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60;
  const payload = Buffer.from(JSON.stringify({ email, name, exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySession(token) {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!data.email || data.exp < Date.now() / 1000) return null;
    return data;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = 'chamego_session';
export const SESSION_MAX_AGE_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

export function sessionFromRequest(req) {
  const cookie = req.headers.cookie || '';
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return m ? verifySession(decodeURIComponent(m[1])) : null;
}
