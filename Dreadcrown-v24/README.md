# Dreadcrown

RPG de batalha por turnos com criação de personagem e combate em 3D, feito para rodar no navegador (PC e celular).
Cinco raças × seis classes × cinco subclasses (150 combinações), 15 inimigos, habilidades por raridade
(comum, rara, épica, lendária, ultimate), equipamentos, poções, loja e acampamento.

> **Estado da refatoração: PARCIAL.** A camada 3D e a camada de interface/estilos estão modularizadas e testadas.
> O **núcleo do jogo** (React: regras, dados, combate, inventário, progressão) continua sendo um *bundle* minificado
> (`src/vendor/game-bundle.js`) porque **o código-fonte da versão atual não está disponível**. Veja
> [docs/MIGRACAO.md](docs/MIGRACAO.md) e [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

## Tecnologias

- **Jogo (núcleo):** React 19 + three.js (via bundle do Vite, já compilado) — `src/vendor/game-bundle.js`.
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
npm test               # testes unitários (Node) + testes de integração (navegador)
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
    ponte.js                liga o jogo (DOM do React) ao motor 3D
    retratos.js, retratos-dados.js   retratos nas telas de criação
    cenario.js              cenário de fundo da arena + HUD de habilidades
    visuais-mobile.js       palco 2D de reserva e efeitos de CSS
    avanco-automatico.js    avança sozinho do "Selo rompido" para o acampamento
    classe-v17.js           marca <html>/<body> com a classe "v17"
  styles/*.css              CSS do jogo e dos ajustes (a ordem está em index.html)
  vendor/game-bundle.js     NÚCLEO DO JOGO (minificado, sem fonte) — não edite à mão
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
| **Regras, dano, itens, skills, loja, progressão** | **ainda dentro de `src/vendor/game-bundle.js` (sem fonte)** |

## Problemas conhecidos e limitações

- **Núcleo do jogo sem código-fonte.** O projeto do Replit enviado (commit de 17/09) é uma versão anterior e não corresponde ao jogo atual (faltam mais de 2.000 textos do jogo atual). Para continuar a modularização (combate, inventário, dados, progressão), é preciso o fonte da v18.9 ou posterior.
- **Não existe salvamento/carregamento de progresso** no jogo atual (o bundle não usa `localStorage`, `sessionStorage` nem IndexedDB). Ao recarregar a página o progresso se perde.
- **Só o Orc tem modelo 3D de verdade** (GLB com esqueleto). Humano, Elfo, Anão, Tiefling e os 15 inimigos são modelos simples feitos de primitivas.
- **Tank (Orc)** não recebe armadura extra: usa só a espada e os braceletes do modelo original.
- **Subclasses** só mudam cores de runas/gemas (tema e acento), não o visual do equipamento.
- **Mancha amarela** no painel de combate (relatada com captura de tela) nunca foi reproduzida nem identificada.
- O cenário 3D é desenhado sobre um fundo 2D (SVG); o chão não recebe iluminação do cenário.
- Procedural não alcança a qualidade de modelos esculpidos e animados à mão; para chegar ao nível desejado são necessários modelos GLB riggados para as demais raças/inimigos.
- Modelo do Orc: "Orc Berserk Warrior (low poly)" por **mezuna**, licença **CC-BY-4.0** — mantenha o crédito.
