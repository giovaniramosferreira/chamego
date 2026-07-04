# Chamego 💛

App para casais organizarem a vida a dois: agenda, listas, momentos (memórias)
e uma camada leve de conexão emocional — num espaço privado do casal.

> Pivot em julho/2026: o produto anterior (presente digital "Página do Casal")
> vive no branch `legacy-presente-digital`.

## Stack
- **Frontend:** React 19 + Vite + Tailwind CSS (mobile-first; Fraunces + Hanken Grotesk)
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

## Testes
```bash
npm test        # vitest (backend)
npx eslint .    # lint
npm run build   # build de produção
```

## Fluxo
Landing → Entrar (Google/Link Mágico) → Termos → Onboarding → Espaço do casal
→ Convite do parceiro → App (Início, Agenda, Listas, Momentos, Vocês).
Fase 1 entrega Início funcional; demais abas chegam nas fases 2–4.

## Referência de design
Protótipos navegáveis em `design_handoff_chamego/` (landing hifi + área logada).
Specs e planos em `docs/superpowers/`.
