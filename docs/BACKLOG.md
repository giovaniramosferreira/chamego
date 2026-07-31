# Backlog

Ideias combinadas que ainda não estão no app, com a decisão de produto já
tomada quando existe uma. Não é lista de tarefas: é o lugar onde a razão de
cada coisa fica escrita antes que ela seja esquecida.

Regra do arquivo: item que entrou no app **sai daqui** e vira código. Item que
foi recusado fica, com o motivo — a mesma ideia volta a cada seis meses.

---

## Alimentação

O ciclo completo é **planejar → comprar → cozinhar**, e hoje só existe o último
pedaço. A dor declarada: indecisão na hora de comer e delivery demais.

### 1. A ponte: o que falta vai pra lista de compras

A tela da receita **já sabe** o que falta em casa (`compararDespensa` devolve
`faltaEssencial`, a interface mostra "falta: cebola") e ali acaba. Não existe
uma linha ligando receita a lista de compras.

Um endpoint e um botão. É o menor pedaço com valor real do plano inteiro, e
destrava tudo que vem abaixo.

### 2. Cardápio da semana

Tabela nova (casal, data, refeição, receita). Dela sai **uma lista
consolidada**: duas receitas com cebola viram uma linha, o que está na despensa
é descontado, básico (sal, óleo) nunca entra. A lista se funde com as sugestões
de ritmo que o `lista.js` já calcula.

**O ponto onde isso dá certo ou vira lista inútil: quantidade.** Somar `250 g`
+ `½ xícara` + `2 unidades` exige parsear unidade de verdade. Regra decidida:
mesma unidade soma; unidades diferentes viram duas linhas honestas
("macarrão: 250 g + 1 pacote") em vez de um número inventado; "a gosto" nunca
vai pra lista. Lista que erra quantidade some da vida da pessoa na segunda
semana.

### 3. A roleta do cardápio

"Deixa na roleta": sortear só entre o que foi planejado e comprado. A roda fica
*melhor*, porque "vocês têm tudo em casa" passa a ser verdade sempre.

**A tensão que precisa continuar resolvida:** a roleta nasceu pra matar a
indecisão ("uma receita, não uma lista"); cardápio é planejamento — o oposto.
Eles não competem porque são **dois momentos**: sábado se planeja e compra,
quarta às 20h só se decide entre o que já tem em casa. O cardápio alimenta a
roda; não a substitui.

### 4. Receitas escritas pela própria dupla

Hoje entra receita por link (IA + curadoria). Falta o caminho manual: digitar a
receita da mãe, que não está em blog nenhum. Mesmo formato do catálogo, mesma
porta de entrada da lista de achados.

### Decisões já tomadas (não reabrir sem motivo novo)

- **Não popular o banco com receita raspada em massa.** As regras de curadoria
  (≤ 8 ingredientes, ingrediente de mercado brasileiro, medida de casa) são o
  que faz a comparação com a despensa funcionar e a roda pesar direito. Três mil
  receitas raspadas transformam "vocês têm tudo" em mentira, e essa frase é a
  feature inteira.
- **Nada de API de receita estrangeira.** São em inglês e em ingrediente
  americano; quebrariam a normalização em português, que é a peça mais cara já
  construída (`ingredientes.js`).
- **Tempo de preparo é honesto, mesmo passando de 40 min.** Quem separa a
  quarta-feira do sábado é o peso da roda, não um corte no catálogo.

---

## Saúde do casal

Mesma família de problema da comida: coisa que se sabe que precisa fazer e que
só se lembra tarde demais. Duas naturezas diferentes, e confundir as duas é o
jeito errado de construir isso.

### 1. Remédio de uso contínuo — **é o motor de compra recorrente, igual**

Caixa de 30 comprimidos dura 30 dias. Isso é exatamente o que o `lista.js` já
faz: palpite inicial por item, aprendizado por mediana dos eventos
"comprou"/"acabou", e o "ainda temos" ensinando a cadência. Um remédio é um
item de despensa com cadência prescrita em vez de estimada — o motor não muda,
só o palpite inicial fica melhor (a caixa diz quantos dias dura).

O que **precisa** ser diferente:

- **Antecedência maior.** A lista de mercado avisa com 2 dias. Remédio de uso
  contínuo não pode acabar: 5 a 7 dias. Acabar o macarrão é um jantar chato;
  acabar o remédio é outra coisa.
- **Não pode ser silenciado com a mesma leveza.** "Ainda temos" adia arroz sem
  drama; adiar remédio merece confirmação explícita.
- **A receita médica também vence.** Antes de lembrar de comprar, lembrar de
  renovar a prescrição — comprar sem receita na mão é a viagem perdida à
  farmácia.

### 2. Consulta e checkup — **não é o motor de cadência**

Aqui a periodicidade é **prescrita**, não aprendida: dentista a cada 6 meses,
exame anual, retorno em 3 meses. Não há nada pra estimar a partir de evidência,
e usar o motor de cadência aqui só produziria palpite errado com cara de
inteligência.

Isso é evento recorrente — e o app já tem recorrência (`time_capsules` tem
`recurrence`; a agenda tem eventos e feed `.ics`). O trabalho é de produto, não
de algoritmo: um tipo de evento "saúde" com periodicidade, quem é o dono
(um ou os dois), e o lembrete saindo com antecedência de marcar, não de ir —
avisar no dia da consulta que era pra ter marcado não serve pra nada.

**O gancho que faz isso valer a pena no Chamego e não numa agenda qualquer:**
o par lembra o par. O app já tem o "Cutucar" pro check-in — "a Laura ainda não
marcou o dentista" é a mesma mecânica, e é isso que uma agenda comum não faz.

### 3. A decisão travada antes de escrever qualquer código: privacidade

Remédio de uso contínuo revela condição de saúde. Isso é mais sensível que foto
de geladeira, e o app hoje manda **resumo semanal por email** e tem exportação
de dados — um remédio listado ali vaza pra caixa de entrada de quem for.

Antes de implementar, decidir: fica atrás do PIN que a aba Intimidade já usa?
Sai do resumo semanal e do export por padrão? Aparece pro par ou é individual
dentro do espaço do casal? **Não construir isso antes de responder.**

---

## Dívida e riscos conhecidos

- **Não existe CI no repositório.** Nenhum workflow em `.github/` — teste, lint
  e build rodam só na mão de quem lembra. Um PR pode subir vermelho sem
  ninguém notar.
- **A leitura de link nunca foi testada contra uma página real.** Os testes
  cobrem a trava de endereço, a limpeza do HTML e a sanitização do que o modelo
  devolve; a qualidade da extração de um blog de verdade só aparece em produção.
- **O bundle passa de 500 kB** sem divisão de código. Ainda não dói, mas o app
  abre no 4G de quem está com fome.
- **A despensa é a fundação de tudo isso** (comida e remédio) e depende de
  alguém alimentar. Se ela ficar vazia, a lista de mercado e a roda perdem o
  que têm de melhor. Vale medir quantos casais têm despensa com mais de 5 itens
  antes de empilhar mais feature em cima dela.
