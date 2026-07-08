# Refatoração enxuta — foco, clareza, vendabilidade

Data: 2026-07-08
Status: Fase 1 executada

## Princípio

O produto resolve 3 jobs: (1) organizar a rotina do casal, (2) resolver
pendências compartilhadas, (3) guardar e planejar a vida a dois. Toda feature
justifica-se por pelo menos um. 80% organização, 20% afeto, 0% infantilização.

## Core definitivo (5 pilares)

1. **Agenda** — calendário compartilhado + datas importantes.
2. **Listas** — compras, tarefas, itens do dia a dia.
3. **Planos & metas** — metas rápidas + planos grandes com etapas.
4. **Momentos** — álbuns + cápsula (camada afetiva secundária).
5. **Vocês** — check-in, planos&metas, datas&presentes, chat (4 blocos, tangível).

## Alterações executadas (Fase 1)

- **Início** operacional: seção "Pra hoje" (próximos eventos + pendências de
  listas + check-in) no topo; contador de dias vira 1 card afetivo abaixo.
- **Vocês** reduzido a 4 blocos: Check-in de hoje, Planos & metas, Datas &
  presentes, Chat privado. Removidos da navegação: Painel de conexão, Descobrir,
  Cuidar, Pergunta guiada.
- **Metas fundidas em Planos** (`/app/planos` = "Planos & metas": seção Metas
  rápidas + Planos grandes). Entrada de Planos saiu de Listas → agora em Vocês.
- **Agenda**: removida entrada "Ideias pra vocês"; adicionada seção "Datas
  importantes" (aniversários com contador, lidas de `/api/gifts`).

## Escondido (rota existe, sem entrada de navegação — vira pack futuro)

Conquistas, Lembretes de carinho, Resumo semanal, Quiz do casal, Conexão/
Intimidade, Ideias de date. Código e backend preservados para os packs.

## Seguro para depois (não é "simplificação", é feature nova)

- Listas com tipos práticos (Compras / Tarefas / Recorrentes) + compras
  utilitária — precisa migrar taxonomia de `kind` (schema).
- Onboarding com barra de progresso de ativação.
- Tarefas recorrentes de verdade + "quem faz" (atribuição).
- Notificação real de datas (hoje só contador; precisa infra de push/email).

## Packs / monetização (Fase 4)

- Pack Conexão (quiz, perguntas, intimidade, rituais).
- Pack Insights (resumo semanal, tendências).
- Pack Experiências (ideias/roteiros de date, packs sazonais de presente).

## Marketing (a definir depois)

Posicionamento base: "Chamego — o lugar pra organizar a vida a dois."
Gancho mais forte pra anúncio: "nunca mais esqueçam uma data".
