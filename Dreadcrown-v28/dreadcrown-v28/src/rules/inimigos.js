// Geração de encontros (porta de DS). Usa o RNG injetado, nunca Math.random.
import { INIMIGOS } from '../data/jogo/inimigos.js';
export const tierPorVitorias = v => (v < 5 ? 'weak' : v < 12 ? 'medium' : 'strong');
export const rotuloTier = t => (t === 'weak' ? 'FRACA' : t === 'medium' ? 'MÉDIA' : 'FORTE');
export function gerarInimigo(rng, chefe = false, vitorias = 0) {
  const tier = chefe ? 'strong' : tierPorVitorias(vitorias);
  const pool = INIMIGOS.filter(o => o.tier === tier);
  const base = chefe ? (INIMIGOS.find(o => o.kind === 'demon') ?? INIMIGOS[INIMIGOS.length - 1]) : rng.escolher(pool);
  return { ...base, maxHp: base.hp, hp: base.hp };
}

// Inimigo específico por nome (usado pelo mundo aberto, onde cada criatura já existe no mapa).
export function inimigoPorNome(nome) {
  const base = INIMIGOS.find(o => o.name === nome); if (!base) throw new Error(`Inimigo desconhecido: ${nome}`);
  return { ...base, maxHp: base.hp, hp: base.hp };
}
