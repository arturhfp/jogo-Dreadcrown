# Dreadcrown v28 — mundo aberto contínuo, dungeons e comércio nos acampamentos

Base: v27 (correções de estabilidade, save, equipamentos e recursos 3D preservadas, incluindo o painel "Recursos de combate" oculto).

## Diagnóstico (v27)
O exterior eram seis cenas independentes (`REGIOES` com tamanho próprio), ligadas por portais e `trocarRegiao`; o mapa-múndi era seis círculos com linhas. A loja abria por
três caminhos: após `acampar` (35% de chance de `abreLoja`), depois de toda vitória (modal de acampamento) e por pontos de comércio (`montarLoja` em vários fluxos).
Cada vitória levava automaticamente ao acampamento. Não havia dungeons.

## O que mudou
1. **Mundo contínuo**: coordenadas globais, geografia compartilhada (`src/rules/geografia.js`), mistura de biomas, colisão por chunks, streaming (`src/world/terreno.js`),
   mapa-múndi e minimapa baseados na geografia real e na descoberta. Portais entre regiões e `trocarRegiao` removidos. Ver [MUNDO.md](MUNDO.md).
2. **Dungeon "Catacumbas"** com entrada física, interior de salas/corredores, inimigos e chefe do catálogo oficial, baús com a regra real de recompensa e saída física. Ver [DUNGEONS.md](DUNGEONS.md).
3. **Loja só em acampamento** (abaixo).
4. **Pós-vitória**: modal "Vitória" com um único botão "Continuar explorando"; nada é aberto sozinho e o jogador não é teletransportado a um acampamento.
5. **Acampamento** é um local do mundo: Descansar, Lootear (com recarga de 150 s por acampamento, contra farm infinito), Tratar ferimentos e **Comércio**.
6. **UI**: crachá de estado (EXPLORANDO / ENTRADA DE DUNGEON ao alcance / DUNGEON / ACAMPAMENTO / COMÉRCIO) e prompts de interação (PC e toque).
7. **Save v3** (migração automática de saves v2: coordenadas por região → globais). Dungeon inexistente no save cai no exterior.

## Como a loja foi restringida (lógica, não só interface)
- `rules/mundo.js → lojaDisponivel(est)`: espaço exterior **e** `pontoProximo(est).tipo === 'acampamento'`.
- `app.js`: `estado.modal = 'loja'` existe em **um** lugar, `abrirLoja`, que exige tela do mundo + modal de acampamento aberto + `lojaDisponivel`. Só é chamado pelo botão explícito "Comércio".
- `comprar` recusa se o modal não é a loja ou se `lojaDisponivel` é falso; `tick()` fecha qualquer loja ilegítima; `fecharLoja` volta ao acampamento.
- `acampar()` deixou de retornar `abreLoja`. Dentro de dungeon a loja é sempre indisponível. A loja não faz parte do save, então carregar não a reabre.
- `tests/loja.mjs` varre o código-fonte (uma só atribuição `modal = 'loja'`, uma só chamada de `montarLoja`) e testa as regras.
- Compras, preços, estoque e efeitos dos itens não foram alterados.

## Arquivos
**Criados**: `src/data/jogo/dungeons.js`, `src/rules/geografia.js`, `src/rules/dungeon.js`, `src/world/dungeon.js`, `tests/dungeon.mjs`, `tests/loja.mjs`, `tests/mundo-v28.mjs`, `docs/MUNDO.md`, `docs/DUNGEONS.md`, este arquivo.
**Modificados**: `src/data/jogo/mundo.js`, `src/rules/mundo.js`, `src/rules/acampamento.js`, `src/state/save.js`, `src/world/terreno.js`, `src/world/cena.js`, `src/ui/jogo/app.js`, `src/ui/jogo/mundo.js`,
`src/ui/jogo/modais.js`, `src/ui/jogo/batalha.js`, `src/styles/mundo.css`, `tests/mundo.mjs`, `tests/jogo.mjs`, `tests/regressao-v27.mjs`, `package.json`, `README.md`.
Raças, classes, habilidades, raridades, dano, custos, equipamentos, bônus de conjunto e progressão **não foram alterados**; o combate segue por turnos.

## Compatibilidade
- Saves v2 migram para v3. O início do Vale foi deslocado (+14, −6) para o herói não nascer atrás da tenda do mercador.
- O mundo é uma reinterpretação procedural das seis regiões (identidade por tema/biomas), não as cenas antigas.

## Testes executados (resultados reais)
Regras (Node): unitarios 12, regras 8, combate 18, classes 12, mundo 28, dungeon 19, loja 20, efeitos 11, audio 6, estabilidade 10 — 0 falhas.
Navegador (Chromium + SwiftShader, `dist/Dreadcrown.html`): jogo 37, regressao-v27 17, mundo-v28 31, navegador (motor 3D, HTML único + modo dev) 40 — 0 falhas.
Observações: render por software (~4–9 fps), portanto desempenho em GPU real e em celulares **não foi medido**; o toque no celular não foi testado em aparelho real;
os testes de navegador usam teleportes apenas para posicionar o início de cada trecho (marcados no código); a caminhada, interação, combate, baú, save e saída são executados de verdade.
