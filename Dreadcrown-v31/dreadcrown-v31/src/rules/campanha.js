// Estado de campanha da lore (v29): reputação, selo, eixos de escolha, coroa e linhagem. Tudo serializável (vai no save v4).
import { origemPorId } from '../data/jogo/origens.js';
import { reputacaoNeutra, sanearReputacao, ajustarReputacao, REP_INICIAL_ORIGEM } from './reputacao.js';
import { ESTADOS_SELO, seloValido } from './selo.js';
import { sanearMissoes } from './missoes.js';

export const EIXOS = ['misericordia', 'crueldade', 'selo', 'despertar']; // Misericórdia × Crueldade e Selo × Despertar (só contadores nesta versão)
export const ESTADOS_LINHAGEM = ['bloqueada', 'pista', 'descoberta'];
export const ESTADOS_COROA = ['separada']; // o selo mantém a coroa separada do corpo do Louco (LORE 5b); outros estados virão com missões

export const criarCampanha = () => ({ reputacao: reputacaoNeutra(), selo: 'firme', eixos: Object.fromEntries(EIXOS.map(e => [e, 0])), coroa: 'separada', linhagem: 'bloqueada', missoes: {} });

/** Aplica a origem sorteada: reputação inicial e o primeiro sinal da linhagem (se a origem tiver). */
export function aplicarOrigem(campanha, origemId) {
  const o = origemPorId(origemId); if (!o) return campanha;
  let rep = campanha.reputacao;
  for (const [fac, v] of Object.entries(o.reputacao || {})) rep = ajustarReputacao(rep, fac, v * REP_INICIAL_ORIGEM).rep;
  return { ...campanha, reputacao: rep, linhagem: o.linhagem && ESTADOS_LINHAGEM.includes(o.linhagem) ? o.linhagem : campanha.linhagem };
}
export function registrarEixo(campanha, eixo, n = 1) {
  if (!EIXOS.includes(eixo) || !Number.isInteger(n) || n < 0) return { ok: false, campanha };
  return { ok: true, campanha: { ...campanha, eixos: { ...campanha.eixos, [eixo]: campanha.eixos[eixo] + n } } };
}
/** Reconstrói a campanha a partir de dado salvo: qualquer campo ausente/inválido volta ao valor neutro (nunca lança). */
export function sanearCampanha(raw) {
  const base = criarCampanha(); if (!raw || typeof raw !== 'object') return base;
  const eixos = { ...base.eixos }; for (const e of EIXOS) if (Number.isInteger(raw.eixos?.[e]) && raw.eixos[e] >= 0) eixos[e] = raw.eixos[e];
  return {
    reputacao: sanearReputacao(raw.reputacao), selo: seloValido(raw.selo) ? raw.selo : 'firme', eixos,
    coroa: ESTADOS_COROA.includes(raw.coroa) ? raw.coroa : 'separada', linhagem: ESTADOS_LINHAGEM.includes(raw.linhagem) ? raw.linhagem : 'bloqueada', missoes: sanearMissoes(raw.missoes)
  };
}
void ESTADOS_SELO;
