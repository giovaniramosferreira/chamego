# Chamego

App de organização da vida a dois. O casal cria um **Espaço do Casal** privado
com agenda, listas, momentos e camada de conexão ("Vocês"). Marca: **Chamego**.
Estética editorial terracota (Fraunces + Hanken Grotesk), mobile-first.
Grátis na fundação; packs premium são fase futura.

## Language

**Espaço do Casal**:
A unidade central do produto — container privado que reúne tudo do casal.
Cada usuário participa de no máximo um espaço.
_Avoid_: conta (é do usuário, não do casal), grupo

**Parceiro(a)**:
A segunda pessoa do espaço, conectada via Convite.
_Avoid_: destinatário (era do produto antigo), usuário (ambíguo)

**Convite**:
Link/código de pareamento que conecta o Parceiro ao Espaço do Casal.
Um convite pendente por espaço; gerar novo revoga o anterior.
_Avoid_: invite

**Código de Pareamento**:
Forma curta do Convite (6 caracteres, sem 0/O/1/I/L) para digitar ou ditar.

**Link Mágico**:
Email com link de uso único (15 min) que autentica sem senha.
_Avoid_: código OTP, senha

**Começar (fluxo)**:
Sequência pós-primeiro-login: 1 pergunta de objetivo → criação do Espaço do
Casal (data opcional) → convite. Guardada pela rota `/app/comecar`. Os termos
são aceitos no "continuar" da entrada e registrados na primeira passagem.
_Avoid_: cadastro, wizard (termo do produto antigo)

**Onboarding**:
1 pergunta (objetivo) que define o conteúdo inicial do espaço via
`db.seedCouple`. Persistido em `users.onboarding` (JSON); a fase do
relacionamento é opcional e vive em Configurações.

**Adicionar (o "+" global)**:
Botão único no shell das 5 abas. Interpreta texto natural
(`src/lib/quick-parse.js`) e cria evento, item de lista, momento, data
importante ou plano; o mesmo campo busca (`GET /api/search`).
_Avoid_: FAB por aba (era preciso acertar a aba antes de registrar)

**Tudo do Chamego** (`/app/mais`):
Hub com todos os recursos agrupados por intenção. Regra do produto: nenhum
recurso existe sem porta de entrada na interface.

**Desfazer**:
Exclusão é otimista e reversível por 5s (`ToastProvider`), no lugar de
`confirm()` do navegador.

**Contador de Dias**:
Dias desde a data-marco (`milestone_date`) do espaço — destaque do Início.

**Foto de Perfil**:
Avatar do usuário (`users.picture`) — vem do Google no login ou upload próprio
via `POST /api/me/avatar` (multer, disco). Aparece no header do Início e em Config.

**As 5 abas** (todas funcionais):
- **Início**: saudação, o par (humor do dia ou cutucão), "Pra hoje" sem o que já
  foi resolvido, card de descoberta rotativo e contador de dias.
- **Agenda**: eventos do casal (`events`) — título, data, hora, local, notas,
  compartilhado vs "só você". Visão de mês com marcadores + próximos, incluindo
  as **datas importantes** (`gifts` com data) no mesmo calendário. Exporta `.ics`
  por evento e feed assinável por token.
- **Listas**: `lists` (compartilhada/individual) + `list_items` (concluir,
  remover, barra de progresso), com atualização otimista. Wishlist mora só em
  Datas & presentes; listas `kind='wishlist'` antigas seguem funcionando.
- **Momentos**: linha do tempo `moments` com texto e **1 foto** por momento
  (`moment_photos`, upload via multer para `DATA_DIR/uploads`, servido em
  `/uploads`). Momento editável: trocar/remover foto e editar texto/data
  (`PATCH /api/moments/:id`). Ponto de entrada para **Cápsula do Tempo**.
- **Vocês**: check-in de humor diário (`checkins`, streak), metas do casal
  (`goals`), pergunta guiada da semana (rotativa) e chat privado (`messages`,
  atualiza por polling a cada 4s). Pontos de entrada para **Presentes** e **Quiz**.

Todo conteúdo é escopado pelo Espaço do Casal (derivado da sessão, nunca do
cliente): endpoints usam o middleware `requireCouple`.

## Features de conexão (F1 — portadas do protótipo Fable ao app original)

Reaproveitam o design system e os componentes `ui/kit.jsx`; escopadas pelo
Espaço do Casal. Tabelas: `plans`, `plan_steps`, `plan_attachments`, `gifts`,
`quiz_answers`, `time_capsules`.

- **Planos e sonhos** (`/app/planos`): objetivo grande com **Etapas** (checklist,
  % de progresso), prazo, notas, anexos (imagem) e templates (frontend).
- **Presentes & datas** (`/app/presentes`): Datas com contador + Wishlist. Ideias
  estruturadas (`{text,done,cost}`), barra de orçamento e **Modo Surpresa**
  (item `secret=1`, oculto do par até revelar).
- **Quiz do casal** (`/app/quiz`): quizzes por tema; comparativo de sintonia
  quando os dois respondem. Trilhas `premium` travadas por entitlement.
- **Cápsula do Tempo** (`/app/capsula`): mensagem/foto/áudio selada até uma data
  (conteúdo escondido no servidor até lá), com recorrência anual.
- **Chamego Juntos** (plano pago): assinatura por Espaço do Casal, cobrada pelo
  Stripe. O direito de uso é derivado (teste vigente ou período pago) e escrito
  só pelo webhook assinado — o cliente nunca concede acesso a si mesmo.
  Limites do grátis: 30 fotos, 3 cápsulas, 1 álbum. Exportar dados é sempre
  grátis. Ver `docs/superpowers/specs/2026-07-28-monetizacao.md`.

### F2 (aba Vocês → seção "Cuidar")

- **Conquistas** (`/app/conquistas`): badges derivados de dados reais (check-ins,
  streak, planos, cápsulas, tarefas), com progresso e coleção premium.
- **Lembretes** (`/app/lembretes`): sugestões por contexto real, agrupadas
  (hoje/depois), dispensáveis; **preferências** persistidas em
  `couples.reminder_prefs` (frequência + tipos habilitados filtram a lista).
- **Resumo** (`/app/resumo`): relatório por semana (seg–dom) calculado dos dados
  reais (`weeklyReport(offset)`), com destaques e histórico de 8 semanas —
  sem snapshots agendados.
- **Intimidade** (`/app/intimidade`): conversas guiadas por tom; responder e ver
  a resposta do par à mesma carta; histórico apagável; tons premium travados;
  trava opcional por **PIN** (`couples.intimacy_pin`, verificado no servidor).

### F3

- **Álbuns** (`/app/albuns`, entra por Momentos): agrupa fotos dos Momentos reais;
  capa = 1ª foto; título + legenda (`albums.caption`), seleção de momentos, editar
  e excluir. Retrospectiva premium → Paywall.
- **Ideias de date** (`/app/date-ideas`, entra por Agenda): catálogo de ideias
  (`DATE_IDEAS`) com filtros (orçamento/onde) no client; salvar/dessalvar
  (`saved_date_ideas`, escopo do casal — "par curtiu" = a linha ter o email do
  par); detalhe com checklist → agenda. Packs premium → Paywall.

## Relationships

- Um usuário (email) pertence a no máximo um **Espaço do Casal** (`couple_members.user_email UNIQUE`)
- O criador do espaço tem role `creator`; quem aceita o Convite, role `partner`
- **Convite** pertence ao espaço; aceitar exige login e não ter espaço próprio
- Fluxo **Começar** precede o app: sem termos + onboarding + espaço, `/app` redireciona

## Flagged decisions

- Pivot completo (jul/2026): presente digital aposentado, código no branch `legacy-presente-digital`
- Auth sem senha (Google + Link Mágico) — herdada do produto anterior
- Web mobile-first primeiro; app nativo é decisão futura
- Permissões (notificações/calendário/fotos) fora do onboarding — pedidas no primeiro uso real
- Chat do casal por polling (4s), não websockets — volume baixo não justifica infra em tempo real
- Fotos dos Momentos no disco persistente do Render (`/var/data/uploads`), não em storage externo

## Melhorias de uso (jul/2026)

Ver `docs/superpowers/specs/2026-07-28-dez-melhorias-uso.md`. Resumo do que
mudou de estrutura:

- **PWA**: `manifest.webmanifest` + `sw.js` + ícones; faixa de instalação.
- **Lembretes por email** (`backend/notifier.js`): véspera de evento e resumo de
  domingo, idempotentes (`notifications_sent`), preferências em
  `couples.reminder_prefs.email`.
- **Não lidas do chat**: `message_reads` + `GET /api/badges` alimentam o badge
  da tab bar.
- **Dados do casal**: `GET /api/export`, `POST /api/couples/:id/leave` e
  `DELETE /api/couples/:id` (confirmação digitada) — o que os Termos prometem.
- **Erros de rede** aparecem como faixa (`ConnectionBanner`), não como lista
  vazia.

**Presente**:
Código de 10 caracteres (`gift_codes`) comprado por qualquer pessoa em
`/presente`, sem conta, ou emitido pela operação para parcerias. O casal resgata
e ganha meses num crédito próprio (`subscriptions.gift_until`), imune ao webhook
da assinatura. Um código vale uma vez; presentes se acumulam.
_Avoid_: cupom, voucher

**Card do contador**:
Imagem 1080×1920 gerada no cliente a partir do Contador de Dias, com
compartilhamento nativo e assinatura da marca. É o canal de aquisição que mora
dentro do produto.
