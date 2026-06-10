# Chamego — Spec de Produto e Arquitetura

Data: 2026-06-10
Status: aprovado pelo Criador do projeto (Giovani) após sessão de grill.
Glossário canônico: ver `CONTEXT.md` na raiz.

## 1. Visão

**Chamego** (domínio alvo: `chamego.app`) é uma plataforma de presentes digitais românticos. O **Criador** monta uma **Página do Casal** num **Wizard** mobile-first, paga **R$19,90 (Pix, pagamento único, Plano Vitalício)** e recebe um link bonito (`/p/maria-e-joao`) + QR Code para presentear o **Destinatário**.

Modelo: **pay-to-publish**. A página nasce como **Rascunho**; o link público só abre após a **Publicação**, disparada pelo webhook de pagamento do Mercado Pago.

Estética: **editorial** (inspiração every.to) — fundo creme, títulos em serifa, fotos grandes, whitespace generoso, mobile-first. Sem redes sociais por enquanto. Zero referência à marca que serviu de referência (varredura já executada).

## 2. Jornada do Criador

1. **Landing** (`/`) — editorial, fotos grandes, prova social, preço único R$19,90 com âncora ~~R$39,90~~, FAQ. CTA único: "Criar minha página".
2. **Wizard** (`/criar`) — 4 passos essenciais + 1 opcional:
   - **Passo 1 — Vocês**: nome do casal + data de início do relacionamento. Datas de nascimento opcionais (habilitam Sinastria).
   - **Passo 2 — Fotos**: upload até 8 fotos, UI grande e visual.
   - **Passo 3 — Mensagem**: carta/mensagem de amor do Criador.
   - **Passo 4 — Localização**: Google Places Autocomplete (cidade/bairro, restrito ao Brasil) + botão "usar minha localização" (geolocation → reverse geocode). Gera preview do **Roteiro de Dates**.
   - **Passo 5 — Toques finais** (tudo opcional/pulável): música (iTunes Search), áudio do casal (gravação ou upload), palavra secreta + dica, roleta do destino, conquistas (linha do tempo).
3. **Preview** — etapa final dentro de `/criar` (mesma rota do Wizard): a página real renderizada em estado Rascunho, CTA "Publicar por R$19,90".
4. **Checkout** (`/criar/checkout`) — e-mail opcional (recibo futuro) + QR Code Pix + copia-e-cola do Mercado Pago. Polling do status no frontend; webhook no backend é a fonte de verdade.
5. **Sucesso** — link público + QR Code (download PNG) + botão nativo "Compartilhar no WhatsApp". Slug salvo em `localStorage` (`couple-page-last`); banner "sua página" se o Criador voltar ao site.
6. **Exclusão** — manual, via WhatsApp do suporte (sem login/self-service nesta fase).

Caminho mínimo: 4 passos, ~2 minutos, tudo operável com o polegar.

## 3. Página do Casal (`/p/:slug`)

Seções (ordem sugerida, todas condicionais aos dados existentes):

1. Hero editorial: nomes em serifa grande, data, contador ao vivo (anos/meses/dias/h/m/s).
2. Fotos grandes (galeria/carrossel full-width, não miniatura polaroid).
3. Mensagem do Criador.
4. **Carta de Amor (IA)** — gerada 1× na criação, apenas exibida.
5. **Score de Compatibilidade** — gerado 1× na criação (componente `CompatibilityCard` integrado, sem botão de gerar).
6. **Sinastria** (se datas de nascimento) — texto IA + signos.
7. **Mapa Estelar** (`StarMapCard` integrado) — céu da data de início.
8. **Roteiro de Dates** — cards **Dia** (café, passeio, brunch) e **Noite** (restaurante, bar, sobremesa) com lugares reais: foto do Google Places, nome, nota ⭐, faixa de preço, link "Abrir no Maps", + 1 frase romântica de IA por lugar.
9. Áudio do casal + Veredito do Cupido (IA).
10. Conquistas (linha do tempo).
11. Palavra Secreta (jogo) e Roleta do Destino.
12. Fase da Lua da data de início.
13. **Retrospectiva** (stories estilo Instagram, `RetrospectiveStories` corrigido) — botão "▶ Ver nossa retrospectiva".

Regra dura: **nenhuma chamada de IA é disparada por visitante**. Todo conteúdo de IA é gerado server-side durante a criação e persistido.

## 4. Backend

Monolito Express hospedado no **Render Starter (US$7/mês)** com **disco persistente** montado (uploads + banco). O Express serve o build do Vite (`dist/`) com fallback SPA — um único serviço, sem CORS em produção. Em dev, Vite proxy `/api` e `/uploads` → `localhost:3001`.

### 4.1 Persistência

- **SQLite** via `better-sqlite3` (arquivo no disco persistente). Substitui `backend/db.json`.
- Tabelas: `pages` (slug PK, JSON de dados, status `draft|published`, timestamps), `payments` (id MP, slug, status, valor, timestamps).
- Uploads (fotos `photo-*`, áudios `audio-*`) no disco persistente, servidos em `/uploads`.

### 4.2 Endpoints

| Método/Rota | Função |
|---|---|
| `POST /api/drafts` | Cria/atualiza Rascunho; dispara geração IA (carta, score, sinastria, cupido, frases dos dates) e persiste resultados |
| `GET /api/pages/:slug` | Página publicada; Rascunho → `403` com corpo indicando estado |
| `POST /api/uploads/page-photo` | Upload fotos (multer, 8 máx, 10MB) |
| `POST /api/uploads/page-audio` | Upload áudio (25MB) + Whisper (se `OPENAI_API_KEY`) + veredito Cupido |
| `GET /api/places/autocomplete?q=` | Proxy Places Autocomplete (sessão, região BR) |
| `POST /api/places/roteiro` | Busca lugares Dia/Noite (Places API New: cafés/parques/brunch; restaurantes/bares/sobremesa), monta cards + frases IA |
| `POST /api/payments` | Cria pagamento Pix no Mercado Pago (R$19,90, `external_reference = slug`) → retorna QR + copia-e-cola |
| `GET /api/payments/:id/status` | Polling do frontend |
| `POST /api/webhooks/mercadopago` | Notificação MP; valida, consulta pagamento na API MP e, se aprovado, faz a Publicação (`status = published`) |
| `GET /api/health` | Health check |

### 4.3 Integrações e segredos (env vars no Render)

- `MP_ACCESS_TOKEN` — Mercado Pago (Pix dinâmico + consulta + webhook secret se aplicável)
- `GOOGLE_MAPS_API_KEY` — Places API (New). **Só no servidor** — navegador nunca vê a chave.
- `ANTHROPIC_API_KEY` — Claude **Haiku 4.5** (`claude-haiku-4-5-20251001`) para todo texto romântico.
- `OPENAI_API_KEY` — opcional; Whisper. Sem ela, Cupido usa nomes/mensagem/conquistas (degradação elegante).
- `PUBLIC_URL` — base para links/QR/webhook.

### 4.4 Slug

Gerado do nome do casal normalizado (`maria-e-joao`). Sem sufixo aleatório se livre; colisão → sufixo incremental curto (`maria-e-joao-2`).

## 5. Frontend

- Vite + React 19 + Tailwind (tema custom editorial). Rotas: `/`, `/criar`, `/criar/checkout`, `/p/:slug`. `UpsellPage` e `EmailStep` são removidas.
- **Design system editorial**: fundo creme `#FAF7F2`, display **Fraunces** (Google Fonts, variável), corpo **Inter**, texto quase-preto `#1A1714`, acento rosé profundo `#B3284F`, cantos discretos, sombras suaves, emoji só onde carrega significado.
- Mobile-first: alvos de toque ≥44px, inputs grandes, teclado correto por campo (`inputmode`), passos do Wizard com progresso visível, upload de foto direto da câmera/galeria.
- Toda chamada de API usa caminho relativo (`/api/...`); URLs `http://localhost:3001` hardcoded eliminadas (config única).

## 6. Correções de bugs (estado atual do código)

1. 20+ URLs `localhost:3001` hardcoded → caminhos relativos + proxy dev.
2. `RetrospectiveStories`: renderiza `data.signo1`/`data.signo2` (objetos `{name, symbol}`) e `data.conquistas` (array de objetos) como filhos React → crash. Corrigir para `signo.symbol`/resumo de conquistas.
3. `CheckoutPage` antiga enviava payload incompleto (perdia conquistas, áudio, sinastria etc.) — fluxo substituído pelo novo checkout.
4. 65 problemas de ESLint (imports não usados, `process`/`Buffer` sem globals Node no config, setState síncrono em effect no typewriter da Landing, funções impuras em render na Retrospectiva).
5. Componentes órfãos (`LoveLetterCard`, `CompatibilityCard`, `StarMapCard`, `RetrospectiveStories`) integrados ou absorvidos pela nova Página do Casal.
6. `backend/db.json` de teste com dados fake — zerado; substituído por SQLite.

## 7. Infra & lançamento

1. `git init` no projeto + commit inicial (já com varredura de marca feita).
2. Repositório GitHub novo (privado) via `gh` (usuário já autenticado).
3. Render: Web Service conectado ao repo, build `npm install && npm run build`, start `node backend/server.js`, disco persistente em `/var/data` (uploads + SQLite), env vars da seção 4.3.
4. Webhook MP apontando para `https://<app>.onrender.com/api/webhooks/mercadopago`; teste sandbox antes de produção.
5. Domínio `chamego.app` plugado depois (Render custom domain).

## 8. Custos & margem (referência)

- Fixo: Render US$7/mês.
- Variável por página: IA Haiku ~R$0,05 + Whisper ~R$0,06 + Places ~R$0,40 nominal (crédito grátis Google cobre o início) ≈ **R$0,15–0,60**.
- Mercado Pago ~0,99% por venda. Margem por venda de R$19,90 ≈ **R$18,90 (~95%)**.

## 9. Fora de escopo (por decisão)

- Conta/login do Criador; e-mail transacional; exclusão self-service (vai pra suporte WhatsApp); plano 24h; upsell separado; pagamento por cartão; redes sociais.
