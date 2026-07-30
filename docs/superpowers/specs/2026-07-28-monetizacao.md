# Monetização — julho/2026

Antes desta mudança o app **dava o premium de graça**: o `PaywallSheet` chamava
`PATCH /api/subscription`, rota aberta a qualquer pessoa logada. Agora existe
cobrança de verdade, com uma regra clara de grátis vs pago.

## O corte: grátis para sempre × Chamego Juntos

O grátis precisa ser um app inteiro e útil sem prazo — é ele que faz o casal
convidar o par e virar hábito. O pago é o que **acumula** com o tempo.

| Grátis, sem prazo | Chamego Juntos (R$ 14,90/mês · R$ 89/ano) |
|---|---|
| Agenda, listas, momentos, planos, datas | Fotos ilimitadas (grátis: 30) |
| Check-in, chat, convite do par | Cápsulas ilimitadas (grátis: 3) |
| Lembretes por email e feed `.ics` | Álbuns ilimitados + retrospectiva (grátis: 1) |
| Quizzes e ideias de date básicos | Todos os quizzes e trilhas de Conexão |
| **Exportar todos os dados** | Packs de ideias de date, coleções de conquistas |

Duas regras que não se negociam:

1. **Exportar os próprios dados nunca é recurso pago** — é direito (LGPD), e
   está coberto por teste.
2. **Cancelar não apaga nada.** Acima do limite, o conteúdo existente continua
   acessível; só a criação de novos itens pede o plano.

Assinatura é **por Espaço do Casal**, não por pessoa: uma cobrança serve aos dois.

## Como o acesso é concedido

`db.getSubscription` **deriva** o direito de uso do estado guardado — nunca de
um campo escrito pelo cliente:

- teste grátis vigente (`trial_ends_at > agora`), 14 dias, uma vez por espaço,
  sem cartão;
- período pago vigente (`status` ∈ active/past_due/canceled e
  `current_period_end` no futuro) — cancelado continua valendo até o fim do
  período já pago.

Quem escreve esse estado: o **webhook assinado** do provedor (`backend/billing.js`),
o início do teste, ou uma cortesia manual com `ADMIN_KEY`.

## Fluxo técnico

```
PaywallSheet / limite 402 → /app/plano → POST /api/billing/checkout
   → Stripe Checkout (cartão; Pix no anual) → webhook assinado
   → db.saveSubscription → entitlements liberados
```

- `/api/billing/webhook` é montado **antes** do `express.json()`: a assinatura
  do Stripe não fecha sobre JSON reserializado.
- Limites do plano grátis são aplicados no servidor (`withinLimit`) e devolvem
  **402 com `upgrade: true`**; o front transforma isso em paywall (`UpgradeGate`),
  com a frase do próprio servidor.
- `POST /api/billing/portal` abre o portal do Stripe: trocar cartão, ver recibos
  e cancelar em dois toques.
- Sem `STRIPE_SECRET_KEY` o app roda inteiro; a tela de Plano mostra "em breve"
  e o teste grátis continua funcionando.

## Medição do funil

Eventos próprios em `events_log` (sem analytics de terceiros): `paywall_visto`,
`limite_atingido`, `plano_visto`, `teste_iniciado`, `checkout_iniciado`,
`assinou`, `cancelou`, `pagamento_falhou`. `GET /api/admin/metrics` (ADMIN_KEY)
resume: espaços criados, casais conectados, em teste e assinantes.

Sem esses números não dá para escolher preço nem pacote — é o que diz se o
problema é conversão ou retenção.

## Pendências fora do código

- CNPJ/MEI e emissão de nota fiscal (o Stripe não emite).
- Criar os preços no painel do Stripe e preencher `STRIPE_PRICE_*`.
- Configurar o webhook apontando para `PUBLIC_URL/api/billing/webhook`.

## Verificação

98 testes (14 novos só de cobrança: limites, quem concede acesso, fim de
assinatura, webhook, funil), lint sem erros, build ok e passagem no navegador:
limite grátis → paywall → tela de Plano → teste grátis → recurso liberado, com
o funil registrando cada passo.
