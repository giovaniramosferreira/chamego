import { describe, it, expect, beforeEach } from 'vitest';
import { createDb, generateInviteCode } from '../db.js';

let db;
beforeEach(() => { db = createDb(':memory:'); });

describe('users', () => {
  it('upsert cria e atualiza sem apagar campos', () => {
    db.upsertUser({ email: 'a@b.com', name: 'Ana' });
    db.upsertUser({ email: 'a@b.com', picture: 'p.jpg' });
    const u = db.getUser('a@b.com');
    expect(u.name).toBe('Ana');
    expect(u.picture).toBe('p.jpg');
  });

  it('updateUser grava onboarding (json) e aceite de termos', () => {
    db.upsertUser({ email: 'a@b.com' });
    db.updateUser('a@b.com', { onboarding: { goal: 'rotina', stage: 'namorando', alone: 'sozinho' } });
    db.updateUser('a@b.com', { termsAccepted: true, name: 'Ana Paula' });
    const u = db.getUser('a@b.com');
    expect(JSON.parse(u.onboarding).goal).toBe('rotina');
    expect(u.terms_accepted_at).toBeTruthy();
    expect(u.name).toBe('Ana Paula');
  });
});

describe('couples', () => {
  it('createCouple cria espaço com criador como membro', () => {
    db.upsertUser({ email: 'a@b.com' });
    const c = db.createCouple({ name: 'Mari & João', milestoneDate: '2024-06-22', milestoneLabel: 'Início do namoro', creatorEmail: 'a@b.com' });
    expect(c.id).toBeTruthy();
    const mine = db.getCoupleByUser('a@b.com');
    expect(mine.name).toBe('Mari & João');
    expect(mine.members).toHaveLength(1);
    expect(mine.members[0].role).toBe('creator');
  });

  it('um usuário só pode ter um espaço', () => {
    db.upsertUser({ email: 'a@b.com' });
    db.createCouple({ name: 'X', milestoneDate: '2024-01-01', milestoneLabel: 'x', creatorEmail: 'a@b.com' });
    expect(() => db.createCouple({ name: 'Y', milestoneDate: '2024-01-01', milestoneLabel: 'y', creatorEmail: 'a@b.com' })).toThrow();
  });

  it('updateCouple só afeta o espaço do membro', () => {
    db.upsertUser({ email: 'a@b.com' });
    const c = db.createCouple({ name: 'X', milestoneDate: '2024-01-01', milestoneLabel: 'x', creatorEmail: 'a@b.com' });
    expect(db.updateCouple(c.id, 'a@b.com', { name: 'Novo Nome' })).toBe(true);
    expect(db.updateCouple(c.id, 'outro@b.com', { name: 'Hack' })).toBe(false);
    expect(db.getCoupleByUser('a@b.com').name).toBe('Novo Nome');
  });
});

describe('invites', () => {
  function setup() {
    db.upsertUser({ email: 'a@b.com' });
    db.upsertUser({ email: 'p@b.com' });
    return db.createCouple({ name: 'X', milestoneDate: '2024-01-01', milestoneLabel: 'x', creatorEmail: 'a@b.com' });
  }

  it('cria convite pendente e busca por código', () => {
    const c = setup();
    const inv = db.createInvite(c.id, 'a@b.com');
    expect(inv.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    const found = db.getInvite(inv.code);
    expect(found.status).toBe('pending');
    expect(found.couple_id).toBe(c.id);
  });

  it('gerar novo convite revoga o pendente anterior', () => {
    const c = setup();
    const first = db.createInvite(c.id, 'a@b.com');
    const second = db.createInvite(c.id, 'a@b.com');
    expect(db.getInvite(first.code).status).toBe('revoked');
    expect(db.getInvite(second.code).status).toBe('pending');
  });

  it('aceitar convite vincula o parceiro ao espaço', () => {
    const c = setup();
    const inv = db.createInvite(c.id, 'a@b.com');
    expect(db.acceptInvite(inv.code, 'p@b.com')).toBe(true);
    const couple = db.getCoupleByUser('p@b.com');
    expect(couple.id).toBe(c.id);
    expect(couple.members).toHaveLength(2);
    expect(db.getInvite(inv.code).status).toBe('accepted');
  });

  it('convite aceito, revogado ou de quem já tem espaço falha', () => {
    const c = setup();
    const inv = db.createInvite(c.id, 'a@b.com');
    db.acceptInvite(inv.code, 'p@b.com');
    expect(db.acceptInvite(inv.code, 'q@b.com')).toBe(false); // já aceito
    db.upsertUser({ email: 'q@b.com' });
    db.createCouple({ name: 'Z', milestoneDate: '2024-01-01', milestoneLabel: 'z', creatorEmail: 'q@b.com' });
    const inv2 = db.createInvite(c.id, 'a@b.com');
    expect(db.acceptInvite(inv2.code, 'q@b.com')).toBe(false); // já tem espaço
  });
});

describe('login tokens', () => {
  it('token é de uso único e expira', () => {
    db.createLoginToken({ token: 't1', email: 'a@b.com', expiresAt: new Date(Date.now() + 60000).toISOString().replace('T', ' ').slice(0, 19) });
    expect(db.consumeLoginToken('t1')).toEqual({ email: 'a@b.com' });
    expect(db.consumeLoginToken('t1')).toBeNull();
    db.createLoginToken({ token: 't2', email: 'a@b.com', expiresAt: '2000-01-01 00:00:00' });
    expect(db.consumeLoginToken('t2')).toBeNull();
  });
});

describe('generateInviteCode', () => {
  it('gera 6 chars sem ambíguos (0,O,1,I,L)', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateInviteCode()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    }
  });
});
