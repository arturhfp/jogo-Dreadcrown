// Acampamento (descansar/tratar/vasculhar), poções e loja. Tudo determinístico via RNG injetado.
import { criarRng } from '../core/rng.js';
import { EQUIPAMENTOS } from './equipamentos.js';
import { RARIDADES_EQUIP } from '../data/jogo/conjuntos.js';
import { ARMAS } from '../data/jogo/armas.js';
import { armasDaClasse, raca } from './heroi.js';

const lim = (v, m) => Math.min(m, v);

export function usarPocao(heroi, tipo) {
  if (!(heroi.pots[tipo] > 0)) return { heroi, eventos: [] };
  const h = structuredClone(heroi); h.pots[tipo] -= 1;
  if (tipo === 'life') h.hp = lim(h.hp + 35, h.maxHp);
  if (tipo === 'mana') h.mana = lim(h.mana + 30, h.maxMana);
  if (tipo === 'stamina') h.stam = lim(h.stam + 30, h.maxStam);
  return { heroi: h, eventos: [{ tipo: 'pocao', texto: `Poção de ${tipo === 'life' ? 'cura' : tipo} usada.`, tom: 'good' }] };
}

// acao: 'descansar' | 'tratar' | 'vasculhar'. Retorna também rng avançado e se a loja deve abrir.
export function acampar(heroi, acao, semente) {
  const rng = criarRng(semente), h = structuredClone(heroi), ev = [];
  if (acao === 'descansar') {
    h.hp = lim(h.hp + Math.round(h.maxHp * 0.25), h.maxHp); h.mana = lim(h.mana + Math.round(h.maxMana * 0.55), h.maxMana); h.stam = lim(h.stam + Math.round(h.maxStam * 0.55), h.maxStam);
    ev.push({ tipo: 'descanso', texto: 'Você descansou no acampamento.', tom: 'good' });
  } else if (acao === 'tratar') {
    h.hp = lim(h.hp + Math.round(h.maxHp * 0.55), h.maxHp); h.mana = lim(h.mana + Math.round(h.maxMana * 0.12), h.maxMana); h.stam = lim(h.stam + Math.round(h.maxStam * 0.12), h.maxStam);
    ev.push({ tipo: 'tratamento', texto: 'Você tratou os ferimentos.', tom: 'good' });
  } else if (acao === 'vasculhar') {
    const moedas = rng.inteiro(12, 30); h.coins += moedas;
    if (rng.proximo() < 0.35) h.pots.life += 1;
    if (rng.proximo() < 0.55) {
      const pool = EQUIPAMENTOS.filter(x => x.classId === h.classId), item = pool.length ? pool[rng.inteiro(0, pool.length - 1)] : null;
      if (item) { h.inventoryGear ||= []; if (!h.inventoryGear.includes(item.id)) h.inventoryGear.push(item.id); ev.push({ tipo: 'achado', item: item.id, texto: `✨ Você encontrou ${item.name}!`, tom: 'good' }); }
    }
    ev.push({ tipo: 'moedas', valor: moedas, texto: `Você vasculhou a área e encontrou ${moedas} moedas.`, tom: 'good' });
  }
  const abreLoja = h.wins > 0 && rng.proximo() < 0.35;
  return { heroi: h, eventos: ev, abreLoja, rng: rng.estado };
}

const nomeSlot = s => (s === 'helmet' ? 'Capacete' : s === 'chest' ? 'Armadura' : 'Botas');
// CORREÇÃO: no original `RARITY_ORDER`/`rarities` não existiam e a abertura da loja lançava ReferenceError.
export function montarLoja(heroi, semente) {
  const rng = criarRng(semente);
  const armas = armasDaClasse(heroi.classId, raca(heroi.race).large), equip = EQUIPAMENTOS.filter(x => x.classId === heroi.classId);
  const ws = rng.embaralhar(armas).slice(0, 4), gs = rng.embaralhar(equip).slice(0, 3);
  const raridadeSet = rng.escolher(RARIDADES_EQUIP.map(r => r.id));
  const itens = [
    { name: 'Poção de Cura', price: 12, desc: '+35 de vida', type: 'Consumível', kind: 'potion', pot: 'life', rarity: 'Comum' },
    { name: 'Poção de Mana', price: 12, desc: '+30 de mana', type: 'Consumível', kind: 'potion', pot: 'mana', rarity: 'Comum' },
    { name: 'Poção de Stamina', price: 10, desc: '+30 de stamina', type: 'Consumível', kind: 'potion', pot: 'stamina', rarity: 'Comum' },
    { name: 'Melhorar arma equipada', price: 24, desc: '+1 dano permanente', type: 'Serviço', kind: 'weaponUpgrade', rarity: 'Comum' },
    { name: 'Reforçar armadura', price: 22, desc: '+1 ARM permanente', type: 'Serviço', kind: 'armorUpgrade', rarity: 'Comum' },
    ...ws.map(x => ({ name: x.name, price: x.price, desc: `${x.desc} • ${x.effect || 'Efeito especial'}`, type: 'Arma', kind: 'weapon', id: x.id, rarity: x.rarity })),
    ...gs.map(x => ({ name: x.name, price: x.price, desc: `${nomeSlot(x.slot)} • +${x.def} ARM • +${x.hp} HP${x.mana ? ` • +${x.mana} Mana` : ''}`, type: 'Equipamento', kind: 'gear', id: x.id, rarity: x.rarity }))
  ];
  const r = RARIDADES_EQUIP.find(x => x.id === raridadeSet) || RARIDADES_EQUIP[0];
  const pecas = equip.filter(x => x.rarityId === raridadeSet && x.setName);
  const setIds = [...new Set(pecas.map(p => p.setId))];
  if (setIds.length) itens.push({ name: `Conjunto completo — ${r.name}`, price: Math.max(70, Math.round(r.price * 2.5)), desc: `Capacete + Armadura + Botas • ${r.name}`, type: 'Conjunto', kind: 'set', rarity: r.name, rarityId: raridadeSet, setId: rng.escolher(setIds) });
  return { itens, rng: rng.estado };
}

export function comprar(heroi, item) {
  if (!item || heroi.coins < item.price) return { heroi, ok: false, eventos: [{ tipo: 'recusado', texto: 'Ouro insuficiente para essa compra.', tom: 'bad' }] };
  const h = structuredClone(heroi); h.coins -= item.price;
  h.inventoryWeapons ||= []; h.inventoryGear ||= []; h.weaponUpgrades ||= {}; h.armorUpgrades ||= {};
  const add = (l, id) => { if (!l.includes(id)) l.push(id); };
  if (item.kind === 'potion') h.pots[item.pot] = (h.pots[item.pot] ?? 0) + 1;
  else if (item.kind === 'weaponUpgrade') h.weaponUpgrades[h.weaponId] = (h.weaponUpgrades[h.weaponId] ?? 0) + 1;
  else if (item.kind === 'armorUpgrade') { if (h.armorId) h.armorUpgrades[h.armorId] = (h.armorUpgrades[h.armorId] ?? 0) + 1; }
  else if (item.kind === 'weapon' && item.id) { add(h.inventoryWeapons, item.id); h.weaponId = item.id; }
  else if (item.kind === 'gear' && item.id) add(h.inventoryGear, item.id);
  else if (item.kind === 'set') EQUIPAMENTOS.filter(x => x.setId === item.setId).forEach(x => add(h.inventoryGear, x.id));
  return { heroi: h, ok: true, eventos: [{ tipo: 'compra', texto: `${item.name} comprado.${item.rarity ? ` Raridade ${item.rarity}.` : ''}`, tom: 'good' }] };
}
void ARMAS;
