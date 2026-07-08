# F2 — Conquistas, Lembretes, Resumo e Intimidade (app original)

Data: 2026-07-08
Status: proposto

Segunda leva do porte do protótipo Fable para o AppShell. Mesmo padrão da F1
(`ui/kit.jsx`, rotas aninhadas, entrada pela aba Vocês). Todas escopadas pelo
Espaço do Casal. Reusa a fundação premium/paywall da F0.

## Não-objetivos

- Notificações push/email (lembretes e resumo mostram, não disparam aviso).
- Gateway de pagamento (premium via `PATCH /api/subscription`, como na F1).
- Snapshots agendados de resumo (histórico é calculado sob demanda dos dados reais).

## Entradas de navegação (aba Vocês)

Nova seção "Cuidar" em VocesTab, com linhas para Conquistas, Lembretes, Resumo
e Intimidade. Rotas: `/app/conquistas`, `/app/lembretes`, `/app/resumo`,
`/app/intimidade` (+ sub-rotas de detalhe onde fizer sentido).

## Conquistas — `/app/conquistas`

Derivadas de dados reais (sem schema). `db.listAchievements` passa a devolver um
conjunto maior com `{ id, title, desc, icon, unlocked, progress? }`:
- Ganhas: primeiro evento/momento/check-in, 7 check-ins seguidos (streak),
  primeira lista concluída, primeiro plano, primeira cápsula.
- Em progresso: "1 date por semana" com `progress {current,total}` (real).
- A desbloquear: marcos futuros com `unlocked:false`.
- Coleção especial: card premium → Paywall.
Detalhe: `Sheet` com a conquista (título, descrição, compartilhar no chat).

## Lembretes — `/app/lembretes`

`db.listReminders` já sugere por contexto real. Adições:
- Preferências persistidas por casal: `couples.reminder_prefs` (JSON
  `{ frequency, types: {checkin,dates,goals,routine} }`).
- `GET/PATCH /api/reminders/prefs`. `listReminders` respeita `types` habilitados.
- Agrupamento "Pra hoje" / "Quando der" (por prioridade já existente).
- Detalhe do lembrete com ações rápidas (check-in, chat, date); "dispensar por
  hoje" some da lista no client (sem persistência — some até o próximo load).
- Config (frequência + tipos) grava via PATCH.

## Resumo — `/app/resumo`

`db.weeklySummary(coupleId, weekOffset=0)` passa a filtrar por intervalo da
semana (segunda–domingo) usando `created_at`/`date` reais. Adições:
- `GET /api/weekly-summary?week=N` (0 = semana atual, 1 = anterior…).
- Destaques (`highlights`) derivados no servidor (humor predominante dos
  check-ins, metas/listas fechadas, date da semana).
- `GET /api/weekly-summary/history` → últimas ~8 semanas com contagens (calculado
  dos dados, sem snapshot).
- Tela: hero com intervalo, stat-grid, destaques, sugestões próxima semana,
  histórico. Config de notificação é informativa (sem push — non-objetivo).

## Intimidade — `/app/intimidade`

Área privada de conversas guiadas. `intimacy_sessions` já existe.
- `INTIMACY_PROMPTS` enriquecido: `{ id, tone, text, premium }` com tons
  Conversa/Futuro/Carinho/Reconexão (grátis) e Desejo/Combinados (premium).
- `GET /api/intimacy/prompts` (tons premium travados por entitlement no POST).
- `GET /api/intimacy/sessions` (histórico) + `DELETE /api/intimacy/sessions/:id`
  e `DELETE /api/intimacy/sessions` (apagar tudo).
- Carta: responder (`POST /api/intimacy/sessions {promptId,note}`) e ver a
  resposta do par à mesma carta (busca sessão do parceiro pro mesmo prompt).
- **Trava por PIN**: `couples.intimacy_pin` (opcional, 4 dígitos). Endpoints
  `POST /api/intimacy/unlock {pin}` (verifica) e `PATCH /api/intimacy/pin
  {pin}` (define/remove). Sem PIN definido → sem trava. Verificação no servidor;
  PIN nunca volta pro client. Gate é conveniência (dado já está atrás de login).

## Schema / migrações (idempotentes)

- `couples`: `ADD COLUMN reminder_prefs TEXT`, `ADD COLUMN intimacy_pin TEXT`.
- Sem tabelas novas.

## Testes

Estender `prototype-backends.test.js`: prefs de lembrete, resumo por semana +
history, intimacy sessions (criar/listar/apagar) + PIN set/verify + gate premium.
Verificação manual das 4 telas no app logado antes do push.
