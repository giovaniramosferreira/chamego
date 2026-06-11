# 1. Reivindicação pós-pagamento em vez de login obrigatório no checkout

Date: 2026-06-11

## Status

Accepted

## Context

O Chamego precisava de self-service para o Criador gerenciar (despublicar/republicar) sua Página do Casal, que até então só podia ser removida via suporte no WhatsApp. A forma óbvia seria exigir login (Google) antes do checkout, garantindo que toda página nasce com dono. Mas o funil de venda é por impulso (presente romântico, ticket R$19,90) e qualquer atrito antes do Pix derruba conversão.

## Decision

Páginas nascem **sem dono**. No momento da criação, o backend gera um `claim_token` secreto que fica no navegador do Criador (localStorage). Após o pagamento, oferecemos "Gerenciar sua página": o Criador faz Login do Criador (Google ou Link Mágico por email — identidade unificada pelo email verificado) e a Reivindicação envia os `claim_token` junto do login, vinculando a página ao email do dono. No Link Mágico os tokens viajam embutidos no pedido de login, então o clique pode acontecer em qualquer navegador (resolve in-app browsers de apps de email). A oferta persiste enquanto houver token não reivindicado no navegador; o token não expira. O email foi removido do checkout (Mercado Pago recebe placeholder).

## Consequences

- Zero atrito novo no funil de venda; login só aparece depois do dinheiro entrar.
- Slug público não serve como prova de posse — sem o token, ninguém sequestra página alheia.
- Página cujo navegador foi limpo/trocado antes da Reivindicação fica **órfã**: gerência só via suporte (WhatsApp), que permanece como fallback documentado.
- Páginas legadas (publicadas antes desta mudança) não têm token e são todas órfãs.
- "Minhas Páginas" só lista páginas pagas e reivindicadas; Rascunhos nunca aparecem lá.
- Reverter para login-no-checkout depois exigiria migração de fluxo e de schema.
