// Regras do herói: criação, atributos por nível e recálculo com equipamento.
// Porta de ZG / AB1 / AB2 / AB3 do bundle original (sem React, sem DOM).
import { RACAS } from '../data/jogo/racas.js';
import { CLASSES } from '../data/jogo/classes.js';
import { ARMAS } from '../data/jogo/armas.js';
import { ARMADURAS_BASE } from '../data/jogo/armaduras-base.js';
import { RARIDADES } from '../data/jogo/habilidades-oficiais.js';
import { EQUIPAMENTOS, equipamentoPorId } from './equipamentos.js';

export const raca = id => RACAS.find(r => r.id === id) ?? RACAS[0];
export const classe = id => CLASSES.find(c => c.id === id) ?? CLASSES[0];
export const armasDaClasse = (classeId, grande) => ARMAS.filter(a => a.classId === classeId && a.large === grande);
export const armadurasBase = (classeId, grande) => ARMADURAS_BASE.filter(a => a.classes.includes(classeId) && a.large === grande);
export const armaEscolhida = (classeId, racaId, armaId) => { const l = armasDaClasse(classeId, raca(racaId).large); return l.find(a => a.id === armaId) ?? l[0] ?? ARMAS[0]; };

// Bônus automático por nível.
export function bonusNivel(nivel) {
  const l = Math.max(0, nivel - 1);
  return { hp: 6 * l, mana: 4 * l, stam: 4 * l, pow: Math.floor(l / 2), mag: Math.floor(l / 2), dex: Math.floor(l / 2), arm: Math.floor(l / 3) };
}
export const nivelPorVitorias = v => 1 + Math.floor(v / 3);

const TIERS_CONJUNTO = {
  common: { arm: 3, hp: 8, mana: 3 }, uncommon: { arm: 5, hp: 15, mana: 6 }, rare: { arm: 8, hp: 25, mana: 10 },
  epic: { arm: 12, hp: 40, mana: 16 }, legendary: { arm: 18, hp: 65, mana: 24 }, mythic: { arm: 28, hp: 100, mana: 38 }, unique: { arm: 42, hp: 160, mana: 60 }
};
// Soma do equipamento + bônus fixo de conjunto completo (4 peças do mesmo conjunto/raridade).
export function bonusEquipamento(heroi) {
  const pecas = Object.values(heroi.equippedGear || {}).map(equipamentoPorId).filter(Boolean);
  const porSet = {};
  for (const p of pecas) (porSet[p.setId] ||= []).push(p);
  const soma = pecas.reduce((a, p) => ({ hp: a.hp + p.hp, mana: a.mana + p.mana, arm: a.arm + p.def }), { hp: 0, mana: 0, arm: 0 });
  const ativos = Object.entries(porSet).filter(([, l]) => l.length === 4);
  for (const [, l] of ativos) { const t = TIERS_CONJUNTO[l[0].rarityId || 'common'] || TIERS_CONJUNTO.common; soma.hp += t.hp; soma.mana += t.mana; soma.arm += t.arm; }
  return { ...soma, conjuntosAtivos: ativos.map(([id]) => id) };
}

// Recalcula atributos máximos (raça + classe + nível + armadura + equipamento).
export function recalcular(heroi, equipado = heroi.equippedGear) {
  const r = raca(heroi.race), c = classe(heroi.classId);
  const arm = ARMADURAS_BASE.find(a => a.id === heroi.armorId);
  const n = bonusNivel(heroi.level), e = bonusEquipamento({ equippedGear: equipado });
  const veterano = heroi.wins >= 24 ? 12 : 0;
  const maxHp = r.hp + c.hp + (arm?.hp ?? 0) + n.hp + e.hp + veterano;
  const maxMana = r.mana + c.mana + (arm?.mana ?? 0) + n.mana + e.mana + veterano;
  const maxStam = r.stam + c.stam + n.stam + veterano;
  return {
    ...heroi, equippedGear: equipado, maxHp, maxMana, maxStam,
    hp: Math.min(maxHp, heroi.hp + Math.max(0, maxHp - heroi.maxHp)),
    mana: Math.min(maxMana, heroi.mana + Math.max(0, maxMana - heroi.maxMana)),
    stam: Math.min(maxStam, heroi.stam + Math.max(0, maxStam - heroi.maxStam)),
    arm: r.arm + c.arm + (arm?.def ?? 0) + n.arm + e.arm + (heroi.wins >= 24 ? 5 : 0),
    pow: r.pow + c.pow + n.pow, mag: r.mag + c.mag + n.mag, dex: r.dex + c.dex + n.dex
  };
}

// selecao: {name, race, classId, branch, weaponId, appearance}. admin: herói maximizado (modo teste).
export function criarHeroi(selecao, admin = false) {
  const r = raca(selecao.race), c = classe(selecao.classId);
  const arma = armaEscolhida(selecao.classId, selecao.race, selecao.weaponId);
  const armas = armasDaClasse(selecao.classId, r.large), armaduras = armadurasBase(selecao.classId, r.large);
  const nivel = admin ? 9 : 1;
  const melhorArmadura = admin ? armaduras.slice().sort((a, b) => b.def + b.hp - (a.def + a.hp))[0] : undefined;
  const melhorArma = admin ? (armas.slice().sort((a, b) => b.bonus - a.bonus)[0] ?? arma) : arma;
  const equip = EQUIPAMENTOS.filter(e => e.classId === selecao.classId);
  const n = bonusNivel(nivel);
  const maxHp = r.hp + c.hp + (melhorArmadura?.hp ?? 0) + n.hp + (admin ? 12 : 0);
  const maxMana = r.mana + c.mana + (melhorArmadura?.mana ?? 0) + n.mana + (admin ? 12 : 0);
  const maxStam = r.stam + c.stam + n.stam + (admin ? 12 : 0);
  const slot = s => equip.find(e => e.slot === s)?.id ?? null;
  return {
    ...selecao,
    name: admin ? 'Arauto do Zero' : (selecao.name || '').trim() || 'Sem Nome',
    weaponId: melhorArma.id, level: nivel, wins: admin ? 24 : 0, coins: admin ? 99999 : 25,
    hp: maxHp, maxHp, mana: maxMana, maxMana, stam: maxStam, maxStam,
    arm: r.arm + c.arm + (melhorArmadura?.def ?? 0) + n.arm + (admin ? 5 : 0),
    pow: r.pow + c.pow + n.pow, mag: r.mag + c.mag + n.mag, dex: r.dex + c.dex + n.dex,
    ult: admin ? 100 : 0, shield: 0, evasion: 0,
    inventoryWeapons: admin ? armas.map(a => a.id) : [arma.id],
    inventoryArmors: admin ? armaduras.map(a => a.id) : [],
    inventoryGear: admin ? equip.map(e => e.id) : (equip.length ? [equip[0].id] : []),
    equippedGear: admin ? { helmet: slot('helmet'), chest: slot('chest'), boots: slot('boots'), accessory: slot('accessory') } : { helmet: null, chest: null, boots: null, accessory: null },
    weaponUpgrades: admin ? Object.fromEntries(armas.map(a => [a.id, 5])) : {},
    armorUpgrades: admin ? Object.fromEntries(armaduras.map(a => [a.id, 5])) : {},
    pots: admin ? { life: 99, mana: 99, stamina: 99 } : { life: 2, mana: 2, stamina: 2 },
    armorId: melhorArmadura?.id ?? null,
    selectedSkills: Object.fromEntries(RARIDADES.map(x => [x, null])),
    battleLoadout: [`w:${melhorArma.id}`, ...(melhorArmadura ? [`a:${melhorArmadura.id}`] : [])]
  };
}
