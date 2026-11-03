// Aplicação dos efeitos mecânicos de habilidades e processamento de status. Puro e determinístico.
import { RAMIFICACOES } from '../data/jogo/ramificacoes.js';
import { EFEITOS_POR_TEMA } from '../data/jogo/efeitos.js';

export const temaDaRamificacao = b => RAMIFICACOES[b]?.theme || 'physical';
export const efeitosDaHabilidade = (branch, indice) => (EFEITOS_POR_TEMA[temaDaRamificacao(branch)] || EFEITOS_POR_TEMA.physical)[indice] || [];

const NEGATIVOS_HEROI = ['lentidao_heroi'];
const lim = (v, m) => Math.min(m, v);

// Aplica ops da habilidade. Muta h/e (já clonados). Retorna dano extra causado.
export function aplicarEfeitos(ops, { h, e, dano, rng, ev, curaMult = 1 }) {
  let extra = 0;
  for (const o of ops) {
    if (o.op === 'dano_extra') {
      if (o.quando === 'vida_baixa' && h.hp > h.maxHp * 0.5) continue;
      const d = Math.max(1, Math.round(dano * o.pct)); e.hp = Math.max(0, e.hp - d); extra += d;
      ev.push({ tipo: 'dano', alvo: 'inimigo', valor: d, fonte: 'efeito', texto: `Efeito adicional: +${d} de dano.`, tom: 'good' });
    } else if (o.op === 'status') {
      if (o.chance !== undefined && rng.proximo() >= o.chance) continue;
      e.status ||= [];
      const ex = e.status.find(s => s.id === o.id);
      const novo = { id: o.id, turnos: o.turnos, dano: Math.max(1, Math.round(dano * (o.forca || 0))), forca: o.forca || 0 };
      if (ex) Object.assign(ex, { turnos: Math.max(ex.turnos, novo.turnos), dano: Math.max(ex.dano, novo.dano) }); else e.status.push(novo);
      ev.push({ tipo: 'status', alvo: 'inimigo', id: o.id, turnos: o.turnos, texto: `${e.name} sofreu ${o.id} (${o.turnos}t).`, tom: 'good' });
    } else if (o.op === 'curar') {
      const c = Math.max(1, Math.round(dano * o.pct * curaMult)); h.hp = lim(h.hp + c, h.maxHp); ev.push({ tipo: 'cura', alvo: 'heroi', valor: c, texto: `Você recuperou ${c} de vida.`, tom: 'good' });
    } else if (o.op === 'curar_max') {
      const c = Math.round(h.maxHp * o.pct * curaMult); h.hp = lim(h.hp + c, h.maxHp); ev.push({ tipo: 'cura', alvo: 'heroi', valor: c, texto: `Você recuperou ${c} de vida.`, tom: 'good' });
    } else if (o.op === 'escudo') { h.shield += o.valor; ev.push({ tipo: 'escudo', alvo: 'heroi', valor: o.valor, texto: `Escudo +${o.valor}.`, tom: 'good' });
    } else if (o.op === 'evasao') { h.evasion = Math.max(h.evasion, o.valor); ev.push({ tipo: 'postura', alvo: 'heroi', valor: h.evasion, texto: `Evasão ${h.evasion}%.`, tom: 'good' });
    } else if (o.op === 'ult') { h.ult = Math.min(100, h.ult + o.valor);
    } else if (o.op === 'limpar_negativos') { h.negativos = []; void NEGATIVOS_HEROI; }
  }
  return extra;
}

export const temStatus = (e, id) => (e.status || []).some(s => s.id === id);
export const armaduraEfetiva = (e, penetracao = 0) => { const q = (e.status || []).find(s => s.id === 'quebrar_defesa'); return (q ? e.armor * (1 - Math.min(0.6, q.forca)) : e.armor) * (1 - Math.min(0.9, penetracao)); };
export const multiplicadorRecebido = e => (temStatus(e, 'marcar') ? 1.15 : 1);

// Início do turno do inimigo: dano contínuo e verificação de perda de turno. Retorna {perdeTurno}.
export function processarStatusInimigo(e, ev) {
  let perde = false;
  const DOTS = ['queimar', 'sangrar', 'envenenar', 'corromper'];
  for (const s of e.status || []) {
    if (DOTS.includes(s.id)) { e.hp = Math.max(0, e.hp - s.dano); ev.push({ tipo: 'dano', alvo: 'inimigo', valor: s.dano, fonte: s.id, texto: `${e.name} sofre ${s.dano} de ${s.id}.`, tom: 'good' }); }
    if (['congelar', 'atordoar', 'prender'].includes(s.id)) perde = true;
  }
  return { perde };
}
export function avancarStatus(e) { e.status = (e.status || []).map(s => ({ ...s, turnos: s.turnos - 1 })).filter(s => s.turnos > 0); }
