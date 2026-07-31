// Os tipos de compromisso da casa. Conta de luz, faxina de terça, feira,
// consulta, aniversário e meta são a MESMA linha no banco — o tipo é só a
// máscara que decide qual pergunta a tela faz e o que ela mostra depois.
//
// É por isso que existe este arquivo em vez de sete telas: uma pergunta a mais
// só aparece quando faz sentido ("pra quem?" numa conta, "de quem é?" numa
// tarefa de casa), e o formulário nunca mostra sete campos vazios de uma vez.

export const TIPOS = [
  {
    key: 'evento', label: 'Evento', icon: 'calendar',
    exemplo: 'Jantar de aniversário', repetePadrao: '',
  },
  {
    key: 'conta', label: 'Conta', icon: 'money',
    exemplo: 'Aluguel', repetePadrao: 'monthly',
    valor: true, destino: true, parcelas: true,
    feitoLabel: 'paga', acaoLabel: 'Marcar como paga',
  },
  {
    key: 'casa', label: 'Casa', icon: 'broom',
    exemplo: 'Lavar roupa', repetePadrao: 'weekly',
    responsavel: true, feitoLabel: 'feita', acaoLabel: 'Marcar como feita',
  },
  {
    key: 'feira', label: 'Feira', icon: 'shopping',
    exemplo: 'Fazer feira', repetePadrao: 'weekly',
    responsavel: true, feitoLabel: 'feita', acaoLabel: 'Marcar como feita',
  },
  {
    key: 'saude', label: 'Saúde', icon: 'heart',
    exemplo: 'Consulta / checkup', repetePadrao: 'yearly',
    responsavel: true, feitoLabel: 'feita', acaoLabel: 'Marcar como feita',
  },
  {
    key: 'aniversario', label: 'Aniversário', icon: 'gift',
    exemplo: 'Aniversário da sogra', repetePadrao: 'yearly',
  },
  {
    key: 'meta', label: 'Meta', icon: 'target',
    exemplo: 'Fechar a reserva de emergência', repetePadrao: '',
    feitoLabel: 'batida', acaoLabel: 'Marcar como batida',
  },
];

export const TIPO_POR_KEY = Object.fromEntries(TIPOS.map((t) => [t.key, t]));
export const tipoDe = (key) => TIPO_POR_KEY[key] || TIPO_POR_KEY.evento;

export const FREQUENCIAS = [
  { key: '', label: 'Não repete' },
  { key: 'daily', label: 'Todo dia' },
  { key: 'weekly', label: 'Toda semana' },
  { key: 'biweekly', label: '15 em 15 dias' },
  { key: 'monthly', label: 'Todo mês' },
  { key: 'yearly', label: 'Todo ano' },
];

// Só o que pode ser marcado como resolvido aparece com bolinha de check. Um
// aniversário não se "faz"; uma faxina, sim.
export const podeMarcar = (key) => !!tipoDe(key).feitoLabel;
