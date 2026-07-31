import { describe, it, expect } from 'vitest';
import { formatarBRL, paraCampo, paraCentavos } from './dinheiro.js';

describe('o que a pessoa digita vira centavos', () => {
  it('entende o jeito brasileiro de escrever', () => {
    expect(paraCentavos('1.800,50')).toBe(180_050);
    expect(paraCentavos('1.800')).toBe(180_000);      // mil e oitocentos, não 1,80
    expect(paraCentavos('1800')).toBe(180_000);
    expect(paraCentavos('1800,5')).toBe(180_050);
    expect(paraCentavos('12,90')).toBe(1_290);
    expect(paraCentavos('0,99')).toBe(99);
  });

  it('aguenta o que vem colado do teclado', () => {
    expect(paraCentavos('R$ 1.800,00')).toBe(180_000);
    expect(paraCentavos(' 250 ')).toBe(25_000);
    expect(paraCentavos('1.234.567,89')).toBe(123_456_789);
  });

  it('ponto decimal digitado à moda americana ainda funciona', () => {
    expect(paraCentavos('1800.50')).toBe(180_050);
    expect(paraCentavos('0.5')).toBe(50);
  });

  it('vazio e lixo viram nulo, não zero', () => {
    // Zero é um valor; "não informado" é outra coisa, e a soma do mês
    // precisa saber a diferença.
    expect(paraCentavos('')).toBe(null);
    expect(paraCentavos('   ')).toBe(null);
    expect(paraCentavos('abc')).toBe(null);
    expect(paraCentavos(null)).toBe(null);
    expect(paraCentavos(undefined)).toBe(null);
  });

  it('arredonda pro centavo, sem sobra de ponto flutuante', () => {
    expect(paraCentavos('0,1')).toBe(10);
    expect(paraCentavos('0,2')).toBe(20);
    expect(paraCentavos('19,999')).toBe(2_000);
  });
});

describe('centavos viram texto', () => {
  it('mostra como se lê em português', () => {
    expect(formatarBRL(180_000).replace(/\u00a0/g, ' ')).toBe('R$ 1.800,00');
    expect(formatarBRL(99).replace(/\u00a0/g, ' ')).toBe('R$ 0,99');
    expect(formatarBRL(null)).toBe('');
  });

  it('no campo de edição sai sem o cifrão', () => {
    expect(paraCampo(180_050)).toBe('1.800,50');
    expect(paraCampo(null)).toBe('');
  });

  it('ida e volta não perde centavo', () => {
    for (const c of [1, 99, 1_290, 180_050, 123_456_789]) {
      expect(paraCentavos(paraCampo(c))).toBe(c);
    }
  });
});
