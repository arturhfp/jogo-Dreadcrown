# Dreadcrown v29 — fundação da lore

Base: v28. Escopo: **dados e regras** de facções, reputação, Selo, origens sorteáveis e coroa/linhagem, com leitura na interface. Sem cidades, missões novas ou combate em tempo real.

## O que mudou
1. **14 facções** (5 raciais, 3 racistas, 3 mistas, 1 protege o selo, 1 destrói o selo, 1 poder do Louco) — `faccoes.js`.
2. **10 origens sorteáveis** na criação, cada uma com bônus de atributos e reputação inicial — `origens.js`, `origem.js`, integradas a `criarHeroi`/`recalcular`.
3. **Reputação**, **Selo** (4 estados), **eixos** (Misericórdia/Crueldade, Selo/Despertar), **coroa** e **linhagem** — `reputacao.js`, `selo.js`, `campanha.js`.
4. **Save v4** com migração 3 → 4 (herói intocado; campanha neutra). Saves v0–v3 migram em cadeia.
5. **Interface**: cartão "Origem sorteada" na criação (mostra o bônus); aba **Destino** na ficha (origem, Selo, linhagem, eixos, 14 facções com faixa). Rótulo "Raça / origem" virou "Raça".
6. **Correção de layout (vinha da v28)**: em celulares de 390 px a tela de criação transbordava ~20 px; corrigido com CSS.
7. Hook de testes: `window.__dreadcrown.regrasHeroi`.

## Preservado (verificado byte a byte contra a v28)
Dados: raças, classes, ramificações, armas, armaduras, conjuntos, equipamentos, habilidades, efeitos, inimigos, mundo, dungeons. Regras: combate, classes, habilidades, efeitos, equipamentos, inimigos, acampamento, mundo, dungeon, geografia.
Alterado em regras: **apenas** `heroi.js` (bônus da origem) e `save.js`. A regra da loja (só em acampamento, "Comércio" explícito) segue igual e coberta por `loja.mjs`/`jogo.mjs`.

## Arquivos
**Criados**: `src/data/jogo/faccoes.js`, `origens.js`, `src/rules/origem.js`, `reputacao.js`, `selo.js`, `campanha.js`, `tests/lore.mjs`, `tests/lore-v29.mjs`, `docs/FACCOES-E-SELO.md`, este arquivo.
**Modificados**: `src/rules/heroi.js`, `src/state/save.js`, `src/ui/jogo/app.js`, `criacao.js`, `painel-heroi.js`, `src/styles/mundo.css`, `docs/LORE.md`, `README.md`, `package.json`.

## Testes executados (resultados reais)
Regras (Node), 0 falhas: unitarios 12 · regras 8 · combate 18 · classes 12 · mundo 28 · dungeon 19 · loja 20 · **lore 17 (novo)** · efeitos 11 · audio 6 · estabilidade 10.
Navegador (Chromium + SwiftShader, `dist/Dreadcrown.html`), 0 falhas: jogo 37 · regressao-v27 17 · mundo-v28 31 · navegador (motor 3D, HTML único + dev) 40 · **lore-v29 16 (novo)**.
Nota: os testes de navegador antigos (`jogo`, `regressao-v27`, `mundo-v28`) ganharam tempo de espera maior (300 s) no clique "Continuar" da vitória: sob render por software a reconstrução do mundo 3D leva dezenas de segundos (medido: uma tarefa longa de ~37 s também na v28). Nenhuma verificação foi removida ou enfraquecida.
Primeira execução de `jogo.mjs` falhou por um bug meu (um `<p>` extra na ficha quebrava um seletor do teste); corrigido trocando o elemento, sem mexer no teste.

## Limites desta validação
Render por software (sem GPU real); toque em aparelho real e desempenho em celular não medidos.
