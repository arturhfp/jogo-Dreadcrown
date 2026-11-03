# Campanha principal: a Rede do Louco (proposta para a v31)

Convenção: **[CONFIRMADO]** = dito pelo autor; **[PROPOSTA]** = criado por Claude, aguardando aprovação; **[ABERTO]** = pergunta pendente. **v31: o esqueleto (seções 8 e 9) já está no código.**

## 1. Ideia central [CONFIRMADO]
- Estilo **Ghost Recon Wildlands**: o herói começa com **alvos pequenos** para obter **informações** e **sobe na hierarquia** até chegar à **coroa**, aos **dois dragões** (Solaris e Estaroh) que protegem o Louco, e ao **Louco**.
- Em cada alvo o jogador **escolhe como agir**: **derrotar (poupar/capturar)** ou **matar**. A escolha mexe na reputação, nos contadores de escolha e no que o jogador recebe.
- Os alvos ficam **espalhados pelo mundo**: masmorras, catacumbas, mundo aberto e cidades.
- Começa com **5 missões**, com estrutura pronta para chegar a **10**.
- Reputação de **−100 a +100** [já existe no jogo desde a v29: faixas Hostil ≤ −25 · Neutra · Amistosa ≥ 25 · Aliada ≥ 60]. A reputação traz **recompensas e debuffs**, desde que não quebre o equilíbrio.

## 2. Hierarquia da rede [PROPOSTA]
Degraus, do mais baixo ao mais alto. Cada degrau entrega **informação** (uma pista que revela no mapa onde está o degrau acima).
| Degrau | Papel | Entrega ao ser vencido |
|---|---|---|
| 1. Informante | Gente miúda: mensageiros, recrutadores, contrabandistas | Local de um Tenente |
| 2. Tenente | Chefe de uma região; dá ordens aos informantes | Local de um Comandante e uma pista sobre a coroa |
| 3. Comandante | Chefe de um território; guarda segredos do rito | Local dos guardiões e um fragmento de mapa |
| 4. Guardiões | **Solaris e Estaroh** (barreira antes do Louco) | Caminho até o Louco (pode ser enfrentá-los ou escolher um lado) |
| 5. O Louco | Chefe final, com a **coroa** | Final conforme as escolhas |
Quem forma a rede ainda é [ABERTO]: o mais natural é o **Culto do Rei Desperto** (os que sabem onde o Louco está), com a **Legião Rubra** como rede rival que também procura a coroa. Os alvos podem ser de qualquer facção ligada ao caminho.

## 3. As 5 primeiras missões [PROPOSTA, esqueleto]
Os alvos são **papéis**, sem nomes próprios (nomes = lore, a aprovar). Os locais usam o que o mundo já tem.
| # | Degrau | Onde | Como cumprir | Informação obtida |
|---|---|---|---|---|
| 1 | Informante | Vale Quebrado (estrada) | Combate real; poupar ou matar | Local do Tenente das Terras Mortas |
| 2 | Informante (grupo de 2) | Bosque/Pântano do Vale | Combate real; poupar um dos dois ou matar | Local do Tenente + rota |
| 3 | Tenente | Cemitério/Terras Mortas | Combate real; poupar ou matar | Local da dungeon (**Catacumbas, que já existe**) |
| 4 | Comandante | **Catacumbas** (o chefe atual, Mímico Ancestral, ou um alvo novo no último salão) | Dungeon + chefe | Fragmento da coroa / local da Fortaleza Rubra |
| 5 | Comandante | Fortaleza Rubra | Combate real; poupar ou matar | Local do Portão Negro / dos guardiões |
**6 a 10 (futuro):** mais tenentes e comandantes (Picos, Fenda, cidades), depois **Solaris**, **Estaroh** e o **Louco**. A estrutura de dados aceita acrescentar degraus sem mudar o código.

## 4. Escolhas e consequências [PROPOSTA]
Cada alvo oferece, depois da vitória, **Matar**, **Poupar e interrogar** ou (nos alvos grandes) **Recrutar** (só quando a lore permitir).
| Ação | Contadores | Reputação (exemplo) | Observação |
|---|---|---|---|
| Matar | +Crueldade | ↑ com a facção rival do alvo, ↓ com a facção dele, ↓ leve com quem preza misericórdia | Informação sempre obtida |
| Poupar e interrogar | +Misericórdia | ↑ leve com quem preza misericórdia, ↓ com facções linha-dura | Informação obtida; o alvo pode reaparecer (retaliação ou aliado) |
Matar ou poupar **também** move Selo × Despertar conforme o alvo (ex.: matar quem protege o Selo empurra para o Despertar). Valores exatos [ABERTO].

## 5. Recompensas e debuffs por reputação (−100 a +100) [PROPOSTA]
Regra de equilíbrio: **nenhum debuff reduz atributos nem trava o jogo**; recompensas e debuffs são **econômicos, de acesso e de encontro**, e têm teto.
| Faixa | Recompensa | Debuff |
|---|---|---|
| Aliada (≥ 60) | Contratos e estoque exclusivo, descontos maiores (teto −15%), informação extra | Fica mal visto pelos inimigos dessa facção |
| Amistosa (25 a 59) | Pequenos descontos (teto −10%), acesso a locais, dicas | Nenhum |
| Neutra | Nada | Nada |
| Hostil (≤ −25) | Nada | Preço +10% (teto) nos acampamentos dessa facção, patrulhas e emboscadas dessa facção, acesso negado a locais dela |
Racistas continuam rejeitando por ideologia (regra da v30): reputação alta com elas não apaga isso.

## 6. Como encaixa no que já existe
- **Mapa e descoberta:** cada informação obtida **revela** o ponto seguinte no mapa-múndi (o sistema de descoberta já existe).
- **Dungeons:** as Catacumbas já têm entrada física, chefe e baús. A missão 4 reaproveita isso.
- **Combate:** os alvos usam o combate por turnos real; nada de sistema paralelo.
- **Reputação, Selo e eixos:** já existem como dados (v29/v30); a v31 faz os eventos movê-los.
- **Clãs:** a deserção/expulsão pode ser consequência de certas escolhas (a definir).

## 7. Pendências [ABERTO]
1. Quem forma a rede (Culto? Legião também?) e se há mais de uma rede.
2. Nomes e histórias dos alvos (hoje só papéis).
3. Valores exatos de reputação e dos deslocamentos de Selo × Despertar.
4. Onde ficam Solaris e Estaroh no mapa (masmorra, mundo aberto ou cidade).
5. Se existe a opção **Recrutar**.
6. Aprovar os tetos de desconto e de preço da seção 5.

## 8. Decisões aprovadas pelo autor (v31) [CONFIRMADO]
- **Missões também para facções e clãs**, muitas, cada uma com raridade ou nível à escolha do Claude.
- **Rede do Louco = Culto do Rei Desperto, com a Legião Rubra como rede rival.** O mesmo padrão vale para as outras facções, sempre com um gancho de história que as ligue ao enredo.
- **Solaris e Estaroh são dragões gêmeos**: Solaris, a Entidade da Luz Divina e das Chamas Solares (**dia**); Estaroh, a Entidade Astral do Crepúsculo e do Vazio (**noite**). Podem ficar em cantos separados, ligados ao ciclo dia/noite, ou numa dungeon que lembra um céu de estrelas. **Ainda só dados/lore: não estão no jogo.**
- **Recrutar** aprovado; nomes e histórias dos alvos são livres para o Claude criar.

## 9. O que a v31 implementa [NO CÓDIGO]
- Alvos são **inimigos já existentes** no mundo (sem inimigo novo, sem mudança de balanceamento): Rede 1 = `vale:3`, Rede 2 = `vale:0`, Rede 3 = `cavernas:1`, Rede 4 = `dg:catacumbas:2` (Ossuário), Rede 5 = `fortaleza:0`.
- Após a vitória sobre um alvo: **Matar / Poupar e interrogar** (e **Recrutar** nos comandantes). Os efeitos (reputação, eixos, Selo, moedas, pista no mapa, linhagem) estão em `src/data/jogo/missoes.js`.
- Contratos: 2 de facção (Hordas Cinzentas, Andarilhos) e 1 de clã (Rastro-de-Lobo, só para quem pertence). Concluem ao vencer o alvo.
- Aba **Diário** no painel do herói.
- **Preço por reputação** (Guilda dos Cinco Cofres): aliada −15%, amistosa −10%, hostil +10%; vem depois do desconto de clã. Nenhum debuff de atributo.
- Como a Rede tem a Legião como rival, a Rede 5 já aponta o Portão Negro (Fenda Infernal).
### Catálogo para versões futuras (não implementado)
Contratos de facção: Cruzada (queimar aldeia: dilema), Folha Eterna (expulsar intrusos), Cinco Cofres (escolta de caravana), Cinzas (relíquia de necromante), Concílio Prata (inscrição selante), Pedra-Funda (âncora do Selo), Filhos da Brasa (refúgio). Clãs: um contrato por clã (14 restantes). Guardiões: Solaris (dia) e Estaroh (noite), antes do Louco.
