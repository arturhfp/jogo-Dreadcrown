// Passivas de classe: lógica pura (sem DOM/3D). Lê os números de data/jogo/classes-kit.js.
import { KIT_CLASSES } from '../data/jogo/classes-kit.js';

export const kitDe = h => KIT_CLASSES[h.classId] || {};
const incapacitado = e => (e.status || []).some(s => ['congelar', 'atordoar', 'prender'].includes(s.id));

// Fração de armadura ignorada. tipo: 'basico' | 'habilidade' | 'suprema'; magia = habilidade que gasta Mana.
export function penetracao(h, tipo, magia = false) {
  const p = kitDe(h).penetracao; if (!p) return 0;
  return (magia && tipo !== 'basico' ? p.magia || 0 : 0) + (tipo === 'basico' ? p.basico || 0 : tipo === 'habilidade' ? p.habilidade || 0 : 0);
}
// Bônus fixo no D20 do ataque básico.
export const bonusD20 = h => kitDe(h).bonusD20 || 0;
// Multiplicador de cura do herói.
export const multiplicadorCura = h => 1 + (kitDe(h).bonusCura || 0);

// Ajusta o dano causado pelo herói: crítico (só consome sorteio se a classe tem crítico) e bônus situacionais.
// Retorna {dano, critico}.
export function ajustarDanoCausado(h, e, dano, rng) {
  const k = kitDe(h); let m = 1, critico = false;
  if (k.crit) { const chance = k.crit.chance + (k.crit.dex || 0) * h.dex; if (rng.proximo() < chance) { m *= k.crit.mult; critico = true; } }
  if (k.contraIncapacitado && incapacitado(e)) m *= 1 + k.contraIncapacitado;
  if (k.vidaCheia && e.hp >= e.maxHp) m *= 1 + k.vidaCheia;
  return { dano: Math.max(1, Math.round(dano * m)), critico };
}
// Ao atacar o inimigo com ataque básico: chance de marcar.
export function marcarNoBasico(h, rng) { const c = kitDe(h).marcarChance; return !!c && rng.proximo() < c; }

// Escudo ganho ao usar uma habilidade.
export function escudoDaHabilidade(h) {
  const s = kitDe(h).escudoPorHabilidade; if (!s) return 0;
  return Math.round((s.base || 0) + (s.mag || 0) * h.mag + (s.arm || 0) * h.arm);
}
// Dano recebido já reduzido pelas passivas defensivas (mínimo 1).
export function reduzirRecebido(h, dano) {
  const k = kitDe(h); let r = k.reducaoRecebida || 0; if (h.shield > 0 && k.reducaoComEscudo) r += k.reducaoComEscudo;
  return r ? Math.max(1, Math.round(dano * (1 - Math.min(0.6, r)))) : dano;
}
// Fim do turno do herói (após a ação do inimigo): regenerações. Muta h; devolve eventos.
export function fimDeTurno(h) {
  const k = kitDe(h), ev = [];
  if (k.manaTurno && h.hp > 0) { const antes = h.mana; h.mana = Math.min(h.maxMana, h.mana + k.manaTurno); if (h.mana > antes) ev.push({ tipo: 'recurso', alvo: 'heroi', recurso: 'mana', valor: h.mana - antes, texto: `${k.nome}: +${h.mana - antes} Mana.`, tom: 'good' }); }
  if (k.regenPct && h.hp > 0) { const c = Math.max(1, Math.round(h.maxHp * k.regenPct)), antes = h.hp; h.hp = Math.min(h.maxHp, h.hp + c); if (h.hp > antes) ev.push({ tipo: 'cura', alvo: 'heroi', valor: h.hp - antes, texto: `${k.nome}: +${h.hp - antes} de vida.`, tom: 'good' }); }
  return ev;
}
