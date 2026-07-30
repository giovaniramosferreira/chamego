# Chamego 💛

App para casais organizarem a vida a dois: agenda, listas, momentos (memórias)
e uma camada leve de conexão emocional — num espaço privado do casal.

> Pivot em julho/2026: o produto anterior (presente digital "Página do Casal")
> vive no branch `legacy-presente-digital`.

## Stack
- **Frontend:** React 19 + Vite + Tailwind CSS (mobile-first; Fraunces + Hanken Grotesk), PWA instalável
- **Backend:** Express (monolito — serve API + build do frontend), SQLite (better-sqlite3)
- **Auth:** sem senha — Google Identity Services + Link Mágico por email

## Rodando local
```bash
npm install
npm run dev   # backend (:3001) + vite (:5173)
```
Sem SMTP configurado, o link mágico é impresso no console do servidor.

## Variáveis de ambiente
| Var | Obrigatória | Para quê |
|---|---|---|
| `SESSION_SECRET` | produção | assina o cookie de sessão |
| `GOOGLE_CLIENT_ID` | recomendada | botão "Continuar com Google" |
| `SMTP_HOST/PORT/USER/PASS` | produção | envio do Link Mágico |
| `MAIL_FROM` | opcional | remetente dos emails |
| `PUBLIC_URL` | produção | base p/ links de convite e magic link |
| `DATA_DIR` | produção | disco persistente (SQLite) |
| `STRIPE_SECRET_KEY` | p/ vender | cobrança; sem ela o app roda sem assinatura |
| `STRIPE_WEBHOOK_SECRET` | p/ vender | valida `/api/billing/webhook` |
| `STRIPE_PRICE_MENSAL/ANUAL` | p/ vender | IDs de preço (BRL) do painel do Stripe |
| `ADMIN_KEY` | recomendada | cortesias e `GET /api/admin/metrics` |
| `ANTHROPIC_API_KEY` | opcional | lê a foto da geladeira; sem ela, modo manual |

## Testes
```bash
npm test        # vitest (backend)
npx eslint .    # lint
npm run build   # build de produção
```

## Fluxo
Landing → Entrar (Google/Link Mágico, termos aceitos no "continuar") →
1 pergunta de objetivo → Espaço do casal (data opcional) → Convite →
App (Início, Agenda, Listas, Momentos, Vocês).

O espaço nasce com conteúdo conforme o objetivo escolhido. O "+" da barra
adiciona qualquer coisa a partir de texto natural ("jantar sexta 20h no Oliva")
e também busca no que já existe. Todos os recursos têm porta de entrada em
`/app/mais`.

## Lembretes fora do app
Com SMTP configurado, o servidor envia a agenda da véspera (a partir das 18h) e
o resumo semanal (domingo, a partir das 19h) — ligáveis/desligáveis em
Configurações. A agenda também pode ser assinada no Google/Apple Agenda pelo
feed `.ics` do espaço.

## Receita de Hoje
Responde "o que a gente come hoje?" por duas portas: a **roda** (uma receita,
ponderada por hora, dia, clima, despensa e histórico — 3 giros/dia no grátis) e
a **foto da geladeira** (visão → confirmação editável obrigatória → três
receitas com ângulos diferentes). O **modo cozinha** mostra um passo por tela
com timer, vibração e tela acesa, e termina em "cozinhamos isso" — a métrica que
diz se a feature funciona. A **despensa** alimenta uma lista de mercado que se
religa sozinha, aprendendo de quanto em quanto tempo cada item acaba.

Sem `ANTHROPIC_API_KEY` tudo funciona: o modo foto cai no manual. Detalhes em
`docs/superpowers/specs/2026-07-29-receita-de-hoje.md`.

## Planos
Grátis pra sempre: agenda, listas, momentos, check-in, chat, convite, lembretes
por email, feed `.ics` e exportação dos dados. **Chamego Juntos** (R$ 14,90/mês
ou R$ 89/ano, por casal) abre fotos/cápsulas/álbuns ilimitados, retrospectiva e
todos os packs de conteúdo. Teste de 14 dias sem cartão, uma vez por espaço.

O acesso é derivado do estado da assinatura no servidor; quem escreve esse
estado é o webhook do Stripe. Detalhes em
`docs/superpowers/specs/2026-07-28-monetizacao.md`.

**Presente** (`/presente`): qualquer pessoa compra 3, 6 ou 12 meses sem criar
conta e recebe um código por email; o casal resgata em Configurações → Plano.
Os meses ficam num crédito separado (`subscriptions.gift_until`), então o
webhook da assinatura nunca apaga o que foi presenteado. Códigos de parceria
(cerimonialistas, fotógrafos, imprensa) saem de
`POST /api/admin/gift-codes` com `ADMIN_KEY`.

**Compartilhar o contador**: o Início gera um PNG 1080×1920 do contador de dias
(`src/lib/share-card.js`) e chama o compartilhamento nativo do celular — com a
assinatura `chamego.online` no rodapé.

## Referência de design
Protótipos navegáveis em `design_handoff_chamego/` (landing hifi + área logada).
Specs e planos em `docs/superpowers/`.
