// Sorteio da origem do personagem (determinístico por semente) e leitura do bônus.
import { ORIGENS, origemPorId } from '../data/jogo/origens.js';
import { criarRng } from '../core/rng.js';

/** Sorteia uma origem. `pesos` (opcional) sobrescreve o peso de cada id. Mesma semente = mesma origem. */
export function sortearOrigem(semente, pesos = {}) {
  const peso = o => Math.max(0, Number.isFinite(pesos[o.id]) ? pesos[o.id] : o.peso);
  const total = ORIGENS.reduce((a, o) => a + peso(o), 0); if (total <= 0) return ORIGENS[0];
  let x = criarRng(semente).proximo() * total;
  for (const o of ORIGENS) { x -= peso(o); if (x < 0) return o; }
  return ORIGENS[ORIGENS.length - 1];
}
/** Bônus de atributos da origem do herói (zeros se não tiver origem ou se o id for desconhecido). */
export function bonusOrigem(heroi) {
  const b = origemPorId(heroi?.origem)?.bonus ?? {};
  return { hp: b.hp ?? 0, mana: b.mana ?? 0, stam: b.stam ?? 0, pow: b.pow ?? 0, mag: b.mag ?? 0, dex: b.dex ?? 0, arm: b.arm ?? 0 };
}
