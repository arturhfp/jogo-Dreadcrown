// Reputação com as facções (v29): inteiro em [-100, 100] por facção. Só dados e regras; sem efeito de combate nesta versão.
import { FACCOES, faccaoPorId } from '../data/jogo/faccoes.js';
export const REP_MIN = -100, REP_MAX = 100;
// Faixas: hostil ≤ -25 < neutra < 25 ≤ amistosa < 60 ≤ aliada.
export const FAIXAS = [{ id: 'hostil', ate: -25 }, { id: 'neutra', ate: 24 }, { id: 'amistosa', ate: 59 }, { id: 'aliada', ate: REP_MAX }];
export const ROTULO_FAIXA = { hostil: 'Hostil', neutra: 'Neutra', amistosa: 'Amistosa', aliada: 'Aliada' };
export const REP_INICIAL_ORIGEM = 25; // cada "1"/"-1" de uma origem vale ±25 (uma faixa acima/abaixo de neutra)
export const reputacaoNeutra = () => Object.fromEntries(FACCOES.map(f => [f.id, 0]));
export const limitar = v => Math.max(REP_MIN, Math.min(REP_MAX, Math.round(v)));
export const faixaReputacao = v => FAIXAS.find(f => v <= f.ate)?.id ?? 'aliada';
/** Soma `delta` à reputação com `facaoId`. Facção desconhecida ou delta inválido: sem mudança (ok:false). */
export function ajustarReputacao(rep, facaoId, delta) {
  if (!faccaoPorId(facaoId) || !Number.isFinite(delta)) return { ok: false, rep };
  return { ok: true, rep: { ...rep, [facaoId]: limitar((rep[facaoId] ?? 0) + delta) } };
}
export const consultarReputacao = (rep, facaoId) => { const v = rep?.[facaoId] ?? 0; return { valor: v, faixa: faixaReputacao(v) }; };
/** Reconstrói um objeto de reputação confiável a partir de dado salvo (ignora ids desconhecidos e valores inválidos). */
export function sanearReputacao(raw) {
  const r = reputacaoNeutra(); if (raw && typeof raw === 'object') for (const id of Object.keys(r)) if (Number.isFinite(raw[id])) r[id] = limitar(raw[id]);
  return r;
}
