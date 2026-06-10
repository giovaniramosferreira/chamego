# Chamego

Plataforma de presentes digitais românticos: o Criador monta uma Página do Casal e compartilha por link bonito/QR Code. Marca: **Chamego** (domínio alvo `chamego.app`). Monetização: Plano Vitalício R$19,90 via Pix (Mercado Pago). Estética editorial (inspiração every.to): fundo creme, serifa display, fotos grandes, mobile-first. Sem redes sociais por enquanto; nenhuma referência à marca de origem do clone.

## Language

**Página do Casal**:
A página pública personalizada (`/p/:slug`) que é o produto entregue ao cliente.
_Avoid_: site, surpresa, presente (genéricos)

**Criador**:
A pessoa que monta e paga pela Página do Casal.
_Avoid_: usuário, cliente (ambíguo com Destinatário)

**Destinatário**:
A pessoa amada que recebe o link e visualiza a Página do Casal.

**Wizard**:
O fluxo de criação em etapas onde o Criador preenche os dados da página.
_Avoid_: formulário, cadastro

**Rascunho**:
Página do Casal criada mas ainda não paga; não acessível publicamente.
_Avoid_: draft

**Publicação**:
Ativação da Página do Casal após confirmação de pagamento Pix (pay-to-publish), disparada pelo webhook do Mercado Pago.

**Plano Vitalício**:
Único produto à venda: R$19,90, pagamento Pix único, página no ar para sempre. (Substitui os antigos planos 24h/Para Sempre e o upsell de mini-série.)

**Roteiro de Dates**:
Cards Dia (café, passeio, brunch) e Noite (restaurante, bar, sobremesa) com lugares reais do Google Places — foto, nota, faixa de preço, link Maps — cada um com uma frase romântica gerada por IA.
_Avoid_: sugestão de encontros, dates mocados

**Exclusão**:
Remoção da Página do Casal a pedido do Criador, feita manualmente via suporte no WhatsApp (sem login/self-service por enquanto).

## Relationships

- Um **Criador** monta uma **Página do Casal** através do **Wizard**
- Toda **Página do Casal** nasce como **Rascunho**; vira pública apenas via **Publicação**
- **Publicação** ocorre exclusivamente após pagamento Pix confirmado (webhook Mercado Pago)
- O **Roteiro de Dates** pertence a uma **Página do Casal** e é gerado a partir da localização escolhida no **Wizard**

## Example dialogue

> **Dev:** "Quando o **Criador** termina o **Wizard**, a página já fica no ar?"
> **Domain expert:** "Não — vira **Rascunho**. O link `/p/:slug` só abre depois da **Publicação**, que o webhook do Mercado Pago dispara."

## Flagged ambiguities

- "usuário" era usado para Criador e Destinatário — resolvido: são papéis distintos.
- Jornada antiga no código tinha criação 100% grátis com `status: 'paid'` hardcoded — resolvido: modelo é pay-to-publish.
