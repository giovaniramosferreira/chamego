# F0 + F1 — Fundação premium/mídia + Planos, Presentes, Quiz e Cápsula

Data: 2026-07-07
Status: proposto

## Contexto

O protótipo navegável do handoff (`/prototipo`, `src/app/screens/*`, Fable) desenhou
11 features novas com dados mock. Um segundo agente (codex) trocou o `/app` inteiro
por esse protótipo e adicionou backends reais, mas em estilo de protótipo (moldura de
celular, telas de detalhe mostrando sempre o primeiro item). A troca foi revertida:
`/app` voltou ao **app original** (`AppShell`, Tailwind + `ui/kit.jsx`).

Objetivo do programa: portar as 11 features do protótipo para o app original, no visual
e nos padrões do `AppShell`, aproveitando os backends que já existem. Divisão em fases:

- **F0** Fundação compartilhada (esta spec)
- **F1** Planos, Presentes, Quiz, Cápsula — completas (esta spec)
- F2 Conquistas, Lembretes, Resumo, Intimidade
- F3 Álbuns, Ideias de date (DateHub)
- F4 Premium (tela de assinatura)

Esta spec cobre **F0 + F1**.

## Não-objetivos

- **Gateway de pagamento real** (Pix/Stripe). O sistema premium desta fase é
  entitlement + paywall + ativação via `PATCH /api/subscription` já existente
  (efetivamente um interruptor manual/dev). Cobrança real é decisão futura, fora
  desta spec. Sem isso, "ativar premium" na UI apenas chama o endpoint atual.
- Features das fases F2–F4.
- Notificações push/email de lembrete (contadores são exibidos, mas não disparam aviso).

## F0 — Fundação

Três peças transversais que F1 (e fases seguintes) consomem.

### F0.1 — Premium / entitlement

Backend já tem `subscriptions (couple_id, plan, entitlements)` e
`GET/PATCH /api/subscription`. Adicionar:

- **Middleware** `requireEntitlement(name)` em `server.js`: lê a subscription do casal,
  bloqueia com `402` + `{ error, upgrade: true }` se `entitlements` não contém `name`.
- Aplicar nas rotas premium (ex.: quizzes marcados `premium`, packs de presente).
- **Frontend**: hook `useSubscription()` (`src/lib/subscription.js`) — busca
  `/api/subscription`, expõe `{ plan, has(entitlement), activatePremium(), reload }`.
- **Componentes** em `ui/kit.jsx`:
  - `<Locked>` — envolve um `Row`/`Card`, mostra cadeado e, no clique, abre o paywall.
  - `<PaywallSheet feature="..." perks={[...]} onClose>` — `Sheet` com benefícios e botão
    "Ativar Premium" → `activatePremium()` (chama `PATCH /api/subscription {plan:'premium'}`).

Regra de UX: recurso premium aparece visível com cadeado (nunca escondido), clique abre paywall.

### F0.2 — Upload de mídia reusável

`server.js` já tem `multer` em disco (`DATA_DIR/uploads`, servido em `/uploads`,
limite 8MB, só imagem). Generalizar para cápsulas:

- Estender `fileFilter` para aceitar **áudio** (`audio/*`) além de imagem, nos endpoints
  de cápsula. Manter limite de tamanho (subir para 25MB p/ áudio — alinhado ao histórico
  de upload de fotos grandes de iPhone).
- Frontend: reusar `apiUpload(path, formData)` (`src/lib/api.js`) já existente.
- Vídeo fica fora (peso/custo de disco no Render); tipos suportados na cápsula: **texto,
  foto, áudio**. (O protótipo cita vídeo; tratado como fase futura — anotado em Não-objetivos
  da feature.)

### F0.3 — Padrão de rota de detalhe `:id`

Bug do codex: telas de detalhe liam sempre `lista[0]`. Padrão correto no `AppShell`:
rota com param, `useParams().id`, busca o item específico.

- Garantir `GET /api/<recurso>/:id` onde o detalhe precisa (já existe `lists/:id`;
  `db.getPlan` existe mas sem rota; adicionar rotas de detalhe em Planos, Presentes, Cápsula).
- Toda navegação para detalhe passa o id real (`nav('/app/planos/'+id)`).

## F1 — As 4 features (completas)

Padrão de todas: arquivo em `src/pages/app/tabs/` (ou pasta própria quando tem várias
sub-telas), componentes `ui/kit.jsx`, dados via `api()` + `useState/useEffect`, rotas
aninhadas em `AppShell.jsx`, linha de entrada (`Row onClick`) na tab-pai.

### F1.1 — Planos e sonhos — entra pela aba **Listas**

Telas / rotas:
- `/app/planos` — lista: título, ícone por categoria, barra de % (etapas concluídas),
  prazo; chips de **template** ("Morar juntos", "Casamento", "Viagem", "Comprar apê");
  botão "Novo plano". Estado vazio com CTA.
- `/app/planos/novo` — nome, meta/objetivo (texto), prazo (data), seletor de template
  (do zero ou template que pré-preenche etapas), toggle "compartilhar com o par".
- `/app/planos/:id` — cabeçalho com barra de progresso; lista de **etapas** com check
  (toggle); **adicionar etapa**; bloco de **notas**; **anexos** (upload de imagem).

Backend existente: `GET/POST /api/plans`, `PATCH /api/plans/:id`, `PATCH /api/plan-steps/:id`.
Adicionar:
- `GET /api/plans/:id` (usa `db.getPlan`).
- `POST /api/plans/:id/steps { title }` → nova etapa (db: `addPlanStep`).
- `DELETE /api/plans/:id` e `DELETE /api/plan-steps/:id` (db: `deletePlan`, `deletePlanStep`).
- Coluna `notes TEXT` em `plans`; `PATCH /api/plans/:id` passa a aceitar `notes`.
- Anexos: tabela `plan_attachments (id, plan_id, url, created_at)` + `POST /api/plans/:id/attachments`
  (multer, imagem) + `DELETE /api/plan-attachments/:id`. `getPlan` retorna `attachments`.
- Templates: **constantes no frontend** (`src/pages/app/tabs/planos/templates.js`) —
  lista de etapas pré-definidas; sem backend.

### F1.2 — Presentes & datas — entra pela aba **Vocês**

Telas / rotas:
- `/app/presentes` — seção "Próximas datas" (com contador de dias, client-side a partir
  da data); seção "Wishlist"; banner de modo surpresa; botão "Nova data ou item".
- `/app/presentes/novo` — tipo (chip **Data especial** | **Item de wishlist**), título,
  data, "avisar com antecedência" (3 dias / 1 semana / 1 mês), toggle **modo surpresa**.
- `/app/presentes/:id` — hero com contador; banner surpresa; **ideias de presente** como
  checklist (marcar decidido); **orçamento** (barra planejado/total); adicionar ideia.

Backend existente: `GET/POST /api/gifts` (gift = title, person, date, budget, ideas[str], done).
Mudanças de schema em `gifts`:
- `kind TEXT DEFAULT 'date'` — `'date' | 'wishlist'`.
- `secret INTEGER DEFAULT 0` — modo surpresa.
- `reminder_lead INTEGER DEFAULT 7` — dias de antecedência.
- `ideas` passa de `["texto"]` para `[{ text, done, cost }]` (JSON estruturado);
  migração converte strings antigas em `{text, done:0, cost:0}`.

Adicionar endpoints:
- `GET /api/gifts/:id`.
- `PATCH /api/gifts/:id` — editar campos, alternar `done` de uma ideia, ajustar orçamento.
- `DELETE /api/gifts/:id`.

Regra **modo surpresa** (visibilidade pro par): `GET /api/gifts` retorna itens com
`secret=1` **somente** para quem criou (`created_by == req.user.email`). Itens surpresa
do usuário ficam invisíveis para o Parceiro(a). Orçamento = soma de `cost` das ideias vs
`budget` do presente.

### F1.3 — Quiz do casal — entra pela aba **Vocês**

Telas / rotas:
- `/app/quiz` — lista de quizzes agrupada por **tema** (chips: Rotina, Diversão,
  Intimidade, Viagens); cada item mostra estado (respondido / aguardando par / novo);
  quizzes premium com cadeado (`<Locked>`).
- `/app/quiz/:id` — responde pergunta a pergunta (`ProgressDots`, `ChoiceCard`); ao
  enviar → estado **aguardando** se o par ainda não respondeu, ou **resultado**.
- Estado resultado: anel de % de sintonia (calculado no client a partir das respostas dos
  dois), lista "onde combinam" e "pra conversar", CTA abrir chat.

Backend existente: `GET /api/quizzes` (retorna `answered`), `POST /api/quizzes/:id/answers`
(retorna respostas dos dois quando ambos responderam). Adicionar:
- Mais quizzes em `QUIZZES` (db.js) com campo `category` e `premium` (bool).
- `listQuizzes` retorna `category`, `premium`, `answered`, e `partnerAnswered`.
- Quizzes `premium` protegidos por `requireEntitlement('premium')` no POST de respostas.
- Cálculo de sintonia é client-side (comparar `answers` dos dois membros); sem endpoint novo.

### F1.4 — Cápsula do tempo — entra pela aba **Momentos**

Telas / rotas:
- `/app/capsula` — "Prontas para abrir" (open_date ≤ hoje, não abertas) vs "Guardadas"
  (seladas, com contador); botão "Nova cápsula"; link "Cápsulas já abertas".
- `/app/capsula/novo` — tipo de conteúdo (**Mensagem** | **Foto** | **Áudio**), conteúdo,
  "quem guarda" (Nós dois | Só eu), "abrir em" (data), toggle **recorrente** (todo ano).
- `/app/capsula/:id` — se aberta/pronta: revela mensagem + mídia, "salvar nos momentos";
  se selada antes da data: mostra selo + contador, sem revelar.
- `/app/capsula/historico` — cápsulas já abertas.

Backend existente: `GET/POST /api/time-capsules` (title, message, open_date, opened_at).
Mudanças de schema em `time_capsules`:
- `media_url TEXT`, `media_type TEXT` — foto/áudio (via multer, F0.2).
- `recurrence TEXT DEFAULT 'none'` — `'none' | 'yearly'`.
- `scope TEXT DEFAULT 'couple'` — `'couple' | 'self'` (quem guarda).

Adicionar endpoints:
- `GET /api/time-capsules/:id`.
- `PATCH /api/time-capsules/:id` → marcar aberta (`opened_at = now`); só permitido quando
  `open_date <= hoje`. Servidor **não** devolve `message`/`media` de cápsula selada antes da
  data (proteção: campo omitido no GET até `open_date <= hoje`).
- `POST /api/time-capsules` aceita multipart (mensagem + foto/áudio opcional).
- Recorrência `yearly`: ao abrir, agenda próxima ocorrência (mesma data +1 ano) — resolvido
  no backend ao marcar aberta.

Não-objetivo da feature: **vídeo** e **cápsula por-evento** ("abre quando bater a meta X").
Cápsula é por **data** (com recorrência anual). Gatilho por evento fica para fase futura.

## Schema / migrações (consolidado)

Padrão do projeto: `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ... ADD COLUMN` em bloco
try/catch (como já feito para `users`). Adicionar em `createDb`:

- `plans`: `ADD COLUMN notes TEXT DEFAULT ''`.
- nova tabela `plan_attachments (id, plan_id, url, created_at)`.
- `gifts`: `ADD COLUMN kind TEXT DEFAULT 'date'`, `secret INTEGER DEFAULT 0`,
  `reminder_lead INTEGER DEFAULT 7`; migração de `ideas` string→objeto.
- `time_capsules`: `ADD COLUMN media_url TEXT`, `media_type TEXT`,
  `recurrence TEXT DEFAULT 'none'`, `scope TEXT DEFAULT 'couple'`.

Migrações idempotentes; bancos existentes (dev/prod) não podem quebrar.

## Testes

- Backend (`backend/__tests__/`, supertest + db `:memory:`): cobrir os endpoints novos
  — plans steps/attachments/delete, gifts patch/delete/secret-visibility, quiz premium gate,
  capsule patch(open)/media/sealed-hidden. Estender `prototype-backends.test.js`.
- Frontend: teste de fluxo por feature (criar → listar → detalhe) no padrão de
  `src/app/realScreens.test.js` / testes existentes; foco no contrato com a API.
- Verificação manual: dirigir o app logado (seed dev) por cada feature antes de dar por pronto.

## Entradas de navegação (resumo)

- **Listas** → `Row` "Planos e sonhos" → `/app/planos`.
- **Vocês** → `Row` "Presentes & datas" → `/app/presentes`; `Row` "Quiz do casal" → `/app/quiz`.
- **Momentos** → `Row`/chip "Cápsula do tempo" → `/app/capsula`.
- 5 abas permanecem; nenhuma aba nova.

## Glossário (novos termos — atualizar CONTEXT.md)

- **Plano**: objetivo grande do casal com **Etapas** (checklist), prazo, notas e anexos. Backend `plans` + `plan_steps` + `plan_attachments`.
- **Modo Surpresa**: presente/ideia com `secret=1`, invisível para o Parceiro(a) até revelar.
- **Wishlist**: itens de desejo (`gifts.kind='wishlist'`), distintos de Datas.
- **Cápsula do Tempo**: mensagem/mídia selada até uma data (`open_date`), opcionalmente anual.
- **Entitlement / Premium**: capacidade liberada pela `subscription` do casal; recursos travados abrem **Paywall**.
