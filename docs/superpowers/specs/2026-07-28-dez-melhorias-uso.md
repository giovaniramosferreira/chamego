# Dez melhorias de uso — julho/2026

Objetivo: deixar o Chamego mais simples e prático **sem tirar função nenhuma**.
Cada item abaixo saiu de um problema observado no código atual.

## 1. Um "+" só, no shell do app
`AppShell` passa a ter um botão de adicionar global (aparece nas 5 abas; telas
de dentro mantêm a ação própria, sem dois botões redondos). `QuickAdd` lê texto
natural — "jantar sexta 20h no Oliva" vira evento com data, hora e local
(`src/lib/quick-parse.js`, com testes) — e cria evento, item de lista, momento,
data importante ou plano. O mesmo campo busca no que já existe
(`GET /api/search`), então criar e encontrar moram no mesmo lugar.

## 2. Recursos invisíveis voltaram a ter porta de entrada
Quiz, Conquistas, Lembretes, Resumo, Conexão e Ideias de date tinham rota, tela
e backend, mas **nenhum link** desde o refactor `aafff84`. Agora existem:
- `/app/mais` — hub "Tudo do Chamego", agrupado por intenção;
- seção "Descobrir" na aba Vocês;
- `DiscoveryCard` no Início: um recurso por dia, com o resumo no domingo.

## 3. Desfazer no lugar de `confirm()`
`ToastProvider` (`src/lib/toast.jsx`): avisos curtos e exclusão otimista — some
da tela na hora e só vai ao servidor quando a janela de 5s fecha (pendências são
liberadas no `beforeunload`). Substituiu todos os `confirm()` de Agenda, Listas
e Momentos. Marcar item de lista e adicionar item ficaram otimistas.

## 4. Fluxo "Começar" enxuto
Era: termos → 3 perguntas → nome → data → convite (6 telas). Agora: **1 pergunta**
(objetivo) → espaço (nome + data opcional) → convite. Termos são aceitos no
"continuar" da entrada, com texto completo em `/termos`. A fase do relacionamento
virou campo opcional nas Configurações.

## 5. O espaço nasce com conteúdo
`db.seedCouple` usa a resposta do onboarding (que antes era salva e nunca usada):
listas de rotina, lista para fazer junto, wishlist ou um plano com etapas — e, se
houver data-marco, o próximo aniversário já entra na agenda.

## 6. Convite em um toque
`InviteActions` (Começar, Início e Config): compartilhamento nativo
(`navigator.share`, com WhatsApp de reserva), envio direto por email
(`POST /api/couples/:id/invites { email }`) e código de pareamento. Quem convidou
recebe email quando o par aceita. No modo solo, recursos de casal aparecem
travados com o motivo (`LockedRow`) em vez de sumirem.

## 7. O app lembra por vocês
- PWA: `manifest.webmanifest`, ícones (inclusive maskable), `sw.js` com
  network-first para API/navegação e faixa "Deixe o Chamego na tela de início".
- Emails automáticos (`backend/notifier.js`): agenda da véspera e resumo de
  domingo, idempotentes por `notifications_sent`, desligáveis em Configurações.
- Calendário: `.ics` por evento e feed assinável por token
  (`/api/calendar/:token.ics`, só eventos compartilhados).

## 8. Conceitos duplicados unificados
- Datas importantes agora aparecem no próprio calendário da Agenda (marcador +
  linha), sem bloco paralelo.
- Wishlist tem um dono só: Datas & presentes. Listas não cria mais wishlist e
  aponta pra lá; wishlists antigas continuam funcionando.
- `CheckRow` no kit: item de lista e etapa de plano marcam do mesmo jeito.

## 9. Início como painel vivo
O par vem primeiro (humor do dia, ou "ainda não fez check-in" com **cutucão** de
um toque, que manda a mensagem pro chat). Badge de não lidas na tab bar
(`message_reads` + `/api/badges`). O que já foi resolvido some de "Pra hoje".
Sem data-marco, o card do contador vira convite pra definir a data.

## 10. Confiança e controle
Configurações ganharam "Seus dados": baixar tudo (`GET /api/export`), sair do
espaço, excluir o espaço (confirmação digitada), termos. Falha de rede virou
faixa visível (`ConnectionBanner`) em vez de lista vazia silenciosa.

## Verificação
84 testes (vitest), lint sem erros, build ok e passagem completa no navegador:
login → onboarding → espaço semeado → "+" com texto natural → desfazer → hub →
telas antes órfãs → Configurações.
