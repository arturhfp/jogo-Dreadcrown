# Mundo aberto contínuo (v28)

## Modelo
Um único exterior em **coordenadas globais** (x para a direita, z para baixo, ~1 unidade = 1 m). Não existe mais "região carregada": os seis territórios
(`src/data/jogo/mundo.js` → `REGIOES`) têm `centro` e `raio`, e toda a geografia é calculada em `src/rules/geografia.js`:

- `pesosEm(x,z)` mistura os territórios próximos (K_MISTURA=7); `territorioEm` devolve o dominante. Terreno, clima e vegetação usam essa mistura, então a transição
  entre biomas é gradual (cor, altura, props, luz, névoa), e a distribuição de inimigos acompanha o território dominante.
- `mascara`/`LIMITE_MASCARA` definem a borda do mundo; montanhas sobem nas bordas. `inclinacao` > `inclinacaoMax` (1.1) é intransponível.
- Estradas (`ESTRADAS_PONTOS`) ligam os acampamentos e um ramal vai até as Catacumbas. Pontos de interesse (`PONTOS`): 6 acampamentos, 1 entrada de dungeon, 3 ruínas, 1 fortaleza, 1 portão.
- `propsDoChunk` produz os props de cada chunk de 64×64; **os mesmos props são desenhados e colidem** (`colideObstaculo`). `caminhavelExterior(x,z,r)` = dentro da borda + inclinação ok + sem obstáculo.

## Simulação (`src/rules/mundo.js`, pura e testada em Node)
`passoMundo` anda o herói, aplica colisão, percepção, alerta, perseguição e dispara o evento `encontro`. Inimigos além de `raioSimulacao` (80) dormem em casa; o estado
(derrotados, tempo) fica em `mundo.derrotados` e sobrevive ao streaming e ao save. Cada inimigo tem `espaco` (`exterior` ou `dg:<id>`); só os do espaço atual agem.
Nenhum caminho do jogo troca de "região": `regiaoId` é só um rótulo derivado da posição.

## Streaming e memória (`src/world/terreno.js`, `MundoExterior`)
Chunks em volta do herói (raio 2 no desktop, 1 no celular) são criados e liberados conforme ele anda; geometrias e materiais ficam num cache de módulo, os props usam
`InstancedMesh`, e um pool fixo de 4 luzes pontuais evita recompilar shaders. `estatisticas()` expõe chunks/triângulos/desenhos. Ao entrar numa dungeon o exterior é
descarregado por inteiro. Atores 3D de inimigos: no máximo 1 criado por frame (raio de criação 105 / liberação 135 no exterior).

## Descoberta, mapa e minimapa
Células de 16 unidades (`celulaMapa`) são reveladas num raio de 30 (`raioNevoa`); pontos (acampamentos, entrada de dungeon, ruínas…) são descobertos a 26 unidades.
O mapa-múndi (`src/ui/jogo/mundo.js`) desenha **a mesma geografia** (`alturaGlobal`, `territorioEm`, estradas) só nas células descobertas e só lista pontos descobertos.
O minimapa acompanha o herói. Viagem rápida existe apenas entre acampamentos já descobertos e só a partir de um acampamento; ela reposiciona o herói no mesmo mundo (não é portal).

## Limites honestos
- Os "territórios" são distintos por mistura de parâmetros, não por malhas separadas; as identidades visuais foram preservadas em tema/props/cores, mas o mundo é
  gerado proceduralmente e é **uma interpretação nova** do desenho de cada região (as seis cenas fixas da v27 não existem mais).
- Fortalezas, ruínas e portão são marcos de cenário com colisão e descoberta, sem interior (só as Catacumbas têm).
- Não há cidades nesta versão (a arquitetura de `PONTOS` aceita novos tipos).
- Desempenho foi medido apenas em renderização por software (SwiftShader). Não há medição em celular real.
