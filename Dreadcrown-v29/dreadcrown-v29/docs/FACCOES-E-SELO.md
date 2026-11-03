# Facções, Selo, origens e coroa (v29)

Fonte narrativa: [LORE.md](LORE.md). Esta página descreve **o que está implementado** e onde.

## Arquivos
| Arquivo | Conteúdo |
|---|---|
| `src/data/jogo/faccoes.js` | As 14 facções (id, nome, categoria, raças, alvos, posição sobre o selo, descrição). |
| `src/data/jogo/origens.js` | As 10 origens (bônus, reputação inicial, peso do sorteio, linhagem). |
| `src/rules/origem.js` | `sortearOrigem(semente, pesos)` (determinístico) e `bonusOrigem(heroi)`. |
| `src/rules/reputacao.js` | Reputação −100..100 por facção, faixas Hostil/Neutra/Amistosa/Aliada, ajuste e saneamento. |
| `src/rules/selo.js` | Estado do Selo: Firme → Rachado → Partido → Aberto (`moverSelo`, `enfraquecerSelo`, `restaurarSelo`). |
| `src/rules/campanha.js` | Estado de campanha (reputação, selo, eixos, coroa, linhagem), `aplicarOrigem`, `registrarEixo`, `sanearCampanha`. |
| `src/rules/heroi.js` | Soma o bônus da origem em `criarHeroi` e `recalcular`. |
| `src/state/save.js` | Save **v4** e migração 3 → 4. |
| `src/ui/jogo/criacao.js`, `painel-heroi.js` | Cartão "Origem sorteada" na criação; aba **Destino** na ficha (batalha e mundo). |

## Origem sorteada
- Sorteada **ao abrir a criação** de personagem; o jogador não escolhe e não pode re-sortear (mudar raça/classe não re-sorteia).
- Chance igual para todas (`peso: 1`); para tornar uma origem rara, mude o `peso` em `origens.js`.
- Bônus planos em atributos já existentes, exatamente como na tabela do LORE.md (testado contra uma cópia independente da tabela, para 5 raças × 6 classes × 5 ramificações × 10 origens).
- O modo ADM não usa origem. Heróis criados antes da v29 continuam sem origem e **sem bônus retroativo**.
- Um id de origem desconhecido num save é removido (sem bônus) e avisado.

## Decisão tomada onde o LORE.md não dava número
- Reputação inicial da origem: cada "+1"/"−1" da tabela vale **±25** (uma faixa acima/abaixo de Neutra). Faixas: Hostil ≤ −25 · Neutra −24..24 · Amistosa 25..59 · Aliada ≥ 60.

## O que NÃO existe ainda (de propósito)
- Nenhum evento do jogo altera Selo, reputação, eixos ou linhagem automaticamente: existem as funções (ganchos) e a leitura na ficha; as missões e escolhas que as usam são de versões futuras.
- A coroa tem um só estado ("separada do corpo do Louco"); a linhagem vai de Adormecida a Desperta, e só a origem "Herdeiro sem nome" parte de "Sinais em sonhos".
- "Sangue Primeiro" não declara quais povos persegue: o LORE.md ainda não define (marcado "a definir" na descrição).
- A reputação não tem efeito de combate, de preço da loja nem de diálogo.
