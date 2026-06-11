# Chamego 💌

Presente digital para casais: o Criador monta uma Página do Casal (fotos, mensagem, música, contador, jogos e conteúdo gerado por IA), paga R$19,90 uma única vez via Pix e compartilha por link bonito ou QR Code.

## Stack
- **Frontend:** React 19 + Vite + Tailwind CSS (estética editorial: Fraunces + Inter)
- **Backend:** Express (monolito — serve API + build do frontend), SQLite (better-sqlite3), uploads em disco
- **Integrações:** Mercado Pago (Pix dinâmico + webhook), Google Places API New (roteiro de dates com lugares reais), Anthropic Claude Haiku 4.5 (carta, sinastria, cupido, score), OpenAI Whisper (transcrição de áudio, opcional)

## Rodando local
```bash
npm install
npm run dev   # sobe backend (:3001) + vite (:5173) juntos
```

## Variáveis de ambiente
| Var | Obrigatória | Para quê |
|---|---|---|
| `MP_ACCESS_TOKEN` | produção | Pix Mercado Pago |
| `GOOGLE_MAPS_API_KEY` | produção | Places (roteiro de dates) |
| `ANTHROPIC_API_KEY` | recomendada | textos de IA (sem ela usa fallbacks) |
| `OPENAI_API_KEY` | opcional | transcrição Whisper |
| `PUBLIC_URL` | produção | base p/ webhook e links |
| `DATA_DIR` | produção | disco persistente (SQLite + uploads) |

Sem chaves, tudo degrada com elegância (textos simulados, roteiro vazio, pagamento indisponível).

## Testes
```bash
npm test        # vitest (backend)
npx eslint .    # lint
npm run build   # build de produção
```

## Deploy (Render)
Blueprint em `render.yaml` (próxima task): Web Service Node, build `npm install && npm run build`, start `node backend/server.js`, disco persistente em `/var/data` (`DATA_DIR`). Webhook do Mercado Pago aponta para `https://<app>/api/webhooks/mercadopago`.

## Fluxo
Landing → Wizard (6 passos) → `POST /api/drafts` (IA gera conteúdo, vira Rascunho) → Checkout Pix → webhook aprova → Publicação → `/p/:slug` no ar para sempre.
