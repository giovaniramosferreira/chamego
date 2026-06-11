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
Cards Dia (café, passeio, brunch) e Noite (restaurante, bar, sobremesa) com lugares reais do Google Places — foto, nota, faixa de preço, link Maps — cada um com uma frase romântica gerada por IA. Na Página do Casal aparecem fechados (dropdown); o Destinatário abre quando quiser.
_Avoid_: sugestão de encontros, dates mocados

**O Céu de Vocês**:
Seção celestial única da Página do Casal: signos, score de compatibilidade, sinastria curta, mapa estelar e fase da lua — substitui as antigas seções separadas (Score, Sinastria, Mapa Estelar, Lua).

**Poema do Casal**:
Texto de IA curto (3 estrofes) que substitui a antiga carta de amor longa.
_Avoid_: carta de amor (formato antigo, extenso)

**Exclusão**:
Remoção definitiva da Página do Casal (dados e fotos), feita manualmente via suporte no WhatsApp. Não confundir com **Despublicação** (self-service, reversível).

**Login do Criador**:
Autenticação do Criador por conta Google ou por **Link Mágico** enviado ao email. Não existe senha. A identidade é o email verificado — os dois métodos levam à mesma conta. Não é exigido para criar ou pagar a página — só para gerenciá-la. Celular é campo opcional de contato (nunca usado para login).
_Avoid_: cadastro (conflita com Wizard), conta, registro, senha

**Link Mágico**:
Email com link de uso único e validade curta que autentica o Criador ao ser clicado, em qualquer navegador.
_Avoid_: código, OTP

**Reivindicação**:
Vínculo entre a Página do Casal e a conta do Criador, oferecido após o pagamento ("Gerenciar sua página"). A prova de posse nasce no navegador onde a página foi criada e viaja junto do Login do Criador; página nunca reivindicada (ex.: navegador limpo antes) fica órfã e cai no fallback de suporte via WhatsApp.
_Avoid_: claim

**Minhas Páginas**:
Painel onde o Criador logado vê as páginas que reivindicou e pode Despublicar/Republicar.

**Despublicação**:
O Criador tira a Página do Casal do ar mantendo todos os dados; o link passa a se comportar como se a página não existisse (sem revelar que está escondida). Reversível pelo próprio Criador (**Republicação**), pois o Plano Vitalício é direito permanente.
_Avoid_: exclusão, apagar (sugerem remoção definitiva)

## Relationships

- Um **Criador** monta uma **Página do Casal** através do **Wizard**
- Toda **Página do Casal** nasce como **Rascunho**; vira pública apenas via **Publicação**
- **Publicação** ocorre exclusivamente após pagamento Pix confirmado (webhook Mercado Pago)
- O **Roteiro de Dates** pertence a uma **Página do Casal** e é gerado a partir da localização escolhida no **Wizard**
- Após a **Publicação**, o **Criador** pode fazer a **Reivindicação** da página com o **Login do Criador**
- Só páginas reivindicadas aparecem em **Minhas Páginas**; órfãs dependem do suporte (WhatsApp)
- **Despublicação** e **Republicação** são liga/desliga do Criador; **Exclusão** é definitiva e manual

## Example dialogue

> **Dev:** "Quando o **Criador** termina o **Wizard**, a página já fica no ar?"
> **Domain expert:** "Não — vira **Rascunho**. O link `/p/:slug` só abre depois da **Publicação**, que o webhook do Mercado Pago dispara."

## Flagged ambiguities

- "usuário" era usado para Criador e Destinatário — resolvido: são papéis distintos.
- Jornada antiga no código tinha criação 100% grátis com `status: 'paid'` hardcoded — resolvido: modelo é pay-to-publish.
