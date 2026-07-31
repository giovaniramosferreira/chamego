// Listas temáticas. A tese: "pendências do maridão" é a mesma lista de sempre
// com um tema e um dono padrão. O que precisa ser inquebrável é o dono — se o
// app errar de quem é a tarefa, ele está arrumando briga em vez de resolver.
import { describe, it, expect } from 'vitest';
import request from 'supertest';

process.env.ADMIN_KEY = process.env.ADMIN_KEY || 'chave-de-teste';

import { app } from '../server.js';
import { db } from '../db.js';

let seq = 0;
async function login(email) {
  await request(app).post('/api/auth/magic-link').send({ email });
  const token = db._rawLoginToken(email);
  const res = await request(app).get(`/api/auth/magic?t=${token}`);
  return res.headers['set-cookie'][0].split(';')[0];
}
async function newSpace() {
  const email = `listas${seq++}@b.com`;
  const cookie = await login(email);
  const res = await request(app).post('/api/couples').set('Cookie', cookie)
    .send({ name: 'Nós', milestoneDate: '2024-01-01', seed: false });
  return { cookie, email, couple: res.body.couple };
}

describe('lista com tema', () => {
  it('guarda o tema sem deixar de ser uma lista comum', async () => {
    const { cookie } = await newSpace();
    const res = await request(app).post('/api/lists').set('Cookie', cookie)
      .send({ title: 'Pendências do maridão', theme: 'dele', icon: 'check' });
    expect(res.body.list).toMatchObject({ title: 'Pendências do maridão', theme: 'dele', kind: 'shared' });
  });

  it('tema é opcional: lista sem tema continua funcionando igual', async () => {
    const { cookie } = await newSpace();
    const res = await request(app).post('/api/lists').set('Cookie', cookie).send({ title: 'Compras' });
    expect(res.body.list.theme).toBe('');
  });
});

describe('dono do item', () => {
  it('item nasce com o dono que a tela mandou', async () => {
    const { cookie } = await newSpace();
    const { body } = await request(app).post('/api/lists').set('Cookie', cookie)
      .send({ title: 'Pendências do maridão', theme: 'dele' });
    const res = await request(app).post(`/api/lists/${body.list.id}/items`).set('Cookie', cookie)
      .send({ text: 'Trocar a lâmpada', assignee: 'ele@b.com' });
    expect(res.body.list.items[0]).toMatchObject({ text: 'Trocar a lâmpada', assignee: 'ele@b.com', done: 0 });
  });

  it('sem dono informado, o item é dos dois', async () => {
    const { cookie } = await newSpace();
    const { body } = await request(app).post('/api/lists').set('Cookie', cookie).send({ title: 'Compras' });
    const res = await request(app).post(`/api/lists/${body.list.id}/items`).set('Cookie', cookie)
      .send({ text: 'Arroz' });
    expect(res.body.list.items[0].assignee).toBe('');
  });

  it('dá pra trocar o dono e também tirar o dono', async () => {
    const { cookie } = await newSpace();
    const { body } = await request(app).post('/api/lists').set('Cookie', cookie).send({ title: 'Casa' });
    const criado = await request(app).post(`/api/lists/${body.list.id}/items`).set('Cookie', cookie)
      .send({ text: 'Lavar a louça', assignee: 'a@b.com' });
    const item = criado.body.list.items[0];

    const trocado = await request(app).patch(`/api/items/${item.id}`).set('Cookie', cookie)
      .send({ assignee: 'b@b.com' });
    expect(trocado.body.list.items[0].assignee).toBe('b@b.com');

    // Voltar pra "dos dois" precisa ser possível: string vazia é um valor.
    const semDono = await request(app).patch(`/api/items/${item.id}`).set('Cookie', cookie)
      .send({ assignee: '' });
    expect(semDono.body.list.items[0].assignee).toBe('');
  });

  it('marcar como feito não mexe no dono', async () => {
    const { cookie } = await newSpace();
    const { body } = await request(app).post('/api/lists').set('Cookie', cookie).send({ title: 'Casa' });
    const criado = await request(app).post(`/api/lists/${body.list.id}/items`).set('Cookie', cookie)
      .send({ text: 'Tirar o lixo', assignee: 'a@b.com' });
    const item = criado.body.list.items[0];

    const res = await request(app).patch(`/api/items/${item.id}`).set('Cookie', cookie).send({ done: true });
    expect(res.body.list.items[0]).toMatchObject({ done: 1, assignee: 'a@b.com' });
  });
});

describe('quantas são minhas', () => {
  it('conta só o que é meu e está em aberto', async () => {
    const { cookie, email } = await newSpace();
    const { body } = await request(app).post('/api/lists').set('Cookie', cookie)
      .send({ title: 'Combinados', theme: 'casa' });
    const listId = body.list.id;

    for (const [texto, dono] of [['Minha 1', email], ['Minha 2', email], ['Do par', 'outro@b.com'], ['De ninguém', '']]) {
      await request(app).post(`/api/lists/${listId}/items`).set('Cookie', cookie).send({ text: texto, assignee: dono });
    }
    const antes = await request(app).get('/api/lists').set('Cookie', cookie);
    expect(antes.body.lists.find((l) => l.id === listId).mine).toBe(2);

    // Concluída deixa de cobrar.
    const lista = await request(app).get(`/api/lists/${listId}`).set('Cookie', cookie);
    const minha = lista.body.list.items.find((i) => i.text === 'Minha 1');
    await request(app).patch(`/api/items/${minha.id}`).set('Cookie', cookie).send({ done: true });

    const depois = await request(app).get('/api/lists').set('Cookie', cookie);
    expect(depois.body.lists.find((l) => l.id === listId).mine).toBe(1);
  });

  it('a conta é de quem pergunta, não da lista', async () => {
    const { cookie, email, couple } = await newSpace();
    const { body } = await request(app).post('/api/lists').set('Cookie', cookie).send({ title: 'Casa' });
    await request(app).post(`/api/lists/${body.list.id}/items`).set('Cookie', cookie)
      .send({ text: 'Só minha', assignee: email });

    expect(db.listLists(couple.id, email).find((l) => l.id === body.list.id).mine).toBe(1);
    expect(db.listLists(couple.id, 'outra@pessoa.com').find((l) => l.id === body.list.id).mine).toBe(0);
  });
});

describe('escopo do casal', () => {
  it('um casal não mexe no item do outro', async () => {
    const casaA = await newSpace();
    const casaB = await newSpace();
    const { body } = await request(app).post('/api/lists').set('Cookie', casaA.cookie).send({ title: 'Casa' });
    const criado = await request(app).post(`/api/lists/${body.list.id}/items`).set('Cookie', casaA.cookie)
      .send({ text: 'Segredo', assignee: casaA.email });

    const res = await request(app).patch(`/api/items/${criado.body.list.items[0].id}`).set('Cookie', casaB.cookie)
      .send({ assignee: casaB.email });
    expect(res.status).toBe(404);
  });
});
