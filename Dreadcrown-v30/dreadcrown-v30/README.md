# Dreadcrown

RPG de batalha por turnos com criação de personagem e combate em 3D, feito para rodar no navegador (PC e celular).
Cinco raças × seis classes × cinco subclasses (150 combinações), 15 inimigos, habilidades por raridade
(comum, rara, épica, lendária, ultimate), equipamentos, poções, loja e acampamento.

> **Versão 30.** **Clãs raciais**: 15 clãs (3 por raça), um por herói, escolhido na criação; descontos de loja para 3 clãs; regras de aceitação das facções. Veja [docs/CHANGELOG-v30.md](docs/CHANGELOG-v30.md) e [docs/CLAS.md](docs/CLAS.md).
>
> **Base v29.** Fundação da lore: **14 facções**, **origem sorteada** na criação (bônus de atributos), **reputação**, estado do **Selo** e **coroa/linhagem**, com aba **Destino** na ficha e **save v4**. Veja [docs/CHANGELOG-v29.md](docs/CHANGELOG-v29.md), [docs/FACCOES-E-SELO.md](docs/FACCOES-E-SELO.md) e [docs/LORE.md](docs/LORE.md).
>
> **Base v28.** Mundo exterior **contínuo** (sem portais entre regiões), primeira **dungeon** com entrada física (Catacumbas) e **loja só em acampamentos**
> (escolha explícita "Comércio"). Veja [docs/CHANGELOG-v28.md](docs/CHANGELOG-v28.md), [docs/MUNDO.md](docs/MUNDO.md) e [docs/DUNGEONS.md](docs/DUNGEONS.md).
>
> **Base v27.** O jogo agora é **código-fonte próprio, sem React**: regras (`src/rules`), dados (`src/data/jogo`), estado/save (`src/state`),
> mundo aberto (`src/world`), áudio (`src/audio`), interface (`src/ui/jogo`) e motor 3D (`src/3d`). O bundle minificado antigo
> (`src/vendor/game-bundle.js`) só é usado por `index-legado.html`, mantido por preservação. Mudanças da v27: [docs/CHANGELOG-v27.md](docs/CHANGELOG-v27.md);
> diagnóstico: [docs/AUDITORIA-v27.md](docs/AUDITORIA-v27.md); combate: [docs/COMBATE.md](docs/COMBATE.md).

## Tecnologias

- **Jogo:** JavaScript ES modules (sem framework), interface montada por `src/ui/jogo/dom.js`; three.js vem de `src/vendor/three-runtime.js` (`window.__THREE`).
- **Motor 3D (este projeto):** JavaScript ES modules sobre o three.js que já vem no bundle (`window.__THREE`), sem dependências novas.
  Esqueleto/animação do Orc (GLB), IK de dois ossos, arco com corda deformável, tecido com física (Verlet), sombras, bloom.
- **Build:** [esbuild](https://esbuild.github.io/) (empacota o motor 3D e gera um HTML único).
- **Testes:** Node (`assert`) + Playwright/Chromium.

## Requisitos

- Node.js 18+ (testado com 22).
- Para os testes de navegador: Chromium/Chrome (o `playwright` baixa um, ou aponte `CHROMIUM_PATH`).
- Navegador com WebGL. Sem WebGL o jogo segue na versão 2D (o motor 3D se desliga sozinho).

## Instalação e execução

```bash
npm install            # instala esbuild e playwright (somente desenvolvimento)
npm run dev            # servidor local em http://localhost:8080  (modo desenvolvimento, módulos separados)
npm run build          # gera dist/Dreadcrown.html  (arquivo único; abre direto no PC e no celular)
npm run test:regras    # verificações em Node (rápido): regras, mundo contínuo, dungeon e loja
npm run test:navegador # fluxo do jogo + regressões v27 + mundo/dungeon v28 + motor 3D no Chromium (lento sem GPU: ~40 min)
npm test               # os dois
```

Para jogar sem instalar nada, abra `dist/Dreadcrown.html` (já incluído na entrega).

## Estrutura de pastas

```
index.html                  ponto de entrada (modo dev): só carrega estilos e scripts, na ordem certa
assets/
  modelos/orc.glb           modelo 3D do Orc (CC-BY-4.0, mezuna)
  retratos/*.jpg            160 retratos de raça/classe/subclasse (criação de personagem)
src/
  main.js                   inicia o motor 3D (se houver WebGL)
  core/util.js              acesso ao three.js e helpers matemáticos
  data/catalogo.js          dados visuais: inimigos, subclasses, temas, cores, qual animação cada habilidade usa
  3d/                       motor 3D (veja a tabela abaixo)
  ui/
    ponte.js                liga o jogo (DOM da interface) ao motor 3D
    retratos.js, retratos-dados.js   retratos nas telas de criação
    cenario.js              cenário de fundo da arena + HUD de habilidades
    visuais-mobile.js       palco 2D de reserva e efeitos de CSS
    avanco-automatico.js    LEGADO (v27: não é mais carregado; ver CHANGELOG)
    classe-v17.js           marca <html>/<body> com a classe "v17"
  styles/*.css              CSS do jogo e dos ajustes (a ordem está em index.html)
  vendor/three-runtime.js   three.js (window.__THREE)
  vendor/game-bundle.js     bundle LEGADO (só index-legado.html) — não edite à mão
tools/
  build.mjs                 gera o HTML único        servir.mjs   servidor de desenvolvimento
  migracao_extrair.py       registro da migração (já executada; não faz parte do fluxo normal)
tests/
  unitarios.mjs             regras de dados (Node)   navegador.mjs  integração (Chromium)
docs/                       ARQUITETURA.md, MIGRACAO.md
dist/Dreadcrown.html   saída do build
```

### Motor 3D (`src/3d/`)

| Arquivo | Responsabilidade |
|---|---|
| `glb.js` | lê o modelo GLB (esqueleto, texturas, animações) e cria o ambiente de reflexo |
| `animacao.js` | pose, interpolação e catálogo de ações (golpes, magias, tiros, esquiva, morte) |
| `atores.js` | `Actor` / `GLBActor`: aplica pose aos ossos, arma na mão, atualiza equipamento |
| `equipamento.js` | armas, armaduras e adereços de cada classe sobre o Orc |
| `kit.js`, `primitivas.js`, `texturas.js` | geometrias, materiais e texturas procedurais |
| `ik.js` | cinemática inversa de dois ossos |
| `arco.js` | arco funcional: puxada, membros que flexionam, corda que vibra, flecha |
| `tecido.js` | física de tecido (saiotes, capas, tiras) |
| `palco.js` | cena, câmera, luzes, sombras, loop de renderização |
| `posprocessamento.js` | bloom, gradação e tone mapping com canal alfa |
| `efeitos.js` | partículas e efeitos por tema × raridade |
| `personagens.js` | personagens procedurais das outras raças e os 15 inimigos |
| `combate3d.js` | cria o herói e toca ataques/efeitos (apenas visual; não calcula dano) |

## Principais sistemas e onde mudar cada coisa

| Quero mudar… | Edite |
|---|---|
| Qual animação uma habilidade usa | `src/data/catalogo.js` → `HERO_ACT` |
| Duração, impactos e movimento de uma animação | `src/3d/animacao.js` → `ACTIONS` |
| Ritmo da puxada do arco | `src/data/catalogo.js` → `ARCH_LEAD`; geometria em `src/3d/arco.js` |
| Visual de armas/armaduras de uma classe | `src/3d/equipamento.js` (um bloco `if` por classe) |
| Física do tecido (peso, vento, rigidez) | `src/3d/tecido.js` (`swayStrips`) |
| Efeitos de magia por tema e raridade | `src/3d/efeitos.js` (`FX`, `FXMAP`) |
| Sombras, luzes, câmera, bloom | `src/3d/palco.js`, `src/3d/posprocessamento.js` |
| Inimigos (aparência) | `src/3d/personagens.js` (`ENEMY_BUILD`) e `src/data/catalogo.js` (`ENEMIES`) |
| Retratos da criação de personagem | `assets/retratos/` + `src/ui/retratos-dados.js` |
| Cenário/HUD da arena | `src/ui/cenario.js`, `src/styles/cenario.css` |
| Regras, dano, itens, loja, progressão | `src/rules/*.js` (dados em `src/data/jogo/`) — ver `docs/COMBATE.md` |
| Mundo, regiões, portais, inimigos do mapa | `src/data/jogo/mundo.js`, `src/rules/mundo.js`, `src/world/` |
| Salvamento | `src/state/save.js` (chave `dreadcrown.save`, versionado) |

## Problemas conhecidos e limitações

- **Só o Orc tem modelo 3D de verdade** (GLB com esqueleto). Humano, Elfo, Anão, Tiefling e os 15 inimigos são modelos de primitivas. Não há compatibilidade de rigs testada.
- **Melhorias de arma** (+1 dano) valem para o ataque básico, como o bônus da própria arma; habilidades não usam bônus de arma (comportamento da v26 mantido).
- **Habilidades:** nomes oficiais completos; números vêm de modelos por raridade/estilo (`habilidades-modelos.js`), não de valores individuais.
- Combate continua por turnos; o mundo é em tempo real (ver `docs/COMBATE.md` para a evolução).
- Sem GPU (render por software) o jogo roda a ~2 fps e os testes de navegador são lentos; não há medição de desempenho em GPU real.
- Modelo do Orc: "Orc Berserk Warrior (low poly)" por **mezuna**, licença **CC-BY-4.0** — mantenha o crédito.
