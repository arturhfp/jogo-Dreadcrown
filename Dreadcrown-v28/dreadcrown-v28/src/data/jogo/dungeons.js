// Dungeons de Dreadcrown (v28). Dado puro e editável: cada dungeon tem uma ENTRADA FÍSICA no mundo aberto e um interior próprio.
// O interior usa COORDENADAS LOCAIS (x para a direita, z para baixo; origem perto do vestíbulo). Todas as coordenadas dos retângulos
// são números PARES: o interior é desenhado/colidido numa grade de células de 2×2 (rules/dungeon.js).
//
// Primeira dungeon: "Catacumbas", na região Cavernas Profundas. Só usa inimigos, áreas e dados que JÁ existem no jogo:
// Cultista Carmesim (área Catacumbas), Aranha do Vazio (Cavernas Negras) e Mímico Ancestral (Salão do Tesouro, o chefe).
// Os três pertencem à própria região Cavernas Profundas (data/jogo/mundo.js), então a dungeon é coerente com os dados oficiais.
// Nenhum texto de história foi inventado: os nomes das salas são descritivos.
import { REGIOES } from './mundo.js';

const C = REGIOES.cavernas.centro;

export const DUNGEONS = {
  catacumbas: {
    id: 'catacumbas', nome: 'Catacumbas', regiao: 'cavernas',
    // Entrada física no mundo exterior: portão de cripta no pé de uma encosta. `rumo` = para onde o portão "olha" (para o acampamento).
    entradaMundo: { x: C[0] - 30, z: C[1] - 28, rumo: 0.76, rotulo: 'Portão das Catacumbas' },
    // Onde o jogador aparece dentro e onde fica a porta de saída.
    chegada: { x: 0, z: 4, rumo: -Math.PI / 2 }, saida: { x: 0, z: 7 },
    // Salas e corredores (retângulos [x0, z0, x1, z1], todos pares). O chão caminhável é a união deles.
    salas: [
      { id: 'vestibulo', nome: 'Vestíbulo', r: [-8, -4, 8, 8] },
      { id: 'corredor1', nome: 'Corredor', r: [-2, -16, 2, -4] },
      { id: 'rituais', nome: 'Sala dos Rituais', r: [-14, -34, 14, -16] },
      { id: 'corredor2', nome: 'Corredor', r: [14, -28, 26, -24] },
      { id: 'covil', nome: 'Covil', r: [26, -40, 50, -14] },
      { id: 'corredor3', nome: 'Corredor', r: [36, -14, 40, 0] },
      { id: 'tesouro', nome: 'Salão do Tesouro', r: [26, 0, 52, 24] },
      { id: 'corredor4', nome: 'Corredor', r: [-26, -28, -14, -24] },
      { id: 'ossuario', nome: 'Ossuário', r: [-42, -36, -26, -16] }
    ],
    // Inimigos (nomes exatos de data/jogo/inimigos.js). Um (chefe: true) é o encontro mais difícil e fica no covil dele.
    inimigos: [
      { nome: 'Cultista Carmesim', x: -6, z: -26 }, { nome: 'Cultista Carmesim', x: 7, z: -22 },
      { nome: 'Cultista Carmesim', x: -34, z: -26 },
      { nome: 'Aranha do Vazio', x: 33, z: -30 }, { nome: 'Aranha do Vazio', x: 44, z: -22 },
      { nome: 'Aranha do Vazio', x: 32, z: 17 },
      { nome: 'Mímico Ancestral', x: 40, z: 14, chefe: true }
    ],
    // Baús: cada um dá UMA rodada de "vasculhar" das regras reais (moedas, poção, equipamento da classe). Abrem uma única vez.
    baus: [{ id: 'bau-ossuario', x: -39, z: -33 }, { id: 'bau-covil', x: 47, z: -37 }, { id: 'bau-tesouro', x: 49, z: 3 }],
    // Decoração. `solido` = obstáculo de colisão (raio em unidades). `luz` = ponto de luz real (poucos, por desempenho).
    decoracao: [
      { tipo: 'pilar', x: -9, z: -20, raio: 0.75, solido: true }, { tipo: 'pilar', x: 9, z: -20, raio: 0.75, solido: true },
      { tipo: 'pilar', x: -9, z: -30, raio: 0.75, solido: true }, { tipo: 'pilar', x: 9, z: -30, raio: 0.75, solido: true },
      { tipo: 'pilar', x: 31, z: -34, raio: 0.75, solido: true }, { tipo: 'pilar', x: 45, z: -18, raio: 0.75, solido: true },
      { tipo: 'pilar', x: 31, z: 6, raio: 0.75, solido: true }, { tipo: 'pilar', x: 47, z: 20, raio: 0.75, solido: true },
      { tipo: 'sarcofago', x: 0, z: -25, rumo: 0, raio: 1.0, solido: true },
      { tipo: 'sarcofago', x: -34, z: -20, rumo: 0.3, raio: 1.0, solido: true },
      { tipo: 'braseiro', x: -12, z: -18, luz: true }, { tipo: 'braseiro', x: 12, z: -32, luz: true },
      { tipo: 'braseiro', x: 28, z: -16, luz: true }, { tipo: 'braseiro', x: 48, z: -38, luz: true },
      { tipo: 'braseiro', x: 28, z: 2, luz: true }, { tipo: 'braseiro', x: 50, z: 22, luz: true },
      { tipo: 'braseiro', x: -40, z: -34, luz: true }, { tipo: 'braseiro', x: -6, z: 6, luz: true },
      { tipo: 'tocha', x: -2, z: -10 }, { tipo: 'tocha', x: 2, z: -10 }, { tipo: 'tocha', x: 20, z: -28 }, { tipo: 'tocha', x: 38, z: -8 }, { tipo: 'tocha', x: -20, z: -28 }
    ]
  }
};
export const dungeonDaEntrada = id => DUNGEONS[id];
