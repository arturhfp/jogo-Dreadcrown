// Clãs raciais (v30): um clã por herói, da própria raça, escolhido pelo jogador; perdido para sempre ao ser expulso ou desertar;
// um segundo clã só aceita quem já conquistou a confiança dele. Os benefícios implementados são descontos de loja.
import { CLAS, clanPorId, clasDaRaca } from '../data/jogo/clas.js';
import { REP_AMIGAVEL } from './reputacao.js';

/** Clã válido para a raça? (existe e é da mesma raça). */
export const clanValido = (raca, id) => { const c = clanPorId(id); return !!c && c.raca === raca; };
export const clanDoHeroi = heroi => (heroi?.clan && clanValido(heroi.race, heroi.clan) ? clanPorId(heroi.clan) : null);
export const clansPerdidos = heroi => (Array.isArray(heroi?.clansPerdidos) ? heroi.clansPerdidos.filter(id => clanPorId(id)) : []);

/** Quem pode entrar neste clã agora? Retorna { ok, motivo }. `campanha` é opcional (só precisa para quem já perdeu um clã). */
export function podeEntrarNoClan(heroi, campanha, id) {
  const c = clanPorId(id); if (!c) return { ok: false, motivo: 'clã desconhecido' };
  if (c.raca !== heroi.race) return { ok: false, motivo: 'o clã é de outra raça' };
  if (clanDoHeroi(heroi)) return { ok: false, motivo: 'já pertence a um clã' };
  const perdidos = clansPerdidos(heroi);
  if (perdidos.includes(id)) return { ok: false, motivo: 'perdido para sempre' };
  if (perdidos.length > 0 && (campanha?.reputacao?.[c.faccaoRelacionada] ?? 0) < REP_AMIGAVEL) return { ok: false, motivo: 'ainda não conquistou a confiança deste clã' };
  return { ok: true, motivo: null };
}
export function entrarNoClan(heroi, campanha, id) {
  const r = podeEntrarNoClan(heroi, campanha, id);
  if (!r.ok) return { ok: false, heroi, eventos: [{ tipo: 'recusado', texto: `Não é possível entrar no clã: ${r.motivo}.`, tom: 'bad' }] };
  return { ok: true, heroi: { ...structuredClone(heroi), clan: id, clansPerdidos: clansPerdidos(heroi) }, eventos: [{ tipo: 'clan', texto: `Você agora pertence ao clã ${clanPorId(id).nome}.`, tom: 'good' }] };
}
/** Expulsão ou deserção: o clã é perdido PARA SEMPRE (não volta nem por reputação). */
export function sairDoClan(heroi, motivo = 'desertou') {
  const c = clanDoHeroi(heroi); if (!c) return { ok: false, heroi, eventos: [] };
  const h = structuredClone(heroi); h.clan = null; h.clansPerdidos = [...new Set([...clansPerdidos(heroi), c.id])];
  return { ok: true, heroi: h, eventos: [{ tipo: 'clan', texto: motivo === 'expulso' ? `Você foi expulso do clã ${c.nome}.` : `Você desertou do clã ${c.nome}.`, tom: 'bad' }] };
}

// ---- benefícios implementados: desconto de loja ----
const casa = (efeito, kind) => efeito?.tipo === 'desconto-loja' && (efeito.itens === 'todos' || efeito.itens.includes(kind));
/** Desconto (%) que o clã do herói dá a este tipo de item da loja (0 sem clã ou sem desconto aplicável). */
export const descontoDoClan = (heroi, kind) => { const c = clanDoHeroi(heroi); return c && casa(c.efeito, kind) ? c.efeito.pct : 0; };
/** Aplica o desconto aos itens de uma loja já montada. `price` passa a ser o preço FINAL (é o que `comprar` cobra); `precoBase` guarda o original.
 *  O sorteio do estoque não muda (o desconto é aplicado depois). Sem clã/desconto, os itens ficam idênticos. */
export function aplicarDescontoClan(heroi, itens) {
  return itens.map(i => { const pct = descontoDoClan(heroi, i.kind); if (!pct) return i; return { ...i, precoBase: i.price, price: Math.max(1, Math.round(i.price * (100 - pct) / 100)), descontoClan: pct }; });
}
