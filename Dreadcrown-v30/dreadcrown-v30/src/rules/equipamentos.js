// Regras de equipamentos: gera os conjuntos (set x raridade x slot) e calcula bônus de conjunto.
// Não depende de DOM/React/three.js.
import { EQUIPAMENTOS_BASE } from '../data/jogo/equipamentos-base.js';
import { CONJUNTOS, RARIDADES_EQUIP, SLOTS } from '../data/jogo/conjuntos.js';

// Porta fiel do gerador do bundle (ids "gdd-<conjunto>-<raridade>-<slot>").
export function gerarEquipamentos() {
  const lista = EQUIPAMENTOS_BASE.map(x => ({ ...x }));
  for (const set of CONJUNTOS) for (const rar of RARIDADES_EQUIP) for (const sl of SLOTS) {
    const id = `gdd-${set.id}-${rar.id}-${sl.id}`;
    if (lista.some(x => x.id === id)) continue;
    lista.push({
      id, classId: set.classId, setId: `${set.id}-${rar.id}`, slot: sl.id,
      name: `${set.name.replace(/^Conjunto do |^Conjunto da |^Conjunto de /, '')} — ${sl.label} (${rar.name})`,
      setName: set.name, def: Math.round(sl.def * rar.mult), hp: Math.round(sl.hp * rar.mult), mana: Math.round(sl.mana * rar.mult),
      rarity: rar.name, rarityId: rar.id,
      price: Math.round(rar.price * (sl.id === 'chest' ? 1.25 : sl.id === 'accessory' ? .9 : 1)),
      effect: set.effect, setEffect: set.effect
    });
  }
  return lista;
}
export const EQUIPAMENTOS = gerarEquipamentos();
const POR_ID = new Map(EQUIPAMENTOS.map(e => [e.id, e]));
export const equipamentoPorId = id => POR_ID.get(id);

// Bônus de conjunto (3+ peças do mesmo conjunto). IDs corrigidos: no bundle original os ids
// comparados ("mage-archmage", "mage-battle"...) nunca batiam com setId ("mage-archmage-common"...),
// então NENHUM bônus de conjunto funcionava. Aqui comparamos pelo id-base do conjunto.
export const BONUS_CONJUNTO = {
  'mage-archmage': { dano: 1.25 }, 'mage-battle-mage': { dano: 1.08 }, 'mage-mana-weaver': { custo: .8 },
  'paladin-inquisitor': { dano: 1.15 }, 'cleric-exorcist': { dano: 1.22, custo: .8 }, 'cleric-sacred-healer': { cura: 1.3 },
  'assassin-shadow-executioner': { dano: 1.2 }, 'assassin-venom-blade': { dano: 1.1 },
  'archer-sniper': { dano: 1.2 }, 'archer-arcane': { dano: 1.15 }, 'tank-thorn-provoker': { dano: 1.08 }
};
const idBase = setId => setId.replace(/-(common|uncommon|rare|epic|legendary|mythic|ancient|[a-z]+)$/, '');
export function conjuntosAtivos(heroi) {
  const cont = {};
  for (const id of Object.values(heroi.equippedGear || {})) {
    const it = POR_ID.get(id); if (!it) continue;
    const base = CONJUNTOS.find(c => it.setId === c.id || it.setId.startsWith(c.id + '-'));
    const chave = base ? base.id : it.setId;
    cont[chave] = (cont[chave] || 0) + 1;
  }
  return Object.keys(cont).filter(k => cont[k] >= 3);
}
export function multiplicador(heroi, campo) {
  let m = 1;
  for (const id of conjuntosAtivos(heroi)) { const b = BONUS_CONJUNTO[id]; if (b && b[campo]) m *= b[campo]; }
  return m;
}
void idBase;

// API usada pelo motor de combate (rules/combate.js) e pela UI.
export const multiplicadorDano = heroi => multiplicador(heroi, 'dano');
export const multiplicadorCusto = heroi => multiplicador(heroi, 'custo');
export const multiplicadorCura = heroi => multiplicador(heroi, 'cura');
