import { it, expect, describe, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { db } from '../db.js';

const realFetch = global.fetch;

beforeEach(() => {
  process.env.GOOGLE_CLIENT_ID = 'test-client-id';
  process.env.COUPON_CODE = 'amigosdogigio';
  // Mocka só o tokeninfo do Google; o resto do fetch segue real
  global.fetch = vi.fn((url, opts) => {
    if (String(url).includes('oauth2.googleapis.com/tokeninfo')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          aud: 'test-client-id',
          email: 'Criador@Gmail.com',
          email_verified: 'true',
          name: 'Criador Teste',
          picture: '',
        }),
      });
    }
    return realFetch(url, opts);
  });
});

async function loginGoogle(claims) {
  const res = await request(app).post('/api/auth/google').send({ credential: 'fake-jwt', claims });
  expect(res.status).toBe(200);
  return res.headers['set-cookie'][0].split(';')[0]; // chamego_session=...
}

function makePublishedPage(slug) {
  const token = `tok-${slug}`;
  db.savePage({ slug, data: { titulo: 'A & B' }, status: 'draft', claimToken: token });
  db.publishPage(slug);
  return token;
}

describe('login google', () => {
  it('cria sessão, normaliza email e executa claims do login', async () => {
    const token = makePublishedPage('casal-claim-login');
    const cookie = await loginGoogle([{ slug: 'casal-claim-login', token }]);
    const me = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe('criador@gmail.com');
    const mine = await request(app).get('/api/my-pages').set('Cookie', cookie);
    expect(mine.body.pages.map(p => p.slug)).toContain('casal-claim-login');
  });

  it('rejeita token google de outra audiência', async () => {
    process.env.GOOGLE_CLIENT_ID = 'outra-audiencia';
    const res = await request(app).post('/api/auth/google').send({ credential: 'fake-jwt' });
    expect(res.status).toBe(401);
  });

  it('sem sessão, rotas de gerência respondem 401', async () => {
    expect((await request(app).get('/api/my-pages')).status).toBe(401);
    expect((await request(app).post('/api/pages/x/unpublish')).status).toBe(401);
  });
});

describe('reivindicação', () => {
  it('token errado não reivindica; slug não é prova de posse', async () => {
    makePublishedPage('casal-seguro');
    const cookie = await loginGoogle();
    const res = await request(app).post('/api/pages/casal-seguro/claim')
      .set('Cookie', cookie).send({ claimToken: 'chute' });
    expect(res.status).toBe(404);
  });

  it('rascunho não é reivindicável (claim só pós-pagamento)', async () => {
    db.savePage({ slug: 'casal-rascunho', data: { titulo: 'R' }, status: 'draft', claimToken: 'tok-r' });
    const cookie = await loginGoogle();
    const res = await request(app).post('/api/pages/casal-rascunho/claim')
      .set('Cookie', cookie).send({ claimToken: 'tok-r' });
    expect(res.status).toBe(404);
  });
});

describe('despublicação e republicação', () => {
  it('dono despublica (página vira 404 genérico) e republica', async () => {
    const token = makePublishedPage('casal-liga-desliga');
    const cookie = await loginGoogle([{ slug: 'casal-liga-desliga', token }]);

    const off = await request(app).post('/api/pages/casal-liga-desliga/unpublish').set('Cookie', cookie);
    expect(off.body.status).toBe('unpublished');
    expect((await request(app).get('/api/pages/casal-liga-desliga')).status).toBe(404);

    const on = await request(app).post('/api/pages/casal-liga-desliga/republish').set('Cookie', cookie);
    expect(on.body.status).toBe('published');
    expect((await request(app).get('/api/pages/casal-liga-desliga')).status).toBe(200);
  });

  it('quem não é dono não despublica', async () => {
    const token = makePublishedPage('casal-de-outro');
    db.claimPage({ slug: 'casal-de-outro', claimToken: token, ownerEmail: 'outra@pessoa.com' });
    const cookie = await loginGoogle();
    const res = await request(app).post('/api/pages/casal-de-outro/unpublish').set('Cookie', cookie);
    expect(res.status).toBe(404);
  });

  it('webhook atrasado não republica página despublicada', async () => {
    const token = makePublishedPage('casal-webhook');
    db.claimPage({ slug: 'casal-webhook', claimToken: token, ownerEmail: 'dono@x.com' });
    db.unpublishPage('casal-webhook', 'dono@x.com');
    db.publishPage('casal-webhook'); // o que o webhook do MP faria
    expect(db.getPageBySlug('casal-webhook').status).toBe('unpublished');
  });
});

describe('link mágico', () => {
  it('fluxo completo: pedir link, consumir token, sessão + claim', async () => {
    const token = makePublishedPage('casal-magico');
    const ask = await request(app).post('/api/auth/email')
      .send({ email: 'Magia@Teste.com', claims: [{ slug: 'casal-magico', token }] });
    expect(ask.status).toBe(200);

    // Sem GMAIL_* o link é logado; pega o token direto do banco
    const data = db.consumeLoginToken(findLoginToken('magia@teste.com'));
    expect(data.email).toBe('magia@teste.com');
    expect(data.claims[0].slug).toBe('casal-magico');
  });

  it('link mágico é uso único', async () => {
    await request(app).post('/api/auth/email').send({ email: 'unica@vez.com' });
    const t = findLoginToken('unica@vez.com');
    expect(db.consumeLoginToken(t)).not.toBeNull();
    expect(db.consumeLoginToken(t)).toBeNull();
  });

  it('clique no link loga e redireciona pra Minhas Páginas', async () => {
    await request(app).post('/api/auth/email').send({ email: 'clique@aqui.com' });
    const t = findLoginToken('clique@aqui.com');
    const res = await request(app).get(`/api/auth/magic?t=${t}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/minhas-paginas');
    expect(res.headers['set-cookie'][0]).toContain('chamego_session=');
  });

  it('link inválido redireciona com erro', async () => {
    const res = await request(app).get('/api/auth/magic?t=inexistente');
    expect(res.headers.location).toBe('/minhas-paginas?erro=link-invalido');
  });

  it('rate limit: segundo pedido em menos de 1 minuto leva 429', async () => {
    await request(app).post('/api/auth/email').send({ email: 'apressada@x.com' });
    const res = await request(app).post('/api/auth/email').send({ email: 'apressada@x.com' });
    expect(res.status).toBe(429);
  });
});

describe('celular opcional', () => {
  it('salva e devolve no /me', async () => {
    const cookie = await loginGoogle();
    await request(app).post('/api/auth/phone').set('Cookie', cookie).send({ phone: '11 99999-0000' });
    const me = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(me.body.phone).toBe('11 99999-0000');
  });
});

it('rascunho novo devolve claimToken e re-salvar mantém o mesmo', async () => {
  const res = await request(app).post('/api/drafts').send({
    data: { titulo: 'Claim & Token', dataInicio: '2024-01-01' },
  });
  expect(res.body.claimToken).toBeTruthy();
  const again = await request(app).post('/api/drafts').send({
    data: { titulo: 'Claim & Token', dataInicio: '2024-01-01', slug: res.body.slug },
  });
  expect(again.body.claimToken).toBe(res.body.claimToken);
});

// Helper: acha o token de login mais recente de um email direto no SQLite em memória
function findLoginToken(email) {
  // db não expõe listagem de tokens; busca via consumo indireto não dá — então
  // expomos pela API administrativa do próprio módulo: recria query mínima.
  return db._rawLoginToken ? db._rawLoginToken(email) : (() => { throw new Error('helper ausente'); })();
}
