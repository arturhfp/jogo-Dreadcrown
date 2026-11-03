# Arquitetura e análise do projeto

## 1. Como o jogo é montado hoje

O jogo é entregue como **uma página HTML** composta por camadas, na ordem de carregamento de `index.html`:

| Camada | Arquivos | Tipo | Legível/editável? |
|---|---|---|---|
| Núcleo do jogo (React 19, three.js, regras, dados, telas) | `src/vendor/game-bundle.js` (1,5 MB) | bundle do Vite minificado | **Não** (sem fonte) |
| CSS do jogo | `src/styles/jogo-base.css` (100 KB) | CSS compilado (Tailwind) | pouco |
| CSS de ajustes (v15–v18) | `src/styles/*.css` | CSS | sim |
| Interface injetada (retratos, cenário, HUD, avanço automático, palco 2D) | `src/ui/*.js` | JS clássico, observa o DOM do React | sim |
| Motor 3D | `src/3d/*.js`, `src/data/`, `src/core/`, `src/ui/ponte.js` | ES modules | sim |
| Recursos | `assets/modelos/orc.glb`, `assets/retratos/*.jpg` | binários | — |

**Como as camadas conversam.** O jogo (React) não conhece o 3D. As camadas de cima *observam o DOM* do jogo
(seletores como `.battle-arena`, `.combat-panel`, `.boss-name`, `.resource-meta`, botões `.action-button`) com
`MutationObserver`/polling e reagem: `ui/ponte.js` monta o palco 3D dentro de `.mobile-3d-stage`, lê raça/classe/subclasse
escolhidas, detecta queda de vida/morte e cliques nas habilidades. **Nada devolve estado ao jogo**: o 3D é só visual.
O three.js do bundle é exposto como `window.__THREE`, e o motor 3D o reutiliza.

## 2. Funcionalidades que existem (a preservar)

Verificadas no bundle/DOM e/ou nos testes:

- Criação de personagem: 5 raças, 6 classes, 5 subclasses por classe, nome, aparência, equipamento inicial.
- Combate por turnos: ataque básico, habilidades por raridade, ultimate, esquiva, vida/mana/stamina/suprema, 15 inimigos.
- Vitória ("Selo rompido") → acampamento (descansar), loja, inventário, poções, equipamentos (limite por classe/raça), dados.
- Progressão: nível, moedas, encontros crescentes.
- Visual: retratos, cenário de arena, palco 3D (Orc com equipamento por classe, arco funcional, tecido, sombras, bloom),
  efeitos por tema × raridade.
- Mobile: palco 2D de reserva e layout adaptado.

## 3. Problemas preexistentes (não introduzidos pela refatoração)

1. **Sem salvamento/carregamento** — o bundle não usa `localStorage`/`sessionStorage`/IndexedDB/cookies. Progresso se perde ao recarregar.
2. **Fonte do núcleo indisponível e divergente** — o projeto Replit enviado (4 commits, até 17/09) gera um bundle com ~200 textos em português,
   contra ~2.400 do bundle atual. Faltam nele, entre outros, nomes de habilidades/armas, bônus de itens e regras de equipamento.
3. **Acoplamento por seletores CSS** — `ui/ponte.js`, `ui/cenario.js`, `ui/retratos.js`, `ui/avanco-automatico.js` dependem de nomes de classes do React;
   se o jogo mudar esses nomes, as camadas quebram em silêncio.
4. **Subclasses 3D só trocam cor**; **só o Orc tem GLB**; **Tank sem armadura extra**.
5. **Mancha amarela** do painel de combate não identificada.
6. Duplicação histórica: o palco 2D de reserva (`ui/visuais-mobile.js`) e o 3D coexistem (o 2D é ocultado pela classe `gl3d`).
7. Dados espalhados: nomes de subclasses aparecem em `src/data/catalogo.js`, `src/ui/retratos.js` e no bundle (precisam coincidir).

## 4. Riscos de regressão ao refatorar

- Ordem de scripts e estilos (CSS sobrescreve por ordem; `retratos-dados.js` antes de `retratos.js`).
- `GLBActor.prototype.dress` é registrada por efeito colateral (`import './equipamento.js'` em `combate3d.js`): não remover.
- IK do arco precisa rodar antes do equipamento em `GLBActor.apply`.
- O tecido simula em coordenadas de mundo; mover as tiras à mão quebra a inércia.
- Os testes (`tests/`) cobrem estas armadilhas; rode `npm test` após qualquer mudança.

## 5. Grafo de dependências do motor 3D (sem ciclos)

```
core/util ──► data/catalogo
   │             │
   ├─► 3d/texturas ─► 3d/primitivas ─► 3d/kit ─► 3d/tecido
   ├─► 3d/animacao ─► 3d/atores ──────────────► 3d/ik ─► 3d/arco ─► 3d/equipamento
   ├─► 3d/glb         3d/efeitos ─► 3d/palco ◄── 3d/posprocessamento
   └─► 3d/personagens ─► 3d/combate3d ─► ui/ponte ─► main.js
```
(Desenho aproximado. A lista exata de imports por módulo está em `docs/grafo-dependencias.json`; a ausência de ciclos foi verificada por script na migração.)
