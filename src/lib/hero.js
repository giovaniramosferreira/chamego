// O Início não pode ser a mesma tela às 7h e às 20h. Esta função decide o que
// ocupa o topo — e é pura de propósito: regra de produto discutível e testável
// vale mais que um monte de `if` espalhado no meio do JSX.
//
// Duas regras que valem pra tudo aqui:
//   1. Hora marcada ganha de qualquer palpite. Consulta às 19h é mais
//      importante que a pergunta do jantar.
//   2. Devolver `null` é resposta válida. Topo vazio é melhor que topo com
//      cobrança inventada — é o que impede o Início de virar chateação.

export function momentoDe(agora) {
  const h = agora.getHours();
  if (h >= 5 && h < 11) return 'manha';
  if (h >= 11 && h < 14) return 'almoco';
  if (h >= 14 && h < 18) return 'tarde';
  if (h >= 18 && h < 23) return 'noite';
  return 'madrugada';
}

const diaDe = (agora) => agora.toLocaleDateString('en-CA');

// Minutos até o evento, quando ele tem hora. Sem hora não há contagem: "hoje"
// é a única promessa que o dado sustenta.
function minutosAte(evento, agora) {
  if (!evento.time) return null;
  const [h, m] = String(evento.time).split(':').map(Number);
  if (!Number.isFinite(h)) return null;
  const quando = new Date(agora);
  quando.setHours(h, m || 0, 0, 0);
  return Math.round((quando.getTime() - agora.getTime()) / 60_000);
}

const PROXIMO_MIN = 180; // 3 horas: perto o bastante pra mudar o que se faz agora

export function heroDoMomento({ agora = new Date(), eventos = [], pendencias = [], checkinFeito = false } = {}) {
  const hoje = diaDe(agora);
  const doDia = eventos.filter((e) => e.date === hoje);

  // 1. Compromisso logo ali ganha de tudo.
  const logo = doDia
    .map((e) => ({ e, faltam: minutosAte(e, agora) }))
    .filter((x) => x.faltam !== null && x.faltam >= 0 && x.faltam <= PROXIMO_MIN)
    .sort((a, b) => a.faltam - b.faltam)[0];
  if (logo) {
    const onde = logo.e.location ? ` · ${logo.e.location}` : '';
    return {
      chave: 'compromisso',
      refId: logo.e.id,
      icone: 'clock',
      titulo: logo.e.title,
      texto: logo.faltam <= 60 ? `Daqui a ${logo.faltam} min${onde}` : `Hoje às ${logo.e.time}${onde}`,
      cta: 'Ver na agenda',
      to: '/app/agenda',
    };
  }

  const momento = momentoDe(agora);

  // 2. Fome tem hora. Às 20h de quarta a pergunta da casa é uma só.
  if (momento === 'almoco' || momento === 'noite') {
    return {
      chave: 'comida',
      icone: 'heart',
      titulo: 'O que a gente come hoje?',
      texto: 'Gira a roda e sai uma receita — sem escolher, sem rolar feed.',
      cta: 'Girar',
      to: '/app/cozinha',
    };
  }

  // 3. De manhã o que importa é o que vem pela frente.
  if (momento === 'manha' && doDia.length) {
    return {
      chave: 'dia',
      icone: 'calendar',
      titulo: doDia.length === 1 ? 'Um compromisso hoje' : `${doDia.length} compromissos hoje`,
      texto: doDia.slice(0, 2).map((e) => e.title).join(' · '),
      cta: 'Ver o dia',
      to: '/app/agenda',
    };
  }

  // 4. À tarde ainda dá tempo de resolver o que ficou.
  if (momento === 'tarde' && pendencias.length) {
    const lista = pendencias[0];
    const faltam = lista.total - lista.done;
    return {
      chave: `lista-${lista.id}`,
      refId: lista.id,
      icone: lista.icon || 'list',
      titulo: lista.title,
      texto: `${faltam} ${faltam === 1 ? 'item pendente' : 'itens pendentes'} — dá pra zerar antes do jantar.`,
      cta: 'Abrir',
      to: `/app/listas/${lista.id}`,
    };
  }

  // 5. Madrugada não é hora de cobrar nada de ninguém.
  if (momento === 'madrugada') return null;

  // 6. Sobrou o que sempre importa: como vocês estão hoje.
  if (!checkinFeito) {
    return {
      chave: 'checkin',
      icone: 'heart',
      titulo: 'Como você está hoje?',
      texto: 'Um toque e seu par sabe — é o que abre conversa sem precisar de assunto.',
      cta: 'Fazer check-in',
      to: '/app/voces',
    };
  }
  return null;
}
