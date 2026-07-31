// "Pendências do maridão" é uma lista de tarefas. "Combinados da casa" também.
// "Coisas que eu prometi" também. É a mesma tabela, o mesmo item, o mesmo
// check — muda o nome, o tom e, principalmente, **pra quem o item novo vai por
// padrão**. É esse padrão que faz a máscara funcionar: numa lista de pendências
// dele, ninguém quer marcar "de quem é" trinta vezes.
//
// O tema é sugestão, não cerca: o título é editável e qualquer item pode
// trocar de dono. Um app de casal que decide sozinho de quem é a tarefa está
// arrumando briga, não resolvendo.

export const TEMAS = [
  {
    key: '', title: '', icon: 'list', label: 'Lista comum',
    sub: 'Compras, viagem, o que for', padrao: 'ninguem',
  },
  {
    key: 'dele', title: 'Pendências do maridão', icon: 'check', label: 'Pendências dele',
    sub: 'O que ele ficou de fazer', padrao: 'parceiro',
    vazio: 'Nada pendente pra ele. Aproveita e elogia.',
  },
  {
    key: 'dela', title: 'Pendências da patroa', icon: 'check', label: 'Pendências dela',
    sub: 'O que ela ficou de fazer', padrao: 'parceiro',
    vazio: 'Nada pendente pra ela. Raro e bonito.',
  },
  {
    key: 'meu', title: 'Prometi e vou fazer', icon: 'user', label: 'Minhas promessas',
    sub: 'O que você ficou de fazer', padrao: 'eu',
    vazio: 'Você está em dia. Sério.',
  },
  {
    key: 'casa', title: 'Combinados da casa', icon: 'home', label: 'Combinados da casa',
    sub: 'O que é dos dois, dividido', padrao: 'ninguem',
    vazio: 'Casa em ordem — ou ninguém anotou ainda.',
  },
];

export const TEMA_POR_KEY = Object.fromEntries(TEMAS.map((t) => [t.key, t]));
export const temaDe = (key) => TEMA_POR_KEY[key || ''] || TEMA_POR_KEY[''];

/** Pra quem vai um item novo nesta lista. `''` = de ninguém em especial. */
export function donoPadrao(theme, { meuEmail, parceiro }) {
  const t = temaDe(theme);
  if (t.padrao === 'eu') return meuEmail;
  if (t.padrao === 'parceiro') return parceiro?.email || '';
  return '';
}
