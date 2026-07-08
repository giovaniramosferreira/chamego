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
  const cookie = await login(`proto${seq++}@b.com`);
  await request(app).post('/api/couples').set('Cookie', cookie).send({
    name: 'Nos',
    milestoneDate: '2024-01-01',
  });
  return cookie;
}

describe('backends do prototipo', () => {
  it('cria planos com etapas e isola por casal', async () => {
    const a = await withCouple();
    const b = await withCouple();

    const created = await request(app).post('/api/plans').set('Cookie', a).send({
      title: 'Viagem pra serra',
      category: 'viagem',
      targetDate: '2026-12-10',
      shared: true,
      steps: ['Escolher cidade', 'Reservar pousada'],
    });
    expect(created.status).toBe(200);
    expect(created.body.plan.steps).toHaveLength(2);

    const step = created.body.plan.steps[0];
    const updated = await request(app).patch(`/api/plan-steps/${step.id}`).set('Cookie', a).send({ done: true });
    expect(updated.body.plan.steps[0].done).toBe(1);

    expect((await request(app).get('/api/plans').set('Cookie', a)).body.plans).toHaveLength(1);
    expect((await request(app).get('/api/plans').set('Cookie', b)).body.plans).toHaveLength(0);
  });

  it('gerencia presentes e datas importantes', async () => {
    const cookie = await withCouple();
    const res = await request(app).post('/api/gifts').set('Cookie', cookie).send({
      title: 'Aniversario',
      date: '2026-08-20',
      person: 'Joao',
      ideas: ['Livro', 'Jantar'],
      budget: 200,
    });
    expect(res.status).toBe(200);
    expect(res.body.gift.ideas).toEqual([
      { text: 'Livro', done: false, cost: 0 },
      { text: 'Jantar', done: false, cost: 0 },
    ]);

    const list = await request(app).get('/api/gifts').set('Cookie', cookie);
    expect(list.body.gifts[0].title).toBe('Aniversario');
  });

  it('lista ideias de date e salva preferencias do casal', async () => {
    const cookie = await withCouple();
    const ideas = await request(app).get('/api/date-ideas').set('Cookie', cookie);
    expect(ideas.status).toBe(200);
    expect(ideas.body.ideas.length).toBeGreaterThan(0);

    const saved = await request(app).post('/api/date-ideas/saved').set('Cookie', cookie).send({
      ideaId: ideas.body.ideas[0].id,
    });
    expect(saved.status).toBe(200);
    expect(saved.body.saved.idea_id).toBe(ideas.body.ideas[0].id);
  });

  it('gera resumo, lembretes e conquistas com dados reais', async () => {
    const cookie = await withCouple();
    await request(app).post('/api/events').set('Cookie', cookie).send({ title: 'Jantar', date: new Date().toLocaleDateString('en-CA') });
    await request(app).post('/api/moments').set('Cookie', cookie).field('text', 'Cafe na varanda');
    await request(app).post('/api/checkins').set('Cookie', cookie).send({ mood: 'bem' });

    const summary = await request(app).get('/api/weekly-summary').set('Cookie', cookie);
    expect(summary.body.summary.eventsCount).toBe(1);
    expect(summary.body.summary.momentsCount).toBe(1);

    const reminders = await request(app).get('/api/reminders').set('Cookie', cookie);
    expect(reminders.body.reminders.length).toBeGreaterThan(0);

    const achievements = await request(app).get('/api/achievements').set('Cookie', cookie);
    expect(achievements.body.achievements.some((a) => a.unlocked)).toBe(true);
  });

  it('salva respostas de quiz e retorna comparacao', async () => {
    const cookie = await withCouple();
    const quizzes = await request(app).get('/api/quizzes').set('Cookie', cookie);
    expect(quizzes.body.quizzes.length).toBeGreaterThan(0);
    const quiz = quizzes.body.quizzes[0];

    const answered = await request(app).post(`/api/quizzes/${quiz.id}/answers`).set('Cookie', cookie).send({
      answers: quiz.questions.map((q) => ({ questionId: q.id, option: q.options[0] })),
    });
    expect(answered.status).toBe(200);
    expect(answered.body.result.myAnswers).toBe(quiz.questions.length);
  });

  it('cria capsulas do tempo e albuns', async () => {
    const cookie = await withCouple();
    const capsule = await request(app).post('/api/time-capsules').set('Cookie', cookie).send({
      title: 'Para nosso futuro',
      message: 'Abrir no aniversario',
      openDate: '2026-12-31',
    });
    expect(capsule.status).toBe(200);
    expect(capsule.body.capsule.title).toBe('Para nosso futuro');

    await request(app).post('/api/moments').set('Cookie', cookie).field('text', 'Primeiro passeio');
    const album = await request(app).post('/api/albums').set('Cookie', cookie).send({ title: 'Nossa retrospectiva' });
    expect(album.status).toBe(200);
    expect(album.body.album.moments.length).toBe(1);
  });

  it('cria sessoes de intimidade e gerencia assinatura interna', async () => {
    const cookie = await withCouple();
    const prompts = await request(app).get('/api/intimacy/prompts').set('Cookie', cookie);
    expect(prompts.body.prompts.length).toBeGreaterThan(0);

    const session = await request(app).post('/api/intimacy/sessions').set('Cookie', cookie).send({
      promptId: prompts.body.prompts[0].id,
      note: 'Conversamos com calma',
    });
    expect(session.status).toBe(200);

    const upgraded = await request(app).patch('/api/subscription').set('Cookie', cookie).send({ plan: 'premium' });
    expect(upgraded.body.subscription.plan).toBe('premium');
    expect(upgraded.body.subscription.entitlements).toContain('premium');
  });
});

// Cria um casal com os dois membros (criador + parceiro) via convite.
async function coupleWithPartner() {
  const a = await login(`ca${seq++}@b.com`);
  const created = await request(app).post('/api/couples').set('Cookie', a).send({ name: 'Dois', milestoneDate: '2024-01-01' });
  const coupleId = created.body.couple.id;
  const inv = await request(app).post(`/api/couples/${coupleId}/invites`).set('Cookie', a);
  const code = inv.body.invite.code;
  const b = await login(`cb${seq++}@b.com`);
  await request(app).post(`/api/invites/${code}/accept`).set('Cookie', b);
  return { a, b };
}

describe('F1 — planos, presentes, quiz, capsula (completo)', () => {
  it('planos: adiciona/remove etapa, notas e delete', async () => {
    const cookie = await withCouple();
    const plan = (await request(app).post('/api/plans').set('Cookie', cookie).send({ title: 'Morar juntos', steps: ['Achar apê'] })).body.plan;
    expect(plan.steps).toHaveLength(1);

    const added = await request(app).post(`/api/plans/${plan.id}/steps`).set('Cookie', cookie).send({ title: 'Comprar móveis' });
    expect(added.body.plan.steps).toHaveLength(2);

    const withNotes = await request(app).patch(`/api/plans/${plan.id}`).set('Cookie', cookie).send({ notes: 'Meta: dezembro' });
    expect(withNotes.body.plan.notes).toBe('Meta: dezembro');

    const detail = await request(app).get(`/api/plans/${plan.id}`).set('Cookie', cookie);
    expect(detail.body.plan.attachments).toEqual([]);

    const delStep = await request(app).delete(`/api/plan-steps/${added.body.plan.steps[1].id}`).set('Cookie', cookie);
    expect(delStep.body.plan.steps).toHaveLength(1);

    expect((await request(app).delete(`/api/plans/${plan.id}`).set('Cookie', cookie)).status).toBe(200);
    expect((await request(app).get('/api/plans').set('Cookie', cookie)).body.plans).toHaveLength(0);
  });

  it('presentes: toggle de ideia, delete e modo surpresa escondido do par', async () => {
    const { a, b } = await coupleWithPartner();
    const gift = (await request(app).post('/api/gifts').set('Cookie', a).send({
      title: 'Presente do par', secret: true, ideas: ['Relógio'], budget: 500,
    })).body.gift;
    expect(gift.secret).toBe(1);

    // criador vê; parceiro não
    expect((await request(app).get('/api/gifts').set('Cookie', a)).body.gifts).toHaveLength(1);
    expect((await request(app).get('/api/gifts').set('Cookie', b)).body.gifts).toHaveLength(0);
    expect((await request(app).get(`/api/gifts/${gift.id}`).set('Cookie', b)).status).toBe(404);

    const toggled = await request(app).patch(`/api/gifts/${gift.id}`).set('Cookie', a).send({
      ideas: [{ text: 'Relógio', done: true, cost: 450 }],
    });
    expect(toggled.body.gift.ideas[0].done).toBe(true);
    expect(toggled.body.gift.ideas[0].cost).toBe(450);

    expect((await request(app).delete(`/api/gifts/${gift.id}`).set('Cookie', a)).status).toBe(200);
  });

  it('quiz: bloqueia premium sem assinatura e libera após upgrade', async () => {
    const cookie = await withCouple();
    const premiumQuiz = (await request(app).get('/api/quizzes').set('Cookie', cookie)).body.quizzes.find((q) => q.premium);
    expect(premiumQuiz).toBeTruthy();

    const answers = premiumQuiz.questions.map((q) => ({ questionId: q.id, option: q.options[0] }));
    const blocked = await request(app).post(`/api/quizzes/${premiumQuiz.id}/answers`).set('Cookie', cookie).send({ answers });
    expect(blocked.status).toBe(402);
    expect(blocked.body.upgrade).toBe(true);

    await request(app).patch('/api/subscription').set('Cookie', cookie).send({ plan: 'premium' });
    const ok = await request(app).post(`/api/quizzes/${premiumQuiz.id}/answers`).set('Cookie', cookie).send({ answers });
    expect(ok.status).toBe(200);
  });

  it('quiz: comparativo aparece quando os dois respondem', async () => {
    const { a, b } = await coupleWithPartner();
    const quiz = (await request(app).get('/api/quizzes').set('Cookie', a)).body.quizzes.find((q) => !q.premium);
    const ans = quiz.questions.map((q) => ({ questionId: q.id, option: q.options[0] }));
    await request(app).post(`/api/quizzes/${quiz.id}/answers`).set('Cookie', a).send({ answers: ans });
    const res = await request(app).post(`/api/quizzes/${quiz.id}/answers`).set('Cookie', b).send({ answers: ans });
    expect(res.body.result.answeredBy).toBe(2);
    const list = await request(app).get('/api/quizzes').set('Cookie', a);
    expect(list.body.quizzes.find((q) => q.id === quiz.id).partnerAnswered).toBe(true);
  });

  it('capsula: selada esconde mensagem; abre só na data e persiste', async () => {
    const cookie = await withCouple();
    const sealed = (await request(app).post('/api/time-capsules').set('Cookie', cookie).send({
      title: 'Futuro', message: 'segredo', openDate: '2099-12-31',
    })).body.capsule;
    expect(sealed.sealed).toBe(true);
    expect(sealed.message).toBe('');

    // tentar abrir antes da data → 409
    const early = await request(app).patch(`/api/time-capsules/${sealed.id}`).set('Cookie', cookie);
    expect(early.status).toBe(409);

    // cápsula com data passada abre e revela
    const ready = (await request(app).post('/api/time-capsules').set('Cookie', cookie).send({
      title: 'Ontem', message: 'ola futuro', openDate: '2020-01-01',
    })).body.capsule;
    expect(ready.sealed).toBe(false);
    expect(ready.message).toBe('ola futuro');
    const opened = await request(app).patch(`/api/time-capsules/${ready.id}`).set('Cookie', cookie);
    expect(opened.status).toBe(200);
    expect(opened.body.capsule.opened_at).toBeTruthy();
  });
});

describe('F2 — conquistas, lembretes, resumo, intimidade', () => {
  it('lembretes: preferências persistem e filtram os tipos', async () => {
    const cookie = await withCouple();
    const first = await request(app).get('/api/reminders').set('Cookie', cookie);
    expect(first.body.prefs.types.checkin).toBe(true);
    expect(first.body.reminders.some((r) => r.id === 'checkin')).toBe(true);

    const patched = await request(app).patch('/api/reminders/prefs').set('Cookie', cookie).send({ types: { checkin: false } });
    expect(patched.body.prefs.types.checkin).toBe(false);

    const after = await request(app).get('/api/reminders').set('Cookie', cookie);
    expect(after.body.reminders.some((r) => r.id === 'checkin')).toBe(false);
  });

  it('conquistas: desbloqueiam com dados reais', async () => {
    const cookie = await withCouple();
    await request(app).post('/api/checkins').set('Cookie', cookie).send({ mood: 'bem' });
    const ach = await request(app).get('/api/achievements').set('Cookie', cookie);
    const checkinBadge = ach.body.achievements.find((a) => a.id === 'first-checkin');
    expect(checkinBadge.unlocked).toBe(true);
    const dates = ach.body.achievements.find((a) => a.id === 'five-dates');
    expect(dates.progress.total).toBe(5);
  });

  it('resumo: semana atual conta eventos e histórico tem 8 semanas', async () => {
    const cookie = await withCouple();
    await request(app).post('/api/events').set('Cookie', cookie).send({ title: 'Date', date: new Date().toLocaleDateString('en-CA') });
    const report = await request(app).get('/api/weekly-report').set('Cookie', cookie);
    expect(report.body.report.events).toBeGreaterThanOrEqual(1);
    expect(report.body.report.highlights.length).toBeGreaterThan(0);
    const history = await request(app).get('/api/weekly-report/history').set('Cookie', cookie);
    expect(history.body.history).toHaveLength(8);
  });

  it('intimidade: sessões, resposta do par, apagar e PIN', async () => {
    const { a, b } = await coupleWithPartner();
    const prompts = (await request(app).get('/api/intimacy/prompts').set('Cookie', a)).body.prompts;
    const free = prompts.find((p) => !p.premium);

    await request(app).post('/api/intimacy/sessions').set('Cookie', a).send({ promptId: free.id, note: 'resposta A' });
    const bRes = await request(app).post('/api/intimacy/sessions').set('Cookie', b).send({ promptId: free.id, note: 'resposta B' });
    expect(bRes.body.partner.note).toBe('resposta A'); // B vê a resposta de A

    const sessions = await request(app).get('/api/intimacy/sessions').set('Cookie', a);
    expect(sessions.body.sessions.length).toBe(2);
    expect(sessions.body.sessions[0].prompt_text).toBeTruthy();

    const del = await request(app).delete(`/api/intimacy/sessions/${sessions.body.sessions[0].id}`).set('Cookie', a);
    expect(del.status).toBe(200);

    // PIN
    await request(app).patch('/api/intimacy/pin').set('Cookie', a).send({ pin: '1234' });
    expect((await request(app).get('/api/intimacy/prompts').set('Cookie', a)).body.hasPin).toBe(true);
    expect((await request(app).post('/api/intimacy/unlock').set('Cookie', a).send({ pin: '0000' })).status).toBe(401);
    expect((await request(app).post('/api/intimacy/unlock').set('Cookie', a).send({ pin: '1234' })).status).toBe(200);
  });

  it('intimidade: trilha premium bloqueada sem assinatura', async () => {
    const cookie = await withCouple();
    const premium = (await request(app).get('/api/intimacy/prompts').set('Cookie', cookie)).body.prompts.find((p) => p.premium);
    const blocked = await request(app).post('/api/intimacy/sessions').set('Cookie', cookie).send({ promptId: premium.id, note: 'x' });
    expect(blocked.status).toBe(402);
  });
});

describe('F3 — álbuns e ideias de date', () => {
  it('date-ideas: salvar, ver que o par salvou e dessalvar', async () => {
    const { a, b } = await coupleWithPartner();
    const ideas = (await request(app).get('/api/date-ideas').set('Cookie', a)).body.ideas;
    expect(ideas.length).toBeGreaterThan(3);
    expect(ideas.some((i) => i.premium)).toBe(true);
    const idea = ideas.find((i) => !i.premium);

    await request(app).post('/api/date-ideas/saved').set('Cookie', b).send({ ideaId: idea.id });
    const forA = (await request(app).get('/api/date-ideas').set('Cookie', a)).body.ideas.find((i) => i.id === idea.id);
    expect(forA.saved).toBe(true);
    expect(forA.savedByPartner).toBe(true);
    expect(forA.savedByMe).toBe(false);

    await request(app).delete(`/api/date-ideas/saved/${idea.id}`).set('Cookie', b);
    const cleared = (await request(app).get('/api/date-ideas').set('Cookie', a)).body.ideas.find((i) => i.id === idea.id);
    expect(cleared.saved).toBe(false);

    const bad = await request(app).post('/api/date-ideas/saved').set('Cookie', a).send({ ideaId: 'inexistente' });
    expect(bad.status).toBe(404);
  });

  it('álbuns: cria com legenda e momentos, edita e apaga', async () => {
    const cookie = await withCouple();
    await request(app).post('/api/moments').set('Cookie', cookie).field('text', 'Praia');
    const moments = (await request(app).get('/api/moments').set('Cookie', cookie)).body.moments;

    const created = await request(app).post('/api/albums').set('Cookie', cookie).send({
      title: 'Nosso verão', caption: 'Dias de sol', momentIds: moments.map((m) => m.id),
    });
    expect(created.status).toBe(200);
    expect(created.body.album.caption).toBe('Dias de sol');
    const id = created.body.album.id;

    const detail = await request(app).get(`/api/albums/${id}`).set('Cookie', cookie);
    expect(detail.body.album.moments).toHaveLength(1);

    const patched = await request(app).patch(`/api/albums/${id}`).set('Cookie', cookie).send({ title: 'Verão 2026' });
    expect(patched.body.album.title).toBe('Verão 2026');

    expect((await request(app).delete(`/api/albums/${id}`).set('Cookie', cookie)).status).toBe(200);
    expect((await request(app).get('/api/albums').set('Cookie', cookie)).body.albums).toHaveLength(0);
  });
});
