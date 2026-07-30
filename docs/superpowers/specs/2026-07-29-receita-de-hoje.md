# Receita de Hoje — julho/2026

Funcionalidade do Chamego, não produto separado: casal que organiza a vida a
dois tem que resolver o jantar. Responde "o que a gente come hoje?" em menos de
10 segundos, por duas portas — **sorteio** e **foto do que tem em casa**.

O concorrente é o iFood e a preguiça, não o site de receitas.

**Métrica-norte:** % de sugestões que terminam em *cozinhamos isso*
(`db.taxaDeCozinhada`). Não sessões, não receitas mostradas.

## Onde mora

- Aba **Listas** → "O que a gente come hoje?" (é onde já vive o mercado)
- Hub `/app/mais` → grupo **Comer**
- Card do Início entre 17h e 21h — perto do jantar, a pergunta do dia é uma só
- Rotas: `/app/cozinha`, `/app/cozinha/:id`, `/app/despensa`

## Modo A — a roda

`backend/receita/roleta.js`. Gira, desacelera, para em **uma** receita. Não uma
lista: a lista é o problema que a feature mata.

A roda **não é aleatória** — a aleatoriedade é sensação de interface. `pesar()`
multiplica sinais do contexto:

| Sinal | Efeito |
|---|---|
| Hora (café/almoço/jantar/madrugada) | ×1,8 na tag da refeição; madrugada favorece ≤15 min |
| Dia da semana | seg–qui: ×1,5 se ≤30 min, ×0,4 se >45 min; fim de semana aceita elaboração |
| Clima (opcional) | frio ×1,7 em sopa/forno; calor ×1,6 em leve e ×0,5 em sopa |
| Despensa | **×2,2 se tem tudo em casa**; ×0,35 se falta muita coisa |
| Histórico | ×0,15 se cozinharam nos últimos 10 dias; ×1,3 se deu certo há tempo |

Restrição alimentar é **filtro** (peso 0); gosto é **peso** — zerar por
preferência deixaria a roda previsível, o oposto do produto. O sorteio recebe o
gerador aleatório de fora, então cada regra tem teste determinístico.

**Escassez é feature:** 3 giros/dia no grátis. Giro infinito recria o scroll
infinito. O front anima a roda enquanto espera; a fatia onde ela para é derivada
do id que o servidor já escolheu.

## Modo B — a foto

`backend/receita/visao.js` → `POST /api/cozinha/foto`.

1. Compressão no cliente (≤1280px, JPEG 75%) antes de subir.
2. Visão (Haiku) devolve `{nome, confianca}` por item. O prompt proíbe inventar
   item, manda ignorar o que não é comida e exigir confiança <0,5 quando a
   embalagem esconde o conteúdo.
3. **Tela de confirmação editável, obrigatória.** Item com confiança baixa vem
   desmarcado. Nada entra na despensa sem o casal confirmar — visão erra com
   embalagem opaca e luz ruim, e errar em silêncio faria o app sugerir receita
   impossível.
4. A confirmação devolve **três ângulos**: a mais rápida, a que aproveita mais
   do que têm, e a inesperada. Nunca três variações da mesma ideia.

Duas decisões de privacidade: a foto é **apagada do disco** logo após a
extração (guardamos a lista de itens, não a imagem da geladeira de ninguém), e
sem `ANTHROPIC_API_KEY` a feature cai no **modo manual** — a mesma tela de
confirmação, começando vazia.

## Modo cozinha

Um passo por tela, em corpo grande. Timer embutido quando o passo tem espera,
com **vibração** em vez de som (cozinha é barulhenta e o celular fica na
bancada). Wake lock mantém a tela acesa e é liberado ao sair. A tab bar
desaparece (`modo=cozinha` na URL): mão suja não acerta ícone pequeno.

No último passo, **"Cozinhamos isso 🍳"** — fecha o giro, registra em
`cooked_log` e oferece virar Momento na linha do tempo. É o único jeito de a
métrica-norte existir: se dependesse de voltar no app depois, ninguém saberia se
a feature funciona.

## Lista de mercado que se religa sozinha

`backend/receita/lista.js`. Já se sabe mais ou menos de quanto em quanto tempo
cada coisa acaba — e o app aprende o ritmo da casa:

1. **Palpite honesto no dia 1** (`CADENCIA_PADRAO`: pão 3 dias, leite 4, ovo 12,
   arroz 30, papel higiênico 21). Lista vazia na estreia mata a feature.
2. **Confiança crescente**: `min(1, n/4)` mistura palpite e observado.
3. **"Acabou" vale mais que "comprou"** — duração real de uso é sinal mais direto.
4. **Mediana, não média** — viagem ou mês apertado não reprograma o ritmo.
5. **"Ainda temos" ensina**: alonga a cadência 25%. Sem aprender do "não", o app
   repete o erro toda semana e a pessoa desliga o aviso.
6. **Ritmo de cozinha ajusta**: cozinharam o dobro? os ingredientes acabam antes
   (fator limitado a 0,6–1,6 pra não oscilar).
7. **Véspera do dia de mercado** (`diaPreferidoDeCompra` só aceita hábito com
   ≥40% das compras no mesmo dia e ≥3 compras).
8. **Lista vazia é resposta válida.**

O que falta numa receita vai direto pra lista de Mercado do casal (reaproveita
`lists`/`list_items`) — sem copiar e colar.

## Grátis × pago

| Grátis | Chamego Juntos |
|---|---|
| 3 giros/dia, 1 foto/dia | Giros e fotos ilimitados |
| Despensa até 15 itens | Despensa ilimitada + lista proativa completa |

Limites aplicados no servidor com **402 + `upgrade: true`**, que o front já
transforma em paywall (`UpgradeGate`).

## A dois

Quando alguém gira, a sugestão fica "pendente" por 6 horas e aparece pro par
como convite — *"Seu par sorteou: Carbonara de quarta. Topo / Outra"*. Comer é
combinado, não decisão solo.

## Verificação

144 testes (27 novos: catálogo, match de ingredientes, pesos da roda, limites,
desfecho, foto em modo manual, três ângulos, cadência e isolamento entre
casais), lint sem erros, build ok. No navegador: despensa por texto → roda →
resultado → modo cozinha passo a passo → "cozinhamos" (métrica 1/1) → "acabou"
entrando na lista de mercado com o motivo. Sem erros de console.

## Fora de escopo, de propósito

Feed social, código de barras, integração com supermercado, contagem de
calorias, geração de receita do zero (o catálogo é curado; IA só lê a foto).
