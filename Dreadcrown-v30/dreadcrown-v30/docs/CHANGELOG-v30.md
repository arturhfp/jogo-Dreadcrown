# Dreadcrown v30 — clãs raciais

Base: v29. Detalhes: [CLAS.md](CLAS.md).

## O que mudou
1. **15 clãs** como dado (`src/data/jogo/clas.js`) e regras (`src/rules/cla.js`): um clã por herói, da própria raça, escolhido na criação; perda para sempre ao ser expulso/desertar; entrada em outro clã só com a confiança dele.
2. **Descontos de loja** nos acampamentos para 3 clãs (Liga do Lacre, Sete Martelos, Mãos de Cobre); os outros 12 benefícios estão descritos e marcados "em breve".
3. **Aceitação das facções** (`src/rules/aceitacao.js`): racistas por raça, de história por Selo × Despertar; rejeitado nunca passa de Neutro.
4. **Interface**: lista de clãs na criação; aba Destino com o clã, escolha de clã para heróis antigos e "Rejeita você" nas facções; preço riscado e "clã −X%" na loja.
5. Bug encontrado pelo teste de navegador e corrigido: a seleção do clã não destacava o cartão escolhido (assinatura do redesenho sem `clan`).
6. Hook de testes: `window.__dreadcrown.regrasCla`.

## Preservado
Regras de combate, classes, habilidades, mundo, dungeon, origens, reputação, selo e a regra da loja (só em acampamento) **não foram alteradas**. Alterado em regras existentes: `heroi.js` (campos `clan`/`clansPerdidos`), `acampamento.js` (desconto após o sorteio do estoque), `save.js` (sanitização) e `reputacao.js` (constante `REP_AMIGAVEL`).

## Arquivos
**Criados**: `src/data/jogo/clas.js`, `src/rules/cla.js`, `src/rules/aceitacao.js`, `tests/cla.mjs`, `tests/cla-v30.mjs`, `docs/CLAS.md`, `docs/CHANGELOG-v30.md`.
**Modificados**: `src/rules/heroi.js`, `acampamento.js`, `reputacao.js`, `src/state/save.js`, `src/ui/jogo/app.js`, `criacao.js`, `painel-heroi.js`, `modais.js`, `package.json` (30.0.0), `README.md`, `docs/CLAS-RACIAIS.md`.

## Testes (resultados no final)
Regras (Node), 0 falhas: unitarios 12 · regras 8 · combate 18 · classes 12 · mundo 28 · dungeon 19 · loja 20 · lore 17 · **cla 17 (novo)** · efeitos 11 · audio 6 · estabilidade 10.
Navegador (Chromium + SwiftShader), 0 falhas: **cla-v30 16 (novo)** · jogo 37 · regressao-v27 17 · lore-v29 16 · mundo-v28 31 · navegador (motor 3D) 40.
Limites: render por software (sem GPU real); toque em aparelho real e desempenho em celular não medidos; os eventos de expulsão/deserção só existem como funções (testadas em regras, não acionáveis no jogo).
