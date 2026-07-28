// O "+" global só é confiável se o que ele "entende" for previsível.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseQuickText } from './quick-parse.js';

// Quarta-feira, 4 de março de 2026, 10h.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 2, 4, 10, 0, 0));
});
afterEach(() => vi.useRealTimers());

describe('parseQuickText', () => {
  it('lê hora, dia da semana e local', () => {
    const r = parseQuickText('jantar sexta 20h no Oliva');
    expect(r.title).toBe('jantar');
    expect(r.time).toBe('20:00');
    expect(r.date).toBe('2026-03-06'); // próxima sexta
    expect(r.location).toBe('Oliva');
  });

  it('entende hoje, amanhã e minutos', () => {
    expect(parseQuickText('consulta hoje 9:30').date).toBe('2026-03-04');
    expect(parseQuickText('consulta hoje 9:30').time).toBe('09:30');
    expect(parseQuickText('feira amanhã').date).toBe('2026-03-05');
    expect(parseQuickText('cinema 20h30').time).toBe('20:30');
  });

  it('aceita data numérica e por extenso, jogando pro ano que vem quando já passou', () => {
    expect(parseQuickText('aniversário 12/12').date).toBe('2026-12-12');
    expect(parseQuickText('viagem 10/01').date).toBe('2027-01-10'); // já passou em 2026
    expect(parseQuickText('festa 20 de junho').date).toBe('2026-06-20');
  });

  it('quando não reconhece nada, tudo continua no título', () => {
    const r = parseQuickText('comprar café');
    expect(r).toEqual({ title: 'comprar café', date: '', time: '', location: '' });
  });

  it('não confunde número solto com hora', () => {
    const r = parseQuickText('comprar 2 pães');
    expect(r.time).toBe('');
    expect(r.title).toBe('comprar 2 pães');
  });

  it('texto vazio não quebra', () => {
    expect(parseQuickText('').title).toBe('');
    expect(parseQuickText(undefined).title).toBe('');
  });
});
