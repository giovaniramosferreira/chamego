// O motor de repetição da agenda. O que não pode quebrar: aluguel todo dia 5
// tem que cair no dia 5 de todo mês (inclusive fevereiro), parcela 12x tem que
// acabar na décima segunda, e uma janela grande num evento diário não pode
// derrubar o servidor.
import { describe, it, expect } from 'vitest';
import { descreverRecorrencia, ocorrenciasEntre, parcelaDe, proximaOcorrencia } from '../agenda/recorrencia.js';

const ev = (extra) => ({ date: '2026-01-05', recurrence: '', until: '', installments: null, ...extra });

describe('sem repetição', () => {
  it('devolve a própria data, e só se couber na janela', () => {
    expect(ocorrenciasEntre(ev(), '2026-01-01', '2026-01-31')).toEqual(['2026-01-05']);
    expect(ocorrenciasEntre(ev(), '2026-02-01', '2026-02-28')).toEqual([]);
  });

  it('data inválida não vira ocorrência', () => {
    expect(ocorrenciasEntre(ev({ date: 'ontem' }), '2026-01-01', '2026-12-31')).toEqual([]);
    expect(ocorrenciasEntre(ev(), '2026-12-31', '2026-01-01')).toEqual([]);
  });
});

describe('todo mês', () => {
  it('cai no mesmo dia, mês após mês', () => {
    const datas = ocorrenciasEntre(ev({ recurrence: 'monthly' }), '2026-01-01', '2026-04-30');
    expect(datas).toEqual(['2026-01-05', '2026-02-05', '2026-03-05', '2026-04-05']);
  });

  // O caso que quebra implementação ingênua: dia 31 vazando pro mês seguinte.
  it('dia 31 vira o último dia do mês, nunca o dia 1º do mês seguinte', () => {
    const datas = ocorrenciasEntre(ev({ date: '2026-01-31', recurrence: 'monthly' }), '2026-01-01', '2026-05-31');
    expect(datas).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31']);
  });

  it('não inventa ocorrência antes da data de início', () => {
    const datas = ocorrenciasEntre(ev({ date: '2026-03-10', recurrence: 'monthly' }), '2026-01-01', '2026-04-30');
    expect(datas).toEqual(['2026-03-10', '2026-04-10']);
  });

  it('janela no meio da série começa na janela, não no início', () => {
    const datas = ocorrenciasEntre(ev({ recurrence: 'monthly' }), '2026-06-01', '2026-07-31');
    expect(datas).toEqual(['2026-06-05', '2026-07-05']);
  });
});

describe('semana e quinzena', () => {
  it('herda o dia da semana da data âncora', () => {
    // 2026-01-05 é uma segunda-feira.
    const datas = ocorrenciasEntre(ev({ recurrence: 'weekly' }), '2026-01-01', '2026-01-31');
    expect(datas).toEqual(['2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26']);
  });

  it('quinzenal pula uma', () => {
    const datas = ocorrenciasEntre(ev({ recurrence: 'biweekly' }), '2026-01-01', '2026-02-28');
    expect(datas).toEqual(['2026-01-05', '2026-01-19', '2026-02-02', '2026-02-16']);
  });

  it('diário numa janela grande responde rápido e sem travar', () => {
    const t = Date.now();
    const datas = ocorrenciasEntre(ev({ date: '2010-01-01', recurrence: 'daily' }), '2026-01-01', '2026-01-10');
    expect(datas).toEqual([
      '2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05',
      '2026-01-06', '2026-01-07', '2026-01-08', '2026-01-09', '2026-01-10',
    ]);
    expect(Date.now() - t).toBeLessThan(200);
  });
});

describe('todo ano', () => {
  it('aniversário cai na mesma data todo ano', () => {
    const datas = ocorrenciasEntre(ev({ date: '2020-11-02', recurrence: 'yearly' }), '2026-01-01', '2028-12-31');
    expect(datas).toEqual(['2026-11-02', '2027-11-02', '2028-11-02']);
  });

  it('29 de fevereiro sobrevive a ano comum', () => {
    const datas = ocorrenciasEntre(ev({ date: '2024-02-29', recurrence: 'yearly' }), '2026-01-01', '2028-12-31');
    expect(datas).toEqual(['2026-02-28', '2027-02-28', '2028-02-29']);
  });
});

describe('fim da série', () => {
  it('"até" corta a repetição', () => {
    const datas = ocorrenciasEntre(ev({ recurrence: 'monthly', until: '2026-03-31' }), '2026-01-01', '2026-12-31');
    expect(datas).toEqual(['2026-01-05', '2026-02-05', '2026-03-05']);
  });

  it('parcelado em 3x acaba na terceira', () => {
    const datas = ocorrenciasEntre(ev({ recurrence: 'monthly', installments: 3 }), '2026-01-01', '2026-12-31');
    expect(datas).toEqual(['2026-01-05', '2026-02-05', '2026-03-05']);
  });

  it('sabe qual parcela é cada data', () => {
    const parcelado = ev({ recurrence: 'monthly', installments: 12 });
    expect(parcelaDe(parcelado, '2026-01-05')).toEqual({ n: 1, de: 12 });
    expect(parcelaDe(parcelado, '2026-03-05')).toEqual({ n: 3, de: 12 });
    expect(parcelaDe(ev(), '2026-01-05')).toBe(null);
  });
});

describe('próxima ocorrência', () => {
  it('acha a próxima a partir de hoje, inclusive hoje', () => {
    const mensal = ev({ recurrence: 'monthly' });
    expect(proximaOcorrencia(mensal, '2026-01-05')).toBe('2026-01-05');
    expect(proximaOcorrencia(mensal, '2026-01-06')).toBe('2026-02-05');
  });

  it('série encerrada não tem próxima', () => {
    expect(proximaOcorrencia(ev({ recurrence: 'monthly', until: '2026-02-28' }), '2026-06-01')).toBe(null);
  });
});

describe('frase da recorrência', () => {
  it('fala como gente', () => {
    expect(descreverRecorrencia(ev())).toBe('');
    expect(descreverRecorrencia(ev({ recurrence: 'monthly' }))).toBe('Todo mês · dia 5');
    expect(descreverRecorrencia(ev({ recurrence: 'weekly' }))).toBe('Toda semana · segunda');
    expect(descreverRecorrencia(ev({ recurrence: 'yearly' }))).toBe('Todo ano');
    expect(descreverRecorrencia(ev({ recurrence: 'monthly', installments: 12 }))).toBe('Todo mês · dia 5 · 12x');
  });
});
