// Visão da foto de compras: o modelo pode chutar quantidade/unidade fora do
// que a gente aceita (número absurdo, unidade que não existe no vocabulário
// fechado). O que sai daqui vai direto pro campo de edição — não pode ser
// lixo, mesmo que a IA erre.
import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { extrairIngredientes } from '../receita/visao.js';

describe('sanitização de quantidade e unidade', () => {
  const chaveOriginal = process.env.ANTHROPIC_API_KEY;

  afterEach(() => {
    vi.unstubAllGlobals();
    if (chaveOriginal === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = chaveOriginal;
  });

  it('clampa quantidade fora do intervalo e troca unidade desconhecida por "un"', async () => {
    process.env.ANTHROPIC_API_KEY = 'chave-de-teste';
    const arquivo = path.join(os.tmpdir(), `foto-teste-${Date.now()}.jpg`);
    fs.writeFileSync(arquivo, Buffer.from([0]));

    const respostaModelo = {
      itens: [
        { nome: 'tomate', confianca: 0.9, quantidade: 999, unidade: 'kg' },
        { nome: 'leite', confianca: 0.8, quantidade: -3, unidade: 'litro' },
        { nome: 'ovo', confianca: 0.7 }, // sem quantidade/unidade nenhuma
      ],
    };
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: JSON.stringify(respostaModelo) }] }),
    })));

    const { disponivel, itens } = await extrairIngredientes(arquivo, 'image/jpeg');
    fs.unlinkSync(arquivo);

    expect(disponivel).toBe(true);
    const [tomate, leite, ovo] = itens;
    expect(tomate.quantidade).toBe(50); // teto do clamp
    expect(tomate.unidade).toBe('kg');
    expect(leite.quantidade).toBe(0.1); // piso do clamp
    expect(leite.unidade).toBe('un'); // "litro" não é do vocabulário fechado (é "L")
    expect(ovo.quantidade).toBe(1);
    expect(ovo.unidade).toBe('un');
  });
});
