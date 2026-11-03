// Regras das missões (v31). Funções puras sobre a campanha (dados em data/jogo/missoes.js). O estado vai em `campanha.missoes`.
import { MISSOES, missaoPorId, missaoDoAlvo } from '../data/jogo/missoes.js';
import { ajustarReputacao } from './reputacao.js';
import { registrarEixo, ESTADOS_LINHAGEM } from './campanha.js';
import { moverSelo } from './selo.js';
import { faixaEfetiva } from './aceitacao.js';

export const concluida = (campanha, id) => campanha?.missoes?.[id]?.estado === 'concluida';
/** Uma missão está disponível se não foi concluída, a anterior (se houver) foi concluída e o clã exigido é o do herói. */
export function disponivel(campanha, heroi, m) {
  if (!m || concluida(campanha, m.id)) return false;
  if (m.requer?.missao && !concluida(campanha, m.requer.missao)) return false;
  if (m.requer?.clan && heroi?.clan !== m.requer.clan) return false;
  return true;
}
export const missoesDisponiveis = (campanha, heroi) => MISSOES.filter(m => disponivel(campanha, heroi, m));
/** Missão disponível cujo alvo é este inimigo (ou null). Só uma por vez: a primeira da lista. */
export const missaoDoInimigo = (campanha, heroi, inimigoId) => missaoDoAlvo(inimigoId).find(m => disponivel(campanha, heroi, m)) ?? null;
/** Opções oferecidas: sem opções na missão = conclusão automática (tratada como 'matar'). */
export const opcoesDaMissao = m => (m?.opcoes?.length ? m.opcoes : []);

/** Aplica a decisão de uma missão à campanha e ao herói (moedas). Nunca altera os argumentos. Devolve o que mudou, para o texto da tela.
 *  Reputação, eixos e Selo seguem os dados; linhagem só avança (bloqueada → pista → descoberta). */
export function decidir(campanha, heroi, missaoId, decisao) {
  const m = missaoPorId(missaoId); if (!m || !disponivel(campanha, heroi, m)) return { ok: false, campanha, heroi, motivo: 'missão indisponível' };
  const dec = m.opcoes.length ? decisao : 'matar';
  if (!m.opcoes.length ? !m.efeitos.matar : !m.opcoes.includes(dec)) return { ok: false, campanha, heroi, motivo: 'decisão inválida' };
  const ef = m.efeitos[dec]; let c = { ...campanha, missoes: { ...(campanha.missoes || {}) } }, rep = c.reputacao; const mudou = { rep: {}, eixos: {}, selo: null, moedas: ef.moedas || 0, revela: m.revela?.pontos ?? [], texto: m.revela?.texto ?? '' };
  for (const [f, d] of Object.entries(ef.rep || {})) { const r = ajustarReputacao(rep, f, d); if (r.ok) { mudou.rep[f] = r.rep[f] - (rep[f] ?? 0); rep = r.rep; } }
  c.reputacao = rep;
  for (const [e, n] of Object.entries(ef.eixos || {})) { const r = registrarEixo(c, e, n); if (r.ok) { c = r.campanha; mudou.eixos[e] = n; } }
  if (ef.selo) { const r = moverSelo(c.selo, ef.selo); if (r.ok && r.mudou) { c.selo = r.selo; mudou.selo = r.selo; } }
  if (m.linhagem && ESTADOS_LINHAGEM.indexOf(m.linhagem) > ESTADOS_LINHAGEM.indexOf(c.linhagem)) c.linhagem = m.linhagem;
  c.missoes[m.id] = { estado: 'concluida', decisao: dec };
  return { ok: true, campanha: c, heroi: { ...heroi, coins: (heroi.coins || 0) + mudou.moedas }, decisao: dec, mudou };
}
/** Sanitiza o dado salvo: só ids conhecidos, estado 'concluida', decisão válida para a missão. */
export function sanearMissoes(raw) {
  const o = {}; if (!raw || typeof raw !== 'object') return o;
  for (const m of MISSOES) { const r = raw[m.id]; if (r?.estado === 'concluida') o[m.id] = { estado: 'concluida', decisao: m.opcoes.length ? (m.opcoes.includes(r.decisao) ? r.decisao : m.opcoes[0]) : 'matar' }; }
  return o;
}

// ---- Reputação econômica (preço nos acampamentos, que a Guilda dos Cinco Cofres opera) ----
export const FACAO_DA_LOJA = 'cinco-cofres';
export const AJUSTE_REP = { aliada: -15, amistosa: -10, neutra: 0, hostil: 10 }; // % sobre o preço; tetos aprovados (proposta) em CAMPANHA-REDE.md §5
export const ajusteLojaPorReputacao = (heroi, campanha) => AJUSTE_REP[faixaEfetiva(FACAO_DA_LOJA, heroi, campanha)] ?? 0;
/** Aplica o ajuste de reputação DEPOIS do desconto de clã (os dois se multiplicam, nunca zeram o preço). `precoBase` guarda o original. */
export function aplicarReputacaoLoja(heroi, campanha, itens) {
  const pct = ajusteLojaPorReputacao(heroi, campanha); if (!pct) return itens;
  return itens.map(i => ({ ...i, precoBase: i.precoBase ?? i.price, price: Math.max(1, Math.round(i.price * (100 + pct) / 100)), ajusteRep: pct }));
}
