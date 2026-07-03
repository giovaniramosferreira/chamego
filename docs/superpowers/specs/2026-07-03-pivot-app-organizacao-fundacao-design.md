# Pivot Chamego — App de Organização a Dois: Fundação (Fase 1)

**Data:** 2026-07-03
**Status:** Aprovado pelo usuário (brainstorming em sessão)

## Contexto e decisão de produto

O Chamego pivota completamente: deixa de ser o presente digital pago (Página do Casal,
R$19,90 via Pix) e passa a ser um **app para casais organizarem a vida a dois** — agenda,
listas, momentos (memórias) e uma camada leve de conexão emocional ("Vocês").

A referência de design é o pacote `design_handoff_chamego/` (landing hifi + protótipo
navegável da área logada em HTML/CSS/JS). Os protótipos são referência visual e de fluxo,
não código de produção: os componentes devem ser recriados em React.

### Decisões tomadas

| Decisão | Escolha |
|---|---|
| Relação com produto atual | **Pivot completo** — presente digital aposentado |
| Plataforma | **Web app mobile-first (PWA-ready)** no repo atual; nativo fica para depois |
| Código antigo | Preservado no branch `legacy-presente-digital`; `main` limpa |
| Escopo fase 1 | **Fundação fim-a-fim**: landing + auth + onboarding + espaço do casal + shell das 5 abas |
| Auth | **Sem senha**: Google + Link Mágico (reusa `backend/auth.js` e `backend/mailer.js`) |
| Arquitetura | **Monolito atual adaptado**: Express + SQLite + Vite + deploy Render mantidos |

## Escopo da fase 1

1. **Landing de marketing** (`/`) — recriação hifi de `design_handoff_chamego/Chamego.html` em React.
2. **Auth sem senha** — telas splash/welcome/login adaptadas do handoff:
   - "Continuar com Google" (Google Identity Services, já existente no backend)
   - "Continuar com e-mail" → Link Mágico (uso único, validade curta)
   - Não existem telas de signup/forgot/reset/verify de senha; conta nasce no primeiro acesso.
   - Botão "Continuar com Apple" do protótipo fica fora da fase 1.
3. **Termos** — aceite obrigatório no primeiro login (`terms_accepted_at`).
4. **Onboarding em 3 passos** (respostas persistidas no perfil do usuário):
   - Objetivo principal (rotina / conexão / datas / planejar)
   - Estágio do relacionamento (morando / namorando / noivos / à distância / outro)
   - Sozinho vs convidar parceiro
   - O passo de permissões do protótipo é cortado: no web, calendário/fotos não se aplicam;
     notificações serão pedidas no primeiro uso real (fase futura).
5. **Criação do espaço do casal**: nome, data importante (+ significado), convite.
6. **Convite do parceiro**: link copiável, WhatsApp (deep link `wa.me`), e-mail (mailer),
   código de pareamento curto. Rota pública `/convite/:code` com preview; aceite exige login.
7. **Shell do app** (`/app`): tab bar com 5 abas — Início, Agenda, Listas, Momentos, Vocês.
   - **Início funcional**: saudação, contador de dias juntos, estado *sozinho* vs *conectado*
     derivado dos dados reais (não de switcher manual).
   - Agenda/Listas/Momentos/Vocês: **estados vazios reais** conforme design, com CTA
     marcado "em breve" — conteúdo vem nas fases 2–4.
8. **Configurações mínimas**: perfil (nome), espaço do casal (nome/data), sair.

### Fora do escopo (fases futuras)

Conteúdo real de Agenda, Listas, Momentos e Vocês; premium/packs/paywall/checkout;
chat do casal; check-in de humor; notificações push; PWA offline avançado; login Apple;
localização compartilhada, gamificação e IA de sugestões (pós-MVP citados no handoff).

## Frontend

- **Rotas** (React Router): `/` landing · `/entrar` auth · `/convite/:code` aceite ·
  `/app/*` área logada (redirect para `/entrar` sem sessão).
- **Design tokens** portados do handoff para o Tailwind config:
  - Paleta terracota: `--bg:#f6f0e7`, `--surface:#fffdf8`, `--bg-tint:#efe6d8`,
    `--accent:#bd6a4b`, `--accent-press:#a5573b`; tinta `#2b2521 / #6f645b / #a89d93`.
  - Tipografia: Fraunces (display, itálico para ênfase) + **Hanken Grotesk** (substitui Inter).
  - Raios: card 22px, botão 13px, imagem 24px, chip 999px.
  - Easing: `cubic-bezier(.22,.61,.36,1)`; transição de telas fade + slide 0.28–0.32s.
- **Componentes base** recriados em React: `Btn`, `Field`, `Row`/`RowList`, `Chip`,
  `ChoiceCard`, `TabBar`, `EmptyState`, `AppHeader`, `ProgressDots`, conjunto de ícones
  SVG inline portado do objeto `ICONS` de `design_handoff_chamego/js/core.js`.
- **Layout**: área logada em container max-width ~430px centralizado (sensação de app
  nativo no desktop); landing full-width responsiva.

## Backend

### Schema (SQLite, better-sqlite3)

```sql
users          id, email UNIQUE, name, avatar_url, onboarding JSON,
               terms_accepted_at, created_at
couples        id, name, photo_url, milestone_date, milestone_label, created_at
couple_members couple_id, user_id UNIQUE, role ('creator'|'partner'), joined_at
invites        code UNIQUE, couple_id, created_by, status ('pending'|'accepted'|'revoked'),
               accepted_by, created_at
magic_links    token_hash, email, expires_at, used_at
```

`couple_members.user_id UNIQUE` ⇒ **um espaço por usuário** no MVP.

### Endpoints

```
POST  /api/auth/google            valida ID token (reusa verifyGoogleToken)
POST  /api/auth/magic-link        envia e-mail com link de uso único
GET   /api/auth/magic-link/:tok   autentica e redireciona para /app
POST  /api/auth/logout
GET   /api/me                     sessão + user + couple + partner
PATCH /api/me                     nome, onboarding, aceite de termos
POST  /api/couples                cria espaço (nome, data, significado)
PATCH /api/couples/:id            editar; só membro
POST  /api/couples/:id/invites    gera código (revoga anterior pendente)
GET   /api/invites/:code          preview público (nome do espaço, quem convidou)
POST  /api/invites/:code/accept   logado; vira partner do espaço
```

### Regras de negócio

- Convite aceito por quem já tem espaço → erro claro ("você já tem um espaço").
- Um código de convite ativo por casal; gerar novo revoga o pendente anterior.
- Sessão: cookie HMAC existente (`chamego_session`), 30 dias.
- Link mágico: token aleatório, hash armazenado, uso único, expiração curta (15 min).

### Degradação elegante

- Sem `GOOGLE_CLIENT_ID` → botão Google oculto, só link mágico.
- Sem SMTP configurado → em dev, o link mágico é impresso no console do servidor.

## Testes e gates

- **Vitest (backend)**: fluxo de auth (magic link ciclo completo, sessão), criação de
  espaço, convites (gerar, aceitar, revogação do anterior, erro de espaço duplicado),
  invariante de 1 espaço por usuário.
- Gates: `npm test` · `npx eslint .` · `npm run build`.

## Migração do código antigo

1. Criar branch `legacy-presente-digital` apontando para o estado atual da `main`.
2. Na `main`: remover páginas/componentes/rotas do presente digital (wizard, checkout,
   página do casal, retrospectiva, admin, minhas páginas) e módulos de backend não
   reutilizados (`payments.js`, `places.js`, `ai.js` — saem da main, vivem no branch).
   `auth.js`, `mailer.js`, `db.js` (adaptado), `server.js` (enxugado) permanecem.
3. Tabelas antigas do SQLite não são migradas; banco novo nasce do schema novo.
4. Atualizar `README.md` e `CONTEXT.md` para o produto novo (linguagem: Espaço do Casal,
   Convite, Parceiro, etc.).
