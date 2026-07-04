# Chamego

App de organização da vida a dois. O casal cria um **Espaço do Casal** privado
com agenda, listas, momentos e camada de conexão ("Vocês"). Marca: **Chamego**.
Estética editorial terracota (Fraunces + Hanken Grotesk), mobile-first.
Grátis na fundação; packs premium são fase futura.

## Language

**Espaço do Casal**:
A unidade central do produto — container privado que reúne tudo do casal.
Cada usuário participa de no máximo um espaço.
_Avoid_: conta (é do usuário, não do casal), grupo

**Parceiro(a)**:
A segunda pessoa do espaço, conectada via Convite.
_Avoid_: destinatário (era do produto antigo), usuário (ambíguo)

**Convite**:
Link/código de pareamento que conecta o Parceiro ao Espaço do Casal.
Um convite pendente por espaço; gerar novo revoga o anterior.
_Avoid_: invite

**Código de Pareamento**:
Forma curta do Convite (6 caracteres, sem 0/O/1/I/L) para digitar ou ditar.

**Link Mágico**:
Email com link de uso único (15 min) que autentica sem senha.
_Avoid_: código OTP, senha

**Começar (fluxo)**:
Sequência obrigatória pós-primeiro-login: Termos → Onboarding → criação do
Espaço do Casal. Guardada pela rota `/app/comecar`.
_Avoid_: cadastro, wizard (termo do produto antigo)

**Onboarding**:
3 perguntas (objetivo, estágio do relacionamento, sozinho/convidar) que
personalizam o início. Persistido em `users.onboarding` (JSON).

**Contador de Dias**:
Dias desde a data-marco (`milestone_date`) do espaço — destaque do Início.

**As 5 abas**: Início, Agenda, Listas, Momentos, Vocês. Fase 1 entrega Início;
as outras têm estados "em breve".

## Relationships

- Um usuário (email) pertence a no máximo um **Espaço do Casal** (`couple_members.user_email UNIQUE`)
- O criador do espaço tem role `creator`; quem aceita o Convite, role `partner`
- **Convite** pertence ao espaço; aceitar exige login e não ter espaço próprio
- Fluxo **Começar** precede o app: sem termos + onboarding + espaço, `/app` redireciona

## Flagged decisions

- Pivot completo (jul/2026): presente digital aposentado, código no branch `legacy-presente-digital`
- Auth sem senha (Google + Link Mágico) — herdada do produto anterior
- Web mobile-first primeiro; app nativo é decisão futura
- Permissões (notificações/calendário/fotos) fora do onboarding — pedidas no primeiro uso real
