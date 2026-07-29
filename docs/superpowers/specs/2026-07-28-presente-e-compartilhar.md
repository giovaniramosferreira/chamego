# Presentear e compartilhar — julho/2026

Duas funcionalidades que são produto e marketing ao mesmo tempo: uma coloca o
Chamego na mão de quem ainda não conhece, a outra dá um jeito de terceiros
pagarem por um casal.

## 1. Card do contador (aquisição dentro do produto)

O Contador de Dias é o objeto mais compartilhável do app. Agora o Início gera
uma imagem 1080×1920 (formato story) com nome do casal, rótulo do marco, o
número em destaque e a assinatura `chamego.online`.

- `src/lib/share-card.js` — cálculo, formatação em pt-BR (`1.243 dias`), quebra
  de linha do nome e o desenho no canvas. Separado da UI justamente para ser
  testável: os testes usam um contexto falso e verificam **o que foi escrito**.
- Altura do cartão sai do conteúdo (nome de uma ou duas linhas, com ou sem
  data), não de um número fixo — era o que deixava vazio embaixo.
- `ShareCounter.jsx` usa `navigator.share` com arquivo (menu nativo: Instagram,
  WhatsApp, Fotos). Onde não existe, mostra a prévia com "Salvar imagem" e
  "Copiar legenda".
- Evento `contador_compartilhado` (nativo ou preview) entra no funil.

## 2. Presentear a assinatura

Quem presenteia costuma não ser usuário (mãe, amiga, padrinho). Então:

- **Comprar não exige conta**: `/presente` → `POST /api/gift/checkout` (Stripe
  em modo pagamento único, Pix quando habilitado). O email vem do próprio
  checkout e recebe o código.
- **O código nasce no webhook**, nunca no cliente. `gift_codes` guarda meses,
  origem (compra/parceria/cortesia), quem deu, o recado e a sessão do provedor
  (idempotência: webhook repetido não gera dois códigos).
- **Resgatar exige espaço do casal**: `POST /api/gift/:code/redeem` soma os
  meses em `subscriptions.gift_until`.

Duas decisões que evitam problemas reais:

1. **Crédito de presente vive em coluna própria.** Se ficasse em
   `current_period_end`, o próximo webhook do Stripe apagaria os meses
   presenteados. Há teste cobrindo exatamente isso.
2. **Presentes se acumulam** e nunca encurtam o que já valia — resgatar 3 + 6
   meses dá 9 meses, não 6.

Um código vale uma vez, para qualquer casal (testado), tem 10 caracteres do
alfabeto sem confusão (`0/O/1/I/L` fora) e é aceito com ou sem hífen, em
maiúsculas ou minúsculas.

### Códigos de parceria

`POST /api/admin/gift-codes` (ADMIN_KEY) emite até 50 códigos de uma vez com
remetente e recado. É o que viabiliza o canal de cerimonialistas e fotógrafos:
"3 meses de Chamego" como mimo que o profissional entrega aos clientes.

## Verificação

117 testes (19 novos: 10 do presente no backend, 9 do card), lint sem erros,
build ok. No navegador: card gerado e conferido visualmente, página pública do
presente com remetente e recado, resgate levando o espaço a premium com validade
de um ano, e a loja de presente exibindo "em breve" quando o Stripe não está
configurado.
