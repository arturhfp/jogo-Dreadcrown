// Quem a facção aceita (v30). PROVISÓRIO onde o LORE.md ainda não define limiares (marcado abaixo); fácil de ajustar.
//  - Racistas: rejeitam o herói se a raça dele (ou a de um companheiro) está entre os seus alvos.
//  - De história: aceitam conforme o lado que o herói segue (contadores Selo × Despertar da campanha).
//      Vigília aceita se selo ≥ despertar; Culto aceita se despertar > selo; Legião: provisório, aceita sempre.
//  - Raciais e mistas: aceitam (atritos entre raciais: a definir).
import { faccaoPorId } from '../data/jogo/faccoes.js';
import { faixaReputacao } from './reputacao.js';

export function aceitaHeroi(facaoId, heroi, campanha, companheiros = []) {
  const f = faccaoPorId(facaoId); if (!f) return { aceita: false, motivo: 'facção desconhecida' };
  if (f.categoria === 'racista') {
    if (f.alvos.includes(heroi?.race)) return { aceita: false, motivo: 'rejeita a sua raça' };
    const c = (companheiros || []).find(r => f.alvos.includes(r)); if (c) return { aceita: false, motivo: 'rejeita um de seus companheiros' };
  }
  const e = campanha?.eixos ?? {}, selo = e.selo ?? 0, desp = e.despertar ?? 0;
  if (f.id === 'vigilia' && !(selo >= desp)) return { aceita: false, motivo: 'você segue o lado do Despertar' };
  if (f.id === 'culto' && !(desp > selo)) return { aceita: false, motivo: 'você não segue o lado do Despertar' };
  return { aceita: true, motivo: null };
}
/** Faixa que vale na prática: quem a facção não aceita nunca passa de Neutra (benefícios ficam indisponíveis). */
export function faixaEfetiva(facaoId, heroi, campanha, companheiros = []) {
  const faixa = faixaReputacao(campanha?.reputacao?.[facaoId] ?? 0);
  return !aceitaHeroi(facaoId, heroi, campanha, companheiros).aceita && (faixa === 'amistosa' || faixa === 'aliada') ? 'neutra' : faixa;
}
