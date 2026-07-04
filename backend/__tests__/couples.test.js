import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { db } from '../db.js';

async function login(email) {
  await request(app).post('/api/auth/magic-link').send({ email });
  const token = db._rawLoginToken(email);
  const res = await request(app).get(`/api/auth/magic?t=${token}`);
  return res.headers['set-cookie'][0].split(';')[0];
}

describe('espaço do casal', () => {
  it('cria espaço e aparece no /api/me', async () => {
    const cookie = await login('cria@b.com');
    const res = await request(app).post('/api/couples').set('Cookie', cookie)
      .send({ name: 'Mari & João', milestoneDate: '2024-06-22', milestoneLabel: 'Início do namoro' });
    expect(res.status).toBe(200);
    expect(res.body.couple.name).toBe('Mari & João');
    const me = await request(app).get('/api/me').set('Cookie', cookie);
    expect(me.body.couple.id).toBe(res.body.couple.id);
  });

  it('valida campos e impede segundo espaço', async () => {
    const cookie = await login('dupla@b.com');
    expect((await request(app).post('/api/couples').set('Cookie', cookie).send({ name: '' })).status).toBe(400);
    await request(app).post('/api/couples').set('Cookie', cookie).send({ name: 'A', milestoneDate: '2024-01-01' });
    const again = await request(app).post('/api/couples').set('Cookie', cookie).send({ name: 'B', milestoneDate: '2024-01-01' });
    expect(again.status).toBe(409);
  });

  it('edita espaço (só membro)', async () => {
    const cookie = await login('edita@b.com');
    const { body } = await request(app).post('/api/couples').set('Cookie', cookie).send({ name: 'A', milestoneDate: '2024-01-01' });
    const res = await request(app).patch(`/api/couples/${body.couple.id}`).set('Cookie', cookie).send({ name: 'Novo' });
    expect(res.body.couple.name).toBe('Novo');
    const stranger = await login('estranho@b.com');
    expect((await request(app).patch(`/api/couples/${body.couple.id}`).set('Cookie', stranger).send({ name: 'Hack' })).status).toBe(404);
  });
});

describe('convites', () => {
  let seq = 0;
  async function coupleWithInvite() {
    const cookie = await login(`dono${seq++}@b.com`);
    const { body } = await request(app).post('/api/couples').set('Cookie', cookie).send({ name: 'Nós', milestoneDate: '2024-01-01' });
    const inv = await request(app).post(`/api/couples/${body.couple.id}/invites`).set('Cookie', cookie);
    return { cookie, coupleId: body.couple.id, code: inv.body.invite.code };
  }

  it('gera convite (só membro) e preview público funciona', async () => {
    const { code } = await coupleWithInvite();
    const preview = await request(app).get(`/api/invites/${code}`);
    expect(preview.status).toBe(200);
    expect(preview.body.coupleName).toBe('Nós');
    expect(preview.body.invitedBy).toBeTruthy();
  });

  it('parceiro aceita e vira membro', async () => {
    const { code, coupleId } = await coupleWithInvite();
    const partner = await login('par@b.com');
    const res = await request(app).post(`/api/invites/${code}/accept`).set('Cookie', partner);
    expect(res.status).toBe(200);
    const me = await request(app).get('/api/me').set('Cookie', partner);
    expect(me.body.couple.id).toBe(coupleId);
    expect(me.body.partner).toBeTruthy();
  });

  it('quem já tem espaço não aceita convite', async () => {
    const { code } = await coupleWithInvite();
    const busy = await login('ocupado@b.com');
    await request(app).post('/api/couples').set('Cookie', busy).send({ name: 'Outro', milestoneDate: '2024-01-01' });
    const res = await request(app).post(`/api/invites/${code}/accept`).set('Cookie', busy);
    expect(res.status).toBe(409);
  });

  it('convite inexistente ou usado dá 404/410', async () => {
    expect((await request(app).get('/api/invites/XXXXXX')).status).toBe(404);
    const { code } = await coupleWithInvite();
    const p1 = await login('p1@b.com');
    await request(app).post(`/api/invites/${code}/accept`).set('Cookie', p1);
    const p2 = await login('p2@b.com');
    expect((await request(app).post(`/api/invites/${code}/accept`).set('Cookie', p2)).status).toBe(410);
  });
});
