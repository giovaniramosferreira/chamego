import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { db } from '../db.js';

let seq = 0;
async function login(email) {
  await request(app).post('/api/auth/magic-link').send({ email });
  const token = db._rawLoginToken(email);
  const res = await request(app).get(`/api/auth/magic?t=${token}`);
  return res.headers['set-cookie'][0].split(';')[0];
}
async function withCouple() {
  const cookie = await login(`tab${seq++}@b.com`);
  await request(app).post('/api/couples').set('Cookie', cookie).send({ name: 'Nós', milestoneDate: '2024-01-01' });
  return cookie;
}
const today = () => new Date().toLocaleDateString('en-CA');

describe('escopo por espaço', () => {
  it('sem espaço, endpoints de conteúdo retornam 409', async () => {
    const cookie = await login('semespaco@b.com');
    expect((await request(app).get('/api/events').set('Cookie', cookie)).status).toBe(409);
    expect((await request(app).get('/api/lists').set('Cookie', cookie)).status).toBe(409);
  });
  it('sem sessão retorna 401', async () => {
    expect((await request(app).get('/api/events')).status).toBe(401);
  });
});

describe('Agenda', () => {
  it('cria, lista, edita e exclui evento', async () => {
    const cookie = await withCouple();
    const created = await request(app).post('/api/events').set('Cookie', cookie)
      .send({ title: 'Jantar', date: today(), time: '19:30', location: 'Oliva' });
    expect(created.status).toBe(200);
    const id = created.body.event.id;

    const list = await request(app).get('/api/events').set('Cookie', cookie);
    expect(list.body.events).toHaveLength(1);

    const patched = await request(app).patch(`/api/events/${id}`).set('Cookie', cookie).send({ title: 'Jantar tardio' });
    expect(patched.body.event.title).toBe('Jantar tardio');

    expect((await request(app).delete(`/api/events/${id}`).set('Cookie', cookie)).status).toBe(200);
    expect((await request(app).get('/api/events').set('Cookie', cookie)).body.events).toHaveLength(0);
  });

  it('rejeita data inválida e isola por casal', async () => {
    const a = await withCouple();
    const bad = await request(app).post('/api/events').set('Cookie', a).send({ title: 'X', date: '2024/1/1' });
    expect(bad.status).toBe(400);
    const ev = await request(app).post('/api/events').set('Cookie', a).send({ title: 'Privado', date: today() });
    const b = await withCouple();
    expect((await request(app).get('/api/events').set('Cookie', b)).body.events).toHaveLength(0);
    expect((await request(app).delete(`/api/events/${ev.body.event.id}`).set('Cookie', b)).status).toBe(404);
  });
});

describe('Listas', () => {
  it('cria lista, adiciona/marca/remove item com contagem', async () => {
    const cookie = await withCouple();
    const list = (await request(app).post('/api/lists').set('Cookie', cookie).send({ title: 'Compras', kind: 'shared' })).body.list;
    const withItem = (await request(app).post(`/api/lists/${list.id}/items`).set('Cookie', cookie).send({ text: 'Pão' })).body.list;
    const itemId = withItem.items[0].id;
    expect(withItem.items).toHaveLength(1);

    const marked = (await request(app).patch(`/api/items/${itemId}`).set('Cookie', cookie).send({ done: true })).body.list;
    expect(marked.items[0].done).toBe(1);

    const overview = (await request(app).get('/api/lists').set('Cookie', cookie)).body.lists[0];
    expect(overview.total).toBe(1);
    expect(overview.done).toBe(1);

    const emptied = (await request(app).delete(`/api/items/${itemId}`).set('Cookie', cookie)).body.list;
    expect(emptied.items).toHaveLength(0);
  });

  it('não vaza itens entre casais', async () => {
    const a = await withCouple();
    const list = (await request(app).post('/api/lists').set('Cookie', a).send({ title: 'Secreta' })).body.list;
    const b = await withCouple();
    expect((await request(app).get(`/api/lists/${list.id}`).set('Cookie', b)).status).toBe(404);
    expect((await request(app).post(`/api/lists/${list.id}/items`).set('Cookie', b).send({ text: 'x' })).status).toBe(404);
  });
});

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6300010000050001', 'hex');

describe('Momentos', () => {
  it('cria momento só com texto e lista', async () => {
    const cookie = await withCouple();
    const res = await request(app).post('/api/moments').set('Cookie', cookie).field('text', 'Café na varanda').field('date', today());
    expect(res.status).toBe(200);
    expect(res.body.moment.text).toBe('Café na varanda');
    expect((await request(app).get('/api/moments').set('Cookie', cookie)).body.moments).toHaveLength(1);
  });
  it('rejeita momento vazio', async () => {
    const cookie = await withCouple();
    expect((await request(app).post('/api/moments').set('Cookie', cookie).field('text', '')).status).toBe(400);
  });
  it('guarda no máximo 1 foto e permite trocar/remover na edição', async () => {
    const cookie = await withCouple();
    const created = await request(app).post('/api/moments').set('Cookie', cookie)
      .field('text', 'Passeio').attach('photo', PNG, 'a.png');
    expect(created.status).toBe(200);
    expect(created.body.moment.photos).toHaveLength(1);
    const id = created.body.moment.id;

    const swapped = await request(app).patch(`/api/moments/${id}`).set('Cookie', cookie).attach('photo', PNG, 'b.png');
    expect(swapped.body.moment.photos).toHaveLength(1);
    expect(swapped.body.moment.photos[0]).not.toBe(created.body.moment.photos[0]);

    const edited = await request(app).patch(`/api/moments/${id}`).set('Cookie', cookie).field('text', 'Passeio no parque').field('removePhoto', 'true');
    expect(edited.body.moment.text).toBe('Passeio no parque');
    expect(edited.body.moment.photos).toHaveLength(0);
  });
  it('não edita momento de outro casal', async () => {
    const a = await withCouple();
    const m = await request(app).post('/api/moments').set('Cookie', a).field('text', 'Meu');
    const b = await withCouple();
    expect((await request(app).patch(`/api/moments/${m.body.moment.id}`).set('Cookie', b).field('text', 'hack')).status).toBe(404);
  });
});

describe('Foto de perfil', () => {
  it('faz upload do avatar e atualiza o usuário', async () => {
    const cookie = await login('avatar@b.com');
    const res = await request(app).post('/api/me/avatar').set('Cookie', cookie).attach('avatar', PNG, 'me.png');
    expect(res.status).toBe(200);
    expect(res.body.picture).toMatch(/^\/uploads\//);
    const me = await request(app).get('/api/me').set('Cookie', cookie);
    expect(me.body.user.picture).toBe(res.body.picture);
  });
  it('rejeita sem arquivo', async () => {
    const cookie = await login('avatar2@b.com');
    expect((await request(app).post('/api/me/avatar').set('Cookie', cookie)).status).toBe(400);
  });
});

describe('Vocês', () => {
  it('check-in, meta e chat funcionam', async () => {
    const cookie = await withCouple();
    await request(app).post('/api/checkins').set('Cookie', cookie).send({ mood: 'bem', note: 'oi' });
    const conn = await request(app).get('/api/connection').set('Cookie', cookie);
    expect(conn.body.myCheckin.mood).toBe('bem');
    expect(conn.body.stats.streak).toBe(1);
    expect(conn.body.question).toBeTruthy();

    const goal = (await request(app).post('/api/goals').set('Cookie', cookie).send({ title: 'Viajar' })).body.goal;
    expect((await request(app).get('/api/connection').set('Cookie', cookie)).body.stats.activeGoals).toBe(1);
    await request(app).patch(`/api/goals/${goal.id}`).set('Cookie', cookie).send({ done: true });
    expect((await request(app).get('/api/connection').set('Cookie', cookie)).body.stats.activeGoals).toBe(0);

    const msg = await request(app).post('/api/messages').set('Cookie', cookie).send({ text: 'Chego às 19h' });
    expect(msg.status).toBe(200);
    const msgs = await request(app).get('/api/messages').set('Cookie', cookie);
    expect(msgs.body.messages).toHaveLength(1);
    const since = await request(app).get(`/api/messages?since=${msg.body.message.id}`).set('Cookie', cookie);
    expect(since.body.messages).toHaveLength(0);
  });
});
