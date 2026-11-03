# Dungeons (v28)

Dados em `src/data/jogo/dungeons.js`; regras em `src/rules/dungeon.js` (geometria) e `src/rules/mundo.js` (estado); desenho em `src/world/dungeon.js`.

## Catacumbas (`DUNGEONS.catacumbas`)
- **Entrada física** no mundo aberto (Cavernas Profundas, ao fim de um ramal de estrada): portão de pedra com porta bloqueada por colisão. Só se entra caminhando até
  ela (≤ `raioPonto` 3.2) e interagindo ([E]/botão). `entrarDungeon` **recusa** quando o herói não está perto (a regra, não a interface).
- **Interior**: 9 salas e corredores sobre uma grade 2×2; a mesma grade alimenta o desenho e a colisão (`caminhavelDungeon`). Salas principais ≥ 12×12, corredores ≥ 4 de largura.
  Iluminação sombria com pool fixo de luzes (6 desktop / 4 celular); a câmera evita paredes.
- **Inimigos** (todos do catálogo oficial da região): 3 Cultista Carmesim, 3 Aranha do Vazio e o chefe **Mímico Ancestral** no covil (não patrulha). Percebem, perseguem e iniciam
  encontros pelo MESMO evento do exterior → o combate é o motor real por turnos.
- **Baús** (3): usam `vasculharRecompensa`, a mesma regra do "Lootear" do acampamento. Abrem uma vez, exigem proximidade.
- **Saída**: porta no vestíbulo; `sairDungeon` só funciona perto dela e devolve o herói 3,8 unidades diante do portão correto (em chão livre), olhando para fora.

## Revisita
- Inimigos comuns derrotados só voltam depois que o jogador **sai e reentra** e passaram `respawnDungeonSegundos` (300 s). Dentro da dungeon ninguém reaparece.
- O chefe (`chefeDerrotado`) e os baús abertos são **permanentes**.
- Ao sair, quem perseguia volta ao posto. Nada é reiniciado indiscriminadamente.

## Estado e save
`mundo.espaco = {tipo:'dungeon', id, retorno}`; `mundo.dungeons[id] = {descoberta, chefeDerrotado, baus, ultimaSaida, entradas}`. Save v3 grava tudo isso; um save com
dungeon inexistente cai no exterior (nunca prende o jogador). Equipamento, inventário e progressão vivem no herói e não são tocados na entrada/saída.

## Como adicionar outra dungeon
Acrescente a definição em `DUNGEONS` (salas pares, chegada, saída, inimigos com nomes do catálogo, baús) e um ponto `tipo:'dungeon'` em `PONTOS` (geografia). O restante (guardas, save,
mapa, cena) é genérico por `id`.
