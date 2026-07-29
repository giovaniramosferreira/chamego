// O card é marketing: se o número ou a assinatura saírem errados, o post vira
// ruído. Testa-se o conteúdo desenhado, sem depender de canvas de verdade.
import { describe, it, expect } from 'vitest';
import { buildCaption, daysTogether, drawCounterCard, formatDays, formatMilestone, wrapText } from './share-card.js';

// Contexto falso: registra o que foi escrito e mede texto de forma previsível.
function fakeCtx() {
  const textos = [];
  return {
    textos,
    canvas: { width: 1080, height: 1920 },
    fillStyle: '', font: '', textAlign: '',
    fillRect() {}, beginPath() {}, closePath() {}, fill() {}, save() {}, restore() {},
    moveTo() {}, bezierCurveTo() {}, roundRect() {},
    measureText: (t) => ({ width: String(t).length * 20 }),
    fillText: (t) => textos.push(String(t)),
  };
}

describe('números e datas', () => {
  it('conta dias desde a data-marco', () => {
    const agora = new Date('2026-01-11T12:00:00').getTime();
    expect(daysTogether('2026-01-01', agora)).toBe(10);
    expect(daysTogether('', agora)).toBe(0);
    expect(daysTogether('2030-01-01', agora)).toBe(0); // futuro não vira negativo
  });

  it('formata milhar em português e data por extenso', () => {
    expect(formatDays(1243)).toBe('1.243');
    expect(formatMilestone('2024-06-22')).toBe('22 de junho de 2024');
    expect(formatMilestone('')).toBe('');
  });

  it('legenda leva o casal, os dias e a assinatura', () => {
    const caption = buildCaption({ coupleName: 'Mari & João', days: 743, milestoneDate: '2024-06-22' });
    expect(caption).toContain('743 dias de Mari & João');
    expect(caption).toContain('desde 22 de junho de 2024');
    expect(caption).toContain('chamego.online');
  });
});

describe('quebra de linha', () => {
  it('respeita a largura disponível', () => {
    const ctx = fakeCtx();
    // largura falsa: 20px por caractere, então cabem 10 caracteres por linha
    expect(wrapText(ctx, 'Mari e João para sempre', 200)).toEqual(['Mari e', 'João para', 'sempre']);
  });

  it('palavra sozinha maior que a largura não some', () => {
    const ctx = fakeCtx();
    expect(wrapText(ctx, 'Bartholomeu', 40)).toEqual(['Bartholomeu']);
  });
});

describe('desenho do card', () => {
  it('escreve marca, nome, contador e assinatura', () => {
    const ctx = fakeCtx();
    drawCounterCard(ctx, { coupleName: 'Mari & João', days: 1243, milestoneLabel: 'Início do namoro', milestoneDate: '2024-06-22' });
    const tudo = ctx.textos.join('|');
    expect(tudo).toContain('chamego');
    expect(tudo).toContain('Mari & João');
    expect(tudo).toContain('1.243');
    expect(tudo).toContain('dias');
    expect(tudo).toContain('INÍCIO DO NAMORO');
    expect(tudo).toContain('desde 22 de junho de 2024');
    expect(tudo).toContain('chamego.online');
  });

  it('um dia é "dia", não "dias"', () => {
    const ctx = fakeCtx();
    drawCounterCard(ctx, { coupleName: 'Nós', days: 1 });
    expect(ctx.textos).toContain('dia');
    expect(ctx.textos).not.toContain('dias');
  });

  it('sem data-marco não escreve a linha "desde"', () => {
    const ctx = fakeCtx();
    drawCounterCard(ctx, { coupleName: 'Nós', days: 10, milestoneDate: '' });
    expect(ctx.textos.join('|')).not.toContain('desde');
  });

  it('nome comprido cabe em no máximo duas linhas', () => {
    const ctx = fakeCtx();
    drawCounterCard(ctx, { coupleName: 'Mariana Aparecida e João Vitor de Assis Pereira', days: 5 });
    const linhasDoNome = ctx.textos.filter((t) => t.includes('Mariana') || t.includes('Vitor'));
    expect(linhasDoNome.length).toBeLessThanOrEqual(2);
  });
});
