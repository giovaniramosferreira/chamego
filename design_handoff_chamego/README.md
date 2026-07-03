# Handoff: Chamego — Landing Page + Área Logada (Protótipo)

## Overview
Chamego é um app para casais organizarem a vida a dois: agenda, listas, momentos (memórias) e uma camada leve de conexão emocional ("Vocês"). Este pacote contém:
1. Uma **landing page de marketing** (`Chamego.html`).
2. Um **protótipo navegável de alta fidelidade da área logada** (`App.html`) cobrindo autenticação, onboarding, criação do espaço do casal, e as 5 áreas principais do app, com estados vazio/com conteúdo onde relevante.

## Sobre os arquivos de design
Os arquivos aqui são **referências de design em HTML** — protótipos clicáveis que mostram aparência e comportamento pretendidos, não código de produção para copiar diretamente. A tarefa é **recriar estes designs no ambiente/stack do app real** (React Native, SwiftUI, Flutter, etc. — o que já for usado no projeto), seguindo os padrões e bibliotecas já estabelecidos. Se ainda não existir um app real, escolha o framework mobile mais adequado (ex.: React Native ou Flutter para cobrir iOS + Android com uma base única) e implemente os designs nele.

## Fidelidade
**Alta fidelidade (hifi)** para a landing page: cores, tipografia e espaçamento finais.
**Alta fidelidade de fluxo / média fidelidade visual** para a área logada (`App.html`): a navegação, hierarquia de telas, componentes e estados estão completos e prontos para implementar; o visual usa o mesmo sistema de cor/tipografia da marca mas foi construído como protótipo web (HTML/CSS), não como um app nativo real — o desenvolvedor deve recriar os componentes (listas, chips, toggles, tab bar, calendário, chat) usando os componentes nativos/padrões do framework escolhido, mantendo as medidas e hierarquia como referência.

## Arquitetura de navegação
5 áreas principais (tab bar): **Início, Agenda, Listas, Momentos, Vocês**.
Fluxo linear antes do app principal: Splash → Boas-vindas → Login/Cadastro → Termos → Verificação → Onboarding (objetivo, estágio do relacionamento, sozinho ou convidar parceiro, permissões) → Criação do espaço do casal (nome, data importante, convite do parceiro) → App principal.

Todas as telas estão implementadas como "screens" registradas em `js/core.js` (função `registerScreen(id, {...})`) e navegadas via um roteador simples baseado em pilha (`go(id)`, `goBack()`, `goTab(tabId)`). Ver `js/core.js` para a lógica exata de navegação, e cada `js/screens.*.js` para o conteúdo de cada tela.

## Telas incluídas (por módulo)

### Autenticação e onboarding (`js/screens.auth.js`)
splash, welcome, login, signup, forgot (esqueci senha), reset (nova senha), terms (aceite de termos), verify (verificação de e-mail), onb-goal (objetivo principal), onb-stage (estágio do relacionamento), onb-alone (sozinho vs convidar), onb-perm (permissões), couple-name (nome do espaço), couple-date (data importante/contador), invite-partner (convite: link/WhatsApp/e-mail/código), partner-pending (aguardando aceite), partner-connected (parceiro conectado).

### Início (`js/screens.home.js`)
`home-root` — um único screen com **switcher de estado** (vazio / sozinho / conectado) visível no topo da tela, para demonstrar os 3 estados pedidos na spec sem precisar de 3 arquivos separados. Mostra saudação, contador de dias, próximo evento, tarefas pendentes, último check-in e atalhos rápidos.

### Agenda (`js/screens.agenda.js`)
`agenda-root` (switcher mês/semana/dia + lista de próximos eventos + meta de frequência de dates), `event-detail`, `event-create` (serve tanto para criar quanto editar), `date-planner`.

### Listas (`js/screens.listas.js`)
`listas-root` (switcher vazio/com conteúdo + visão geral de listas compartilhadas/individuais/wishlist), `list-detail` (itens, prioridade, prazo, atribuição, comentários), `add-item`, `lista-create`.

### Momentos (`js/screens.momentos.js`)
`momentos-root` (switcher vazio/com conteúdo + timeline), `moment-detail` (comentários e reações), `moment-add`, `diario` (diário a dois).

### Vocês (`js/screens.voces.js`)
`voces-root` (painel de conexão + atalhos), `checkin` (humor do dia + resumo da semana), `metas`, `perguntas` (pergunta guiada), `chat` (chat privado do casal).

### Configurações (`js/screens.config.js`)
`config-hub`, `profile`, `couple-profile`, `manage-partner`, `notif-settings`, `privacy-settings`, `account-settings`.

### Packs e assinatura (`js/screens.premium.js`)
`packs-store`, `pack-detail`, `paywall` (comparação free vs premium + trial), `checkout`, `checkout-confirm`, `subscription-manage`. Um exemplo de **estado premium bloqueado** está em `voces-root` (linha "Packs de conexão" com cadeado — classe CSS `.locked` + `.lock-badge`, reutilizável em qualquer card/linha que precise do estado bloqueado).

## Interações e comportamento
- **Navegação**: cliques em elementos com `data-go="screenId"` empilham uma nova tela; `data-back`/`data-close` voltam; `data-tab="tabId"` troca de aba e reseta a pilha daquela aba.
- **Transição entre telas**: fade + slide sutil (`opacity` + `translateX(14px)→0`, 0.28–0.32s, easing `cubic-bezier(.22,.61,.36,1)`).
- **Toggles/checkboxes**: elementos com `data-toggle` alternam a classe `.on`/`.checked` no clique (estado local, sem persistência real — é protótipo).
- **State switcher**: pequeno segmented control (`data-setstate="chave:valor"`) usado nas raízes de Início/Agenda/Listas/Momentos para alternar entre estados (vazio, sozinho, conteúdo etc.) — é um recurso *só do protótipo* para demonstrar múltiplos estados; a implementação real deve derivar o estado exibido dos dados reais (há conteúdo? o parceiro está conectado?), não de um switcher manual.
- **Landing → App**: os botões de CTA da landing (`Chamego.html`) linkam para `App.html`, que abre no `splash`.

## Design tokens (compartilhados entre landing e app)
Definidos em `chamego.css` (`:root` e seletores `[data-palette]`):
- **Paleta padrão "terracota"**: `--bg:#f6f0e7` (fundo), `--surface:#fffdf8` (cards), `--bg-tint:#efe6d8`, `--accent:#bd6a4b`, `--accent-press:#a5573b`.
- Paletas alternativas disponíveis via tweaks: `rose` (`--accent:#c65f76`), `wine` (`--accent:#8c2f4a`).
- **Tinta/texto**: `--ink:#2b2521`, `--ink-2:#6f645b`, `--ink-3:#a89d93`.
- **Tipografia**: títulos em `Fraunces` (serif, itálico usado para ênfase/"display-em"), texto em `Hanken Grotesk`.
- **Raios de canto**: `--r-card:22px`, `--r-btn:13px`, `--r-img:24px`, `--r-chip:999px` (ajustáveis via tweak "cantos": suave/médio/reto).
- **Easing padrão**: `--ease:cubic-bezier(.22,.61,.36,1)`.
- Estilos específicos do app (tab bar, chat bubbles, calendário, mood picker, plan cards, lock overlay etc.) estão em `app.css`.

## Assets
- 4 ilustrações em `images/` (abraco.png, encontro.png, janela.png, onibus.png) — enviadas pelo usuário como referência de tom visual (flat, quente, terracota/sage/creme). Usar como placeholder; substituir por fotos reais do usuário final quando disponíveis.
- `favicon.svg` — coração terracota simples sobre fundo creme.
- Ícones do app são SVGs inline (line icons, stroke 1.8px) definidos em `js/core.js` (objeto `ICONS`) — recriar como um conjunto de ícones nativo equivalente (ex.: SF Symbols no iOS, Material Symbols no Android, ou uma lib de ícones do projeto).

## Arquivos do projeto
- `Chamego.html` + `chamego.css` + `chamego.js` — landing page de marketing.
- `App.html` + `app.css` + `js/core.js` + `js/screens.auth.js` + `js/screens.home.js` + `js/screens.agenda.js` + `js/screens.listas.js` + `js/screens.momentos.js` + `js/screens.voces.js` + `js/screens.config.js` + `js/screens.premium.js` — protótipo da área logada.
- `tweaks.jsx` + `tweaks-panel.jsx` — painel de tweaks da landing (paleta, cantos, fonte, animação); não faz parte do produto final, é só uma ferramenta de exploração de design.

## Fora de escopo deste protótipo (mencionar ao time)
Localização compartilhada, espaço virtual/avatar/pet gamificado, IA de sugestões avançada e rotinas automatizadas — citados na spec como pós-MVP, não desenhados aqui.
