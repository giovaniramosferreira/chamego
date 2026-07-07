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
    expect(res.body.gift.ideas).toEqual(['Livro', 'Jantar']);

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
