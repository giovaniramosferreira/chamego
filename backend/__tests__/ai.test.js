import { describe, it, expect } from 'vitest';
import { generatePageContent } from '../ai.js';

describe('generatePageContent', () => {
  it('sem ANTHROPIC_API_KEY usa fallbacks e nunca lança', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const out = await generatePageContent({
      titulo: 'Ana & Léo', dataInicio: '2023-01-10',
      dataNasc1: '1995-04-10', dataNasc2: '1996-08-25',
      mensagem: 'te amo', conquistas: [],
    });
    expect(out.horoscopoTexto.length).toBeGreaterThan(50);
    expect(out.cartaDeAmor).toContain('Ana');
    expect(out.compatibilidade.scoreGeral).toBeGreaterThanOrEqual(75);
    expect(out.signo1.name).toBe('Áries');
  });
});
