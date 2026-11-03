// Esquiva ativa: antes do ataque do inimigo aparece um anel que se fecha; o jogador aperta ESPAÇO (ou toca)
// no instante em que ele fecha. Devolve 'perfeita' | 'boa' | 'falha'. A regra de dano fica em rules/combate.js.
import { h } from './dom.js';

export const JANELA_DEFESA = { duracao: 950, alvo: 0.72, perfeita: 90, boa: 220 };
// Pura (testável): qualidade a partir do instante do aperto (ms desde o início) — null = não apertou.
export function qualidadeDefesa(instante, j = JANELA_DEFESA) {
  if (instante === null || instante === undefined) return 'falha';
  const d = Math.abs(instante - j.duracao * j.alvo);
  return d <= j.perfeita ? 'perfeita' : d <= j.boa ? 'boa' : 'falha';
}
export function pedirDefesa(container, nomeInimigo = 'O inimigo') {
  return new Promise(resolve => {
    const j = JANELA_DEFESA;
    const anel = h('div', { cls: 'defesa-anel', estilo: { animationDuration: `${j.duracao * j.alvo}ms` } });
    const rotulo = h('div', { cls: 'defesa-rotulo' }, `${nomeInimigo} vai atacar!`), dica = h('div', { cls: 'defesa-dica' }, 'ESPAÇO / toque quando o anel fechar');
    const resultado = h('div', { cls: 'defesa-resultado' });
    const raiz = h('div', { cls: 'defesa-overlay', 'data-duracao': j.duracao * j.alvo }, h('div', { cls: 'defesa-alvo' }), anel, rotulo, dica, resultado);
    container.appendChild(raiz);
    const t0 = performance.now(); let feito = false;
    const fim = q => {
      if (feito) return; feito = true; clearTimeout(tt); window.removeEventListener('keydown', tecla, true); raiz.removeEventListener('pointerdown', toque);
      resultado.textContent = q === 'perfeita' ? 'ESQUIVA PERFEITA!' : q === 'boa' ? 'Esquiva parcial' : 'Falhou'; resultado.className = `defesa-resultado ${q}`; raiz.classList.add('fim');
      setTimeout(() => { raiz.remove(); resolve(q); }, 260);
    };
    const aperta = () => fim(qualidadeDefesa(performance.now() - t0, j));
    const tecla = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); aperta(); } };
    const toque = () => aperta();
    window.addEventListener('keydown', tecla, true); raiz.addEventListener('pointerdown', toque);
    const tt = setTimeout(() => fim('falha'), j.duracao);
  });
}
