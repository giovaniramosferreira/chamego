// Cobre o que a rodada de melhorias trouxe: espaço que nasce com conteúdo,
// busca única, não lidas do chat, calendário .ics, exportar/sair/excluir e
// os lembretes por email.
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { db } from '../db.js';
import { buildIcs } from '../ics.js';
import { runNotifications } from '../notifier.js';

let seq = 0;
async function login(email) {
  await request(app).post('/api/auth/magic-link').send({ email });
  const token = db._rawLoginToken(email);
  const res = await request(app).get(`/api/auth/magic?t=${token}`);
  return res.headers['set-cookie'][0].split(';')[0];
}
async function newSpace(body = {}) {
  const email = `melhoria${seq++}@b.com`;
  const cookie = await login(email);
  const res = await request(app).post('/api/couples').set('Cookie', cookie)
    .send({ name: 'Nós', milestoneDate: '2024-01-01', seed: false, ...body });
  return { cookie, email, couple: res.body.couple };
}
const today = () => new Date().toLocaleDateString('en-CA');

describe('espaço nunca nasce vazio', () => {
  it('seed por objetivo cria listas e o aniversário do marco', async () => {
    const { cookie } = await newSpace({ seed: 'rotina' });
    const lists = (await request(app).get('/api/lists').set('Cookie', cookie)).body.lists;
    expect(lists.map((l) => l.title)).toEqual(expect.arrayContaining(['Mercado', 'Casa da gente']));
    const events = (await request(app).get('/api/events').set('Cookie', cookie)).body.events;
    expect(events).toHaveLength(1);
    expect(events[0].date >= today()).toBe(true); // sempre a próxima ocorrência
  });

  it('objetivo planejar cria um plano com etapas', async () => {
    const { cookie } = await newSpace({ seed: 'planejar' });
    const plans = (await request(app).get('/api/plans').set('Cookie', cookie)).body.plans;
    expect(plans).toHaveLength(1);
    expect(plans[0].steps.length).toBe(3);
  });

  it('data do contador é opcional e pode ser definida depois', async () => {
    const { cookie, couple } = await newSpace({ milestoneDate: '' });
    expect(couple.milestone_date).toBe('');
    const patched = await request(app).patch(`/api/couples/${couple.id}`).set('Cookie', cookie)
      .send({ milestoneDate: '2025-02-10' });
    expect(patched.body.couple.milestone_date).toBe('2025-02-10');
  });

  it('recusa data inválida na criação', async () => {
    const cookie = await login('databoba@b.com');
    const res = await request(app).post('/api/couples').set('Cookie', cookie).send({ name: 'X', milestoneDate: '10/02/2025' });
    expect(res.status).toBe(400);
  });
});

describe('busca única', () => {
  it('acha evento, item de lista e momento do casal', async () => {
    const { cookie } = await newSpace();
    await request(app).post('/api/events').set('Cookie', cookie).send({ title: 'Jantar no Oliva', date: today() });
    const list = (await request(app).post('/api/lists').set('Cookie', cookie).send({ title: 'Mercado' })).body.list;
    await request(app).post(`/api/lists/${list.id}/items`).set('Cookie', cookie).send({ text: 'Comprar oliva' });
    const res = await request(app).get('/api/search?q=oliva').set('Cookie', cookie);
    expect(res.body.results.map((r) => r.type).sort()).toEqual(['evento', 'item']);
  });

  it('não vaza conteúdo de outro casal e ignora busca vazia', async () => {
    const a = await newSpace();
    await request(app).post('/api/events').set('Cookie', a.cookie).send({ title: 'Segredo', date: today() });
    const b = await newSpace();
    expect((await request(app).get('/api/search?q=segredo').set('Cookie', b.cookie)).body.results).toHaveLength(0);
    expect((await request(app).get('/api/search?q=').set('Cookie', a.cookie)).body.results).toHaveLength(0);
  });
});

describe('chat: não lidas', () => {
  it('conta só as mensagens do par e zera ao marcar leitura', async () => {
    const creator = await newSpace();
    const invite = (await request(app).post(`/api/couples/${creator.couple.id}/invites`).set('Cookie', creator.cookie)).body.invite;
    const partnerCookie = await login('parceiro-badge@b.com');
    await request(app).post(`/api/invites/${invite.code}/accept`).set('Cookie', partnerCookie);

    await request(app).post('/api/messages').set('Cookie', partnerCookie).send({ text: 'oi' });
    await request(app).post('/api/messages').set('Cookie', partnerCookie).send({ text: 'saudade' });
    expect((await request(app).get('/api/badges').set('Cookie', creator.cookie)).body.unread).toBe(2);
    // as próprias mensagens nunca contam
    expect((await request(app).get('/api/badges').set('Cookie', partnerCookie)).body.unread).toBe(0);

    await request(app).post('/api/messages/read').set('Cookie', creator.cookie).send({});
    expect((await request(app).get('/api/badges').set('Cookie', creator.cookie)).body.unread).toBe(0);
  });
});

describe('calendário', () => {
  it('gera .ics de um evento com hora e de um dia inteiro', () => {
    const ics = buildIcs([
      { id: 1, title: 'Jantar; especial', date: '2026-03-04', time: '19:30', location: 'Oliva', notes: '' },
      { id: 2, title: 'Aniversário', date: '2026-03-05', time: '', location: '', notes: '' },
    ]);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('DTSTART:20260304T193000');
    expect(ics).toContain('DTEND:20260304T203000');
    expect(ics).toContain('DTSTART;VALUE=DATE:20260305');
    expect(ics).toContain('SUMMARY:Jantar\\; especial'); // escape do RFC
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('assinatura por token devolve só eventos compartilhados, sem sessão', async () => {
    const { cookie } = await newSpace();
    await request(app).post('/api/events').set('Cookie', cookie).send({ title: 'Nosso date', date: today() });
    await request(app).post('/api/events').set('Cookie', cookie).send({ title: 'Só meu', date: today(), shared: false });
    const { url } = (await request(app).get('/api/calendar/token').set('Cookie', cookie)).body;
    const feed = await request(app).get(url.replace(/^https?:\/\/[^/]+/, ''));
    expect(feed.status).toBe(200);
    expect(feed.headers['content-type']).toContain('text/calendar');
    expect(feed.text).toContain('Nosso date');
    expect(feed.text).not.toContain('Só meu');
    expect((await request(app).get('/api/calendar/naoexiste')).status).toBe(404);
  });

  it('baixa o .ics de um evento e 404 em evento de outro casal', async () => {
    const a = await newSpace();
    const ev = (await request(app).post('/api/events').set('Cookie', a.cookie).send({ title: 'Show', date: today() })).body.event;
    expect((await request(app).get(`/api/events/${ev.id}/ics`).set('Cookie', a.cookie)).text).toContain('SUMMARY:Show');
    const b = await newSpace();
    expect((await request(app).get(`/api/events/${ev.id}/ics`).set('Cookie', b.cookie)).status).toBe(404);
  });
});

describe('confiança: exportar, sair e excluir', () => {
  it('exporta tudo do espaço em JSON', async () => {
    const { cookie } = await newSpace();
    await request(app).post('/api/events').set('Cookie', cookie).send({ title: 'Cinema', date: today() });
    const res = await request(app).get('/api/export').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('chamego-');
    expect(res.body.events[0].title).toBe('Cinema');
    expect(res.body).toHaveProperty('moments');
    expect(res.body).toHaveProperty('messages');
  });

  it('excluir exige confirmação e apaga o espaço inteiro', async () => {
    const { cookie, couple } = await newSpace();
    await request(app).post('/api/events').set('Cookie', cookie).send({ title: 'Some', date: today() });
    expect((await request(app).delete(`/api/couples/${couple.id}`).set('Cookie', cookie).send({})).status).toBe(400);
    expect((await request(app).delete(`/api/couples/${couple.id}`).set('Cookie', cookie).send({ confirm: 'EXCLUIR' })).status).toBe(200);
    const me = await request(app).get('/api/me').set('Cookie', cookie);
    expect(me.body.couple).toBe(null);
    expect((await request(app).get('/api/events').set('Cookie', cookie)).status).toBe(409);
  });

  it('sair do espaço deixa o conteúdo com quem ficou', async () => {
    const creator = await newSpace();
    await request(app).post('/api/events').set('Cookie', creator.cookie).send({ title: 'Fica', date: today() });
    const invite = (await request(app).post(`/api/couples/${creator.couple.id}/invites`).set('Cookie', creator.cookie)).body.invite;
    const partnerCookie = await login('quem-sai@b.com');
    await request(app).post(`/api/invites/${invite.code}/accept`).set('Cookie', partnerCookie);

    expect((await request(app).post(`/api/couples/${creator.couple.id}/leave`).set('Cookie', partnerCookie)).status).toBe(200);
    expect((await request(app).get('/api/me').set('Cookie', partnerCookie)).body.couple).toBe(null);
    const events = (await request(app).get('/api/events').set('Cookie', creator.cookie)).body.events;
    expect(events).toHaveLength(1);
  });
});

describe('lembretes por email', () => {
  it('manda a véspera uma vez só e respeita a preferência', async () => {
    const { cookie, couple } = await newSpace();
    const amanha = new Date(Date.now() + 86_400_000).toLocaleDateString('en-CA');
    await request(app).post('/api/events').set('Cookie', cookie).send({ title: 'Consulta', date: amanha });

    const noite = new Date(); noite.setHours(20, 0, 0, 0);
    const primeira = await runNotifications(noite);
    expect(primeira.eventEve).toBeGreaterThan(0);
    // idempotente: rodar de novo no mesmo dia não reenvia
    expect((await runNotifications(noite)).eventEve).toBe(0);

    // e de manhã não manda nada
    const manha = new Date(); manha.setHours(9, 0, 0, 0);
    expect((await runNotifications(manha)).eventEve).toBe(0);

    await request(app).patch('/api/reminders/prefs').set('Cookie', cookie).send({ email: { eventEve: false } });
    expect(db.reminderPrefs(couple.id).email.eventEve).toBe(false);
    expect(db.reminderPrefs(couple.id).types.checkin).toBe(true); // não zera o resto
  });
});
