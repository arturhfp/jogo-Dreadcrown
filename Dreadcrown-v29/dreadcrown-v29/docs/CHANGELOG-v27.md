# Dreadcrown v27 — o que mudou em relação à v26

Princípio: corrigir causas, sem alterar regras, classes, habilidades, balanceamento, raças nem lore. A v26 original está intacta (zip enviado).

## Correções

| # | Problema na v26 | Causa | Correção | Arquivos |
|---|---|---|---|---|
| 1 | Derrota deixava o jogador **preso** (ao "Continuar", batalha em que nenhuma ação era aceita) | O save era gravado com vida 0 depois da derrota; não havia modal de derrota nem validação do save | Não salva em derrota; modal **Derrota** com *Retomar do último salvamento* / *Criar novo personagem*; save validado e saneado (vida 0 → 50%, campos ausentes restaurados) | `ui/jogo/app.js`, `ui/jogo/modais.js`, `ui/jogo/batalha.js`, `state/save.js` |
| 2 | Save corrompido/inválido gerava botão "Continuar" quebrado | `Save.carregar` só tratava JSON ilegível | `motivoHeroiInvalido` + aviso "Save inválido (ignorado)" na barra | `state/save.js`, `ui/jogo/app.js` |
| 3 | Acampamento pós-vitória podia ser decidido por um script legado | `avanco-automatico.js` (remendo da versão React) clicava "Descansar" por temporizador | Script deixou de ser carregado (arquivo mantido) | `index.html` |
| 4 | Herói **andava sozinho** ao perder o foco da janela / ao cancelar o toque no celular | `keyup`/`pointerup` nunca chegavam | `blur`/`visibilitychange` limpam teclas; `pointercancel`/`lostpointercapture` soltam o joystick | `world/cena.js`, `ui/jogo/mundo.js` |
| 5 | "Melhorar arma" e "Reforçar armadura" **não tinham efeito real** em combate | O bônus comprado não entrava no cálculo de dano / armadura recalculada | Bônus entra no dano básico e em `recalcular`; "Reforçar armadura" só é oferecido a quem tem armadura base (antes cobrava e não fazia nada). Sem melhorias, o dano é idêntico ao da v26 (teste) | `rules/combate.js`, `rules/heroi.js`, `rules/acampamento.js` |
| 6 | Modo ADM clicado no mundo deixava cena 3D e temporizador **órfãos** | `mostrarBatalha` não destruía a cena do mundo | `destruirMundo()` ao mostrar a batalha; `destroy` da cena também libera marcas dos inimigos | `ui/jogo/app.js`, `world/cena.js` |
| 7 | Constante de respawn duplicada (150 s) em dois lugares | Cópia no `app.js` | Uma única fonte (`PARAMETROS_MUNDO.respawnSegundos`) | `rules/mundo.js`, `ui/jogo/app.js` |
| 8 | Texturas do Orc ficavam na GPU a cada troca de classe; modelo era redecodificado a cada entrada | `dispose` só liberava geometria/material; sem cache de bitmap | Dispose de texturas; cache do arquivo e dos bitmaps (cada ator mantém esqueleto próprio) | `3d/atores.js`, `3d/glb.js` |
| 9 | Compra na loja sem retorno visível no mundo | — | Aviso (toast) da compra | `ui/jogo/app.js` |
| 10 | Testes de navegador (`jogo.mjs`) expiravam em máquinas sem GPU | Espera por `requestAnimationFrame` com render por software (~2 fps) | Espera por polling de 250 ms e limites maiores | `tests/jogo.mjs` |

## Testes novos
- `tests/estabilidade.mjs` (10, Node): melhorias de arma/armadura, dano idêntico sem melhorias, respawn, loja.
- `tests/regressao-v27.mjs` (15, navegador): save inválido/corrompido, teclas, acampamento, derrota/retomar, ADM, cache do Orc.

## Preservado sem alteração
Todas as regras (combate, classes, efeitos, habilidades oficiais, equipamentos), dados de raças/classes/subclasses/inimigos, mundo e regiões, terreno por semente, modelo e animações do Orc, retratos, áudio, cenário/HUD, `index-legado.html` e `src/vendor/game-bundle.js` (legado, não carregado pelo `index.html`).

## v27.1 — painel "Recursos de combate" oculto
Pedido do usuário. O painel (barras e botões duplicados) deixou de aparecer: `.combat-panel{display:none}` em `src/styles/visual-v15.css`.
Foi **ocultado, não removido do DOM**, porque o HUD da arena (`ui/cenario.js`) lê as barras dele e repassa os cliques de Atacar/Esquiva/Ultimate/habilidades aos botões dele, e `ui/ponte.js` dispara as animações 3D a partir deles. Vida/Stamina/Suprema e as ações continuam no HUD dentro da arena. `tests/jogo.mjs` passou a clicar no botão por script (elemento oculto).
