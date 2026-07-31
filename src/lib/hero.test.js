import { describe, it, expect } from 'vitest';
import { heroDoMomento, momentoDe } from './hero.js';

// Data local, sem fuso pra atrapalhar: `new Date(y, m, d, h)` é hora local, e
// o Início é lido na hora local de quem está com o celular na mão.
const em = (hora, min = 0) => new Date(2026, 6, 15, hora, min);
const hojeISO = em(12).toLocaleDateString('en-CA');
const evento = (extra) => ({ id: 1, title: 'Consulta', date: hojeISO, time: '', location: '', ...extra });
const lista = (extra) => ({ id: 7, title: 'Compras', icon: 'shopping', total: 3, done: 1, ...extra });

describe('momento do dia', () => {
  it('divide o dia como a casa vive', () => {
    expect(momentoDe(em(7))).toBe('manha');
    expect(momentoDe(em(12))).toBe('almoco');
    expect(momentoDe(em(16))).toBe('tarde');
    expect(momentoDe(em(20))).toBe('noite');
    expect(momentoDe(em(2))).toBe('madrugada');
  });
});

describe('o que ocupa o topo do Início', () => {
  it('na hora do jantar, a pergunta é o jantar', () => {
    const h = heroDoMomento({ agora: em(20) });
    expect(h.chave).toBe('comida');
    expect(h.to).toBe('/app/cozinha');
  });

  it('no almoço também', () => {
    expect(heroDoMomento({ agora: em(12) }).chave).toBe('comida');
  });

  // A regra que justifica a feature existir: hora marcada ganha de palpite.
  it('compromisso logo ali ganha até da hora do jantar', () => {
    const h = heroDoMomento({ agora: em(19), eventos: [evento({ time: '20:00', location: 'Clínica' })] });
    expect(h.chave).toBe('compromisso');
    expect(h.texto).toBe('Daqui a 60 min · Clínica');
  });

  it('compromisso longe não sequestra o topo', () => {
    const h = heroDoMomento({ agora: em(20), eventos: [evento({ time: '23:59' })] });
    expect(h.chave).toBe('comida');
  });

  it('compromisso que já passou não vira aviso', () => {
    const h = heroDoMomento({ agora: em(20), eventos: [evento({ time: '18:00' })] });
    expect(h.chave).toBe('comida');
  });

  it('evento de outro dia não conta como hoje', () => {
    const h = heroDoMomento({ agora: em(9), eventos: [evento({ date: '2026-08-30', time: '09:30' })] });
    expect(h.chave).not.toBe('compromisso');
    expect(h.chave).not.toBe('dia');
  });

  it('de manhã mostra o dia que vem pela frente', () => {
    const h = heroDoMomento({ agora: em(7), eventos: [evento({ time: '' }), evento({ id: 2, title: 'Dentista' })] });
    expect(h.chave).toBe('dia');
    expect(h.titulo).toBe('2 compromissos hoje');
    expect(h.texto).toBe('Consulta · Dentista');
  });

  it('à tarde puxa a pendência que ainda dá pra zerar', () => {
    const h = heroDoMomento({ agora: em(16), pendencias: [lista()] });
    expect(h.chave).toBe('lista-7');
    expect(h.texto).toContain('2 itens pendentes');
  });

  it('de madrugada o app não cobra nada', () => {
    expect(heroDoMomento({ agora: em(3), pendencias: [lista()] })).toBe(null);
  });

  it('sem nada urgente, sobra a pergunta que importa', () => {
    const h = heroDoMomento({ agora: em(7) });
    expect(h.chave).toBe('checkin');
  });

  it('check-in feito e nada pendente: topo vazio, e tudo bem', () => {
    expect(heroDoMomento({ agora: em(7), checkinFeito: true })).toBe(null);
    expect(heroDoMomento({ agora: em(16), checkinFeito: true })).toBe(null);
  });
});
