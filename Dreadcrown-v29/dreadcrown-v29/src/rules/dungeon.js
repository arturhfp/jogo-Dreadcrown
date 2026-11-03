// Interior das dungeons (v28): grade de células, colisão, inimigos e baús. Puro e determinístico (sem DOM / three.js).
// ---------------------------------------------------------------------------------------------------------------------
// RESPONSABILIDADE: transforma a definição em dados (data/jogo/dungeons.js: salas = retângulos pares) numa GRADE de células 2×2
// (chão/parede), responde "pode o corpo estar aqui?", gera os inimigos da dungeon e aplica as regras de revisita e dos baús.
// RELAÇÃO: usada por rules/mundo.js (espaço 'dungeon') e por world/dungeon.js (desenho). Os baús reutilizam as regras REAIS de
// recompensa de rules/acampamento.js (vasculhar): não existe uma segunda implementação de loot.
// REGRAS DE REVISITA (documentadas em docs/DUNGEONS.md): inimigos comuns derrotados só voltam se o jogador sair e voltar depois de
// PARAMETROS_MUNDO.respawnDungeonSegundos; o chefe e os baús são conquistas permanentes (não reaparecem).
// ---------------------------------------------------------------------------------------------------------------------
import { DUNGEONS } from '../data/jogo/dungeons.js';
import { INIMIGOS } from '../data/jogo/inimigos.js';
import { PARAMETROS_MUNDO as P } from '../data/jogo/mundo.js';

export const CELULA = 2;
export const dungeonPorId = id => DUNGEONS[id] ?? null;

const GRADES = new Map();
/** Grade de células da dungeon: { x0, z0, cols, rows, livre: Uint8Array } (1 = chão). Calculada uma vez. */
export function grade(def) {
  let g = GRADES.get(def.id); if (g) return g;
  let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const s of def.salas) { x0 = Math.min(x0, s.r[0]); z0 = Math.min(z0, s.r[1]); x1 = Math.max(x1, s.r[2]); z1 = Math.max(z1, s.r[3]); }
  x0 -= CELULA * 2; z0 -= CELULA * 2; x1 += CELULA * 2; z1 += CELULA * 2;
  const cols = Math.ceil((x1 - x0) / CELULA), rows = Math.ceil((z1 - z0) / CELULA), livre = new Uint8Array(cols * rows);
  for (const s of def.salas) for (let cz = Math.floor((s.r[1] - z0) / CELULA); cz < Math.ceil((s.r[3] - z0) / CELULA); cz++) for (let cx = Math.floor((s.r[0] - x0) / CELULA); cx < Math.ceil((s.r[2] - x0) / CELULA); cx++) livre[cz * cols + cx] = 1;
  g = { x0, z0, cols, rows, livre }; GRADES.set(def.id, g); return g;
}
export function chaoEm(def, x, z) { const g = grade(def), cx = Math.floor((x - g.x0) / CELULA), cz = Math.floor((z - g.z0) / CELULA); return cx >= 0 && cz >= 0 && cx < g.cols && cz < g.rows && g.livre[cz * g.cols + cx] === 1; }
export function salaEm(def, x, z) { for (const s of def.salas) if (x >= s.r[0] && x <= s.r[2] && z >= s.r[1] && z <= s.r[3]) return s; return null; }
const SOLIDOS = new Map();
export function solidosDaDungeon(def) {
  let s = SOLIDOS.get(def.id); if (s) return s; s = [];
  for (const d of def.decoracao) if (d.solido) s.push([d.x, d.z, d.raio]);
  for (const b of def.baus) s.push([b.x, b.z, 0.9]);
  SOLIDOS.set(def.id, s); return s;
}
/** O corpo (raio r) pode estar aqui? 8 pontos ao redor + o centro precisam estar em chão e fora de obstáculos. */
export function caminhavelDungeon(def, x, z, r = P.raioHeroi) {
  if (!chaoEm(def, x, z)) return false;
  for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; if (!chaoEm(def, x + Math.cos(a) * r, z + Math.sin(a) * r)) return false; }
  for (const c of solidosDaDungeon(def)) if (Math.hypot(x - c[0], z - c[1]) < c[2] + r) return false;
  return true;
}

/** Inimigos da dungeon (mesmo formato dos inimigos do exterior; id estável `dg:<dungeon>:<n>` / `...:boss`). */
export function gerarInimigosDaDungeon(def) {
  const lista = []; let n = 0;
  for (const i of def.inimigos) {
    const b = INIMIGOS.find(e => e.name === i.nome); if (!b) throw new Error(`Dungeon ${def.id}: inimigo desconhecido "${i.nome}"`);
    const id = i.chefe ? `dg:${def.id}:boss` : `dg:${def.id}:${n++}`;
    lista.push({ id, nome: b.name, tier: b.tier, tipo: b.type, x: i.x, z: i.z, hx: i.x, hz: i.z, rumo: i.chefe ? -Math.PI / 2 : (n * 1.7) % 6.28, estado: 'patrulha', alvoX: i.x, alvoZ: i.z, espera: 1 + (n % 3), alerta: 0, perdido: 0, chefe: !!i.chefe, espaco: `dg:${def.id}` });
  }
  return lista;
}
/** Estado inicial (persistente) de uma dungeon. */
export const estadoInicialDungeon = () => ({ descoberta: false, chefeDerrotado: false, baus: {}, ultimaSaida: null, entradas: 0 });
