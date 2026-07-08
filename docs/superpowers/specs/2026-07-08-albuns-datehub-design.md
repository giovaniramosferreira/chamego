# F3 — Álbuns e Ideias de date (app original)

Data: 2026-07-08
Status: proposto

Terceira leva do porte do protótipo Fable para o AppShell. Mesmo padrão (F1/F2).

## Não-objetivos
- Geração automática de álbuns por IA (sugestão é heurística simples: momentos recentes).
- Packs premium de roteiro completos (mostra paywall; conteúdo dos packs é fase futura).
- Reação do par em tempo real (reação = a outra pessoa ter salvo a mesma ideia).

## Álbuns — entra pela aba **Momentos**

Álbum agrupa fotos dos **Momentos** reais do casal.
- `/app/albuns` — lista com capa (1ª foto do 1º momento) + contagem; sugestão
  automática (últimos momentos) para criar rápido; botão criar. Premium
  "retrospectiva" → Paywall.
- `/app/albuns/:id` — grade de fotos dos momentos do álbum, título + legenda
  editáveis, excluir.
- Criar: título, legenda, seleção de momentos (grade dos momentos existentes).

Backend (`albums`, já existe list/create):
- `ADD COLUMN caption TEXT` em `albums`.
- `GET /api/albums/:id` (álbum + `moments` resolvidos).
- `PATCH /api/albums/:id` (title, caption, momentIds).
- `DELETE /api/albums/:id`.
- `createAlbum` aceita `caption` e `momentIds` específicos (já aceita ids).

## Ideias de date — entra pela aba **Agenda**

- `/app/date-ideas` — filtros (orçamento, duração, onde, clima) que filtram a
  lista no client; sugestões; salvar/dessalvar; pack premium → Paywall; ver salvas.
- `/app/date-ideas/:id` — descrição, checklist "o que levar", salvar, reação do
  par (curtiu = par salvou), "adicionar à agenda" (→ `/app/agenda`).

Backend (`saved_date_ideas` já existe):
- `DATE_IDEAS` enriquecido: `{ id, title, vibe, budget, duration, where, desc,
  checklist, premium }` (~8 ideias, algumas premium).
- `listDateIdeas(coupleId, myEmail)` → cada ideia com `saved` (eu) e
  `partnerSaved` (par salvou).
- `POST /api/date-ideas/saved` (salvar, idempotente) + `DELETE
  /api/date-ideas/saved/:ideaId` (dessalvar).
- Ideias premium: detalhe/salvar liberado; packs de roteiro é que são premium
  (paywall no card do pack, não na ideia em si).

## Schema / migrações (idempotentes)
- `albums`: `ADD COLUMN caption TEXT`.
- Sem tabelas novas.

## Testes
Estender `prototype-backends.test.js`: álbum get/patch/delete + caption;
date-ideas salvar/dessalvar + partnerSaved. Verificação manual das telas.
