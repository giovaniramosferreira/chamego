// Receitinhas achadas. O que não pode quebrar nunca:
//   1. O servidor busca uma URL que o usuário digitou — a tranca contra
//      endereço interno é a parte mais importante deste arquivo.
//   2. Rascunho de IA não vira receita sozinho: sem aprovação, fora da roda.
//   3. Rascunho malformado não entra no app de jeito nenhum.
import { describe, it, expect } from 'vitest';
import request from 'supertest';

process.env.ADMIN_KEY = process.env.ADMIN_KEY || 'chave-de-teste';

import { app } from '../server.js';
import { db } from '../db.js';
import { ipPrivado, sanitizarReceita, textoDaPagina, validarUrl } from '../receita/achados.js';

let seq = 0;
async function login(email) {
  await request(app).post('/api/auth/magic-link').send({ email });
  const token = db._rawLoginToken(email);
  const res = await request(app).get(`/api/auth/magic?t=${token}`);
  return res.headers['set-cookie'][0].split(';')[0];
}
async function newSpace() {
  const email = `achados${seq++}@b.com`;
  const cookie = await login(email);
  const res = await request(app).post('/api/couples').set('Cookie', cookie)
    .send({ name: 'Nós', milestoneDate: '2024-01-01', seed: false });
  return { cookie, email, couple: res.body.couple };
}
const premium = (coupleId) => db.saveSubscription(coupleId, {
  status: 'active', provider: 'stripe', currentPeriodEnd: '2099-01-01T00:00:00.000Z',
});

const receitaValida = {
  titulo: 'Lasanha da vó',
  tempoMin: 70, porcoes: 4, dificuldade: 2, custo: 40,
  tags: ['jantar', 'forno'], contem: ['gluten', 'lactose'],
  ingredientes: [{ nome: 'massa de lasanha', medida: '1 pacote' }, { nome: 'carne moída', medida: '500 g' }],
  passos: [{ texto: 'Refogue a carne.', timerSeg: 300 }, { texto: 'Monte e leve ao forno.' }],
};
// Atalho: guarda um achado direto no banco, sem passar pela IA.
const semear = (coupleId, email, receita = receitaValida, url = `https://exemplo.com/${seq++}`) =>
  db.createFind(coupleId, email, { url, receita: sanitizarReceita(receita) }).find;

/* ── A tranca ── */
describe('link que o servidor aceita buscar', () => {
  it('recusa endereço da rede interna e da nuvem', () => {
    for (const ip of ['127.0.0.1', '10.0.0.5', '192.168.1.1', '172.20.0.1', '169.254.169.254', '::1', 'fd00::1']) {
      expect(ipPrivado(ip), ip).toBe(true);
    }
    for (const ip of ['8.8.8.8', '1.1.1.1', '2606:4700::1111']) {
      expect(ipPrivado(ip), ip).toBe(false);
    }
  });

  it('recusa protocolo que não é http', () => {
    expect(() => validarUrl('file:///etc/passwd')).toThrow();
    expect(() => validarUrl('ftp://exemplo.com')).toThrow();
    expect(() => validarUrl('não é link')).toThrow();
    expect(() => validarUrl('http://127.0.0.1:3001/api/me')).toThrow();
    expect(validarUrl('https://exemplo.com/receita').hostname).toBe('exemplo.com');
  });
});

/* ── Leitura da página ── */
describe('texto da página', () => {
  it('joga fora script e tag, e põe o JSON-LD na frente', () => {
    const html = `<html><head><script type="application/ld+json">
      {"@type":"Recipe","name":"Bolo","recipeIngredient":["2 ovos"]}</script>
      <style>.x{color:red}</style></head>
      <body><script>alert(1)</script><h1>Bolo&nbsp;de cenoura</h1><p>Delicioso &amp; fácil</p></body></html>`;
    const texto = textoDaPagina(html);
    expect(texto.indexOf('recipeIngredient')).toBeLessThan(texto.indexOf('Bolo de cenoura'));
    expect(texto).not.toContain('alert(1)');
    expect(texto).not.toContain('color:red');
    expect(texto).toContain('Delicioso & fácil');
  });
});

/* ── O rascunho ── */
describe('sanitização do que a IA devolve', () => {
  it('aceita receita completa e normaliza o que dá', () => {
    const r = sanitizarReceita({ receita: receitaValida });
    expect(r.titulo).toBe('Lasanha da vó');
    expect(r.ingredientes[0]).toEqual({ nome: 'massa de lasanha', medida: '1 pacote', opcional: false });
    expect(r.passos[1]).toEqual({ texto: 'Monte e leve ao forno.' });
  });

  it('recusa o que não dá pra cozinhar', () => {
    expect(sanitizarReceita(null)).toBe(null);
    expect(sanitizarReceita({ receita: null })).toBe(null);
    expect(sanitizarReceita({ receita: { titulo: 'Sem nada' } })).toBe(null);
    // Um passo só não é receita: é frase solta.
    expect(sanitizarReceita({
      receita: { titulo: 'X', ingredientes: [{ nome: 'ovo' }], passos: [{ texto: 'faça' }] },
    })).toBe(null);
  });

  it('descarta tag e alérgeno inventados, e corta o exagero', () => {
    const r = sanitizarReceita({
      receita: {
        ...receitaValida,
        tags: ['jantar', 'vegano', 'fitness'],
        contem: ['gluten', 'radiação'],
        tempoMin: 99_999,
        porcoes: -3,
        ingredientes: Array.from({ length: 40 }, (_, n) => ({ nome: `item ${n}`, medida: '1' })),
      },
    });
    expect(r.tags).toEqual(['jantar']);
    expect(r.contem).toEqual(['gluten']);
    expect(r.tempoMin).toBe(30);   // fora da faixa: cai no padrão
    expect(r.porcoes).toBe(2);
    expect(r.ingredientes.length).toBeLessThanOrEqual(20);
  });

  it('não deixa passar texto gigante nem timer absurdo', () => {
    const r = sanitizarReceita({
      receita: {
        ...receitaValida,
        titulo: 'a'.repeat(500),
        passos: [{ texto: 'b'.repeat(2000), timerSeg: 999_999 }, { texto: 'ok' }],
      },
    });
    expect(r.titulo.length).toBeLessThanOrEqual(80);
    expect(r.passos[0].texto.length).toBeLessThanOrEqual(400);
    expect(r.passos[0].timerSeg).toBeUndefined();  // fora da faixa: sem timer
  });
});

/* ── A porta: premium e curadoria ── */
describe('achados na API', () => {
  it('ler link é do premium', async () => {
    const { cookie } = await newSpace();
    const res = await request(app).post('/api/cozinha/achados').set('Cookie', cookie)
      .send({ url: 'https://exemplo.com/receita' });
    expect(res.status).toBe(402);
    expect(res.body.upgrade).toBe(true);
    expect(res.body.limite).toBe('achados');
  });

  it('rascunho fica fora da roda até alguém aprovar', async () => {
    const { cookie, email, couple } = await newSpace();
    premium(couple.id);
    const achado = semear(couple.id, email);

    // Pendente: não aparece pra cozinhar.
    expect(db.receitasDoCasal(couple.id)).toEqual([]);
    const fora = await request(app).get(`/api/cozinha/receitas/${achado.receita.id}`).set('Cookie', cookie);
    expect(fora.status).toBe(404);

    // Aprovado: vira receita de verdade, com o que falta na despensa calculado.
    const ok = await request(app).patch(`/api/cozinha/achados/${achado.id}`).set('Cookie', cookie)
      .send({ status: 'salva' });
    expect(ok.status).toBe(200);
    const dentro = await request(app).get(`/api/cozinha/receitas/${achado.receita.id}`).set('Cookie', cookie);
    expect(dentro.status).toBe(200);
    expect(dentro.body.receita.titulo).toBe('Lasanha da vó');
    expect(dentro.body.receita.rotuloFalta).toBeTruthy();
  });

  it('receita aprovada pode ser sorteada e cozinhada', async () => {
    const { cookie, email, couple } = await newSpace();
    premium(couple.id);
    const achado = semear(couple.id, email);
    db.setFindStatus(couple.id, achado.id, 'salva');

    const cozinhei = await request(app).post('/api/cozinha/cozinhei').set('Cookie', cookie)
      .send({ receitaId: achado.receita.id });
    expect(cozinhei.status).toBe(200);
    expect(cozinhei.body.sugestaoMomento).toContain('Lasanha da vó');
  });

  it('mesma URL não vira duas receitas', async () => {
    const { email, couple } = await newSpace();
    const url = 'https://exemplo.com/lasanha-unica';
    const primeiro = db.createFind(couple.id, email, { url, receita: sanitizarReceita(receitaValida) });
    const segundo = db.createFind(couple.id, email, { url, receita: sanitizarReceita(receitaValida) });
    expect(segundo.repetido).toBe(true);
    expect(segundo.find.id).toBe(primeiro.find.id);
  });

  it('descartada some da lista, e a lista separa o que espera decisão', async () => {
    const { cookie, email, couple } = await newSpace();
    premium(couple.id);
    const a = semear(couple.id, email);
    const b = semear(couple.id, email);
    await request(app).patch(`/api/cozinha/achados/${b.id}`).set('Cookie', cookie).send({ status: 'salva' });
    const c = semear(couple.id, email);
    await request(app).patch(`/api/cozinha/achados/${c.id}`).set('Cookie', cookie).send({ status: 'descartada' });

    const lista = await request(app).get('/api/cozinha/achados').set('Cookie', cookie);
    expect(lista.body.pendentes.map((x) => x.id)).toEqual([a.id]);
    expect(lista.body.salvas.map((x) => x.id)).toEqual([b.id]);
  });

  it('um casal não enxerga o achado do outro', async () => {
    const casaA = await newSpace();
    const casaB = await newSpace();
    const achado = semear(casaA.couple.id, casaA.email);

    const res = await request(app).patch(`/api/cozinha/achados/${achado.id}`).set('Cookie', casaB.cookie)
      .send({ status: 'salva' });
    expect(res.status).toBe(404);
    expect(db.listFinds(casaB.couple.id)).toEqual([]);
  });
});
