import { describe, it, expect } from 'vitest';
import { alturaEscondida } from './teclado.js';

const vv = (height, offsetTop = 0) => ({ height, offsetTop });

describe('quanto do app o teclado está cobrindo', () => {
  it('teclado aberto: a diferença é a altura dele', () => {
    expect(alturaEscondida(844, vv(508))).toBe(336);
  });

  it('conta o quanto a página foi empurrada pra cima junto', () => {
    // O iOS às vezes rola a viewport visual em vez de só encolher.
    expect(alturaEscondida(844, vv(508, 100))).toBe(236);
  });

  it('sem teclado, é zero — e não um número pequeno qualquer', () => {
    expect(alturaEscondida(844, vv(844))).toBe(0);
  });

  // A barra de endereço do Safari aparece e some o tempo todo. Se ela contasse
  // como teclado, o rodapé ficaria pulando durante a rolagem.
  it('barra do navegador não é teclado', () => {
    expect(alturaEscondida(844, vv(800))).toBe(0);   // 44px
    expect(alturaEscondida(844, vv(770))).toBe(0);   // 74px
    expect(alturaEscondida(844, vv(750))).toBe(94);  // aí sim
  });

  it('navegador sem a API não quebra o layout', () => {
    expect(alturaEscondida(844, null)).toBe(0);
    expect(alturaEscondida(844, undefined)).toBe(0);
  });
});
