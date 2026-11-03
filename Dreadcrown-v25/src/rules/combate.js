// Motor de combate por turnos, determinístico e independente de UI/3D.
// Porta das regras do bundle original (a9/ee/j/K) com RNG injetado e eventos estruturados.
//
// Uso:
//   let c = criarCombate({ heroi, inimigo, semente: 42 });
//   const { combate, eventos } = executarAcao(c, { tipo: 'basico' });
// A camada 3D/UI só CONSOME `eventos` ({tipo, alvo, valor, texto, tom...}); nunca altera regras.
import { criarRng } from '../core/rng.js';
import { RARIDADES } from '../data/jogo/habilidades-oficiais.js';
import { RAMIFICACOES } from '../data/jogo/ramificacoes.js';
import { ARMAS } from '../data/jogo/armas.js';
import { gerarHabilidades } from './habilidades.js';
import { multiplicadorDano, multiplicadorCusto } from './equipamentos.js';
import { bonusNivel, nivelPorVitorias } from './heroi.js';
import { penetracao, bonusD20, multiplicadorCura, ajustarDanoCausado, marcarNoBasico, escudoDaHabilidade, reduzirRecebido, fimDeTurno } from './classes.js';
import { efeitosDaHabilidade, aplicarEfeitos, processarStatusInimigo, avancarStatus, armaduraEfetiva, multiplicadorRecebido, temStatus } from './efeitos.js';

const clamp100 = v => Math.min(100, v);
const limitar = (v, max) => Math.min(max, v);

export function habilidadeEscolhida(heroi, raridade) {
  const i = heroi.selectedSkills?.[raridade];
  if (i === null || i === undefined) return null;
  return gerarHabilidades(heroi.branch, raridade, heroi.race, heroi.classId)[i] ?? null;
}
export function custoHabilidade(heroi, raridade) {
  const h = habilidadeEscolhida(heroi, raridade);
  return h?.cost ?? (8 + RARIDADES.indexOf(raridade) * 4);
}

export function criarCombate({ heroi, inimigo, semente = 1 }) {
  return { heroi: structuredClone(heroi), inimigo: structuredClone(inimigo), turno: 1, rng: semente >>> 0, fim: null };
}

// Ataque do inimigo ao herói (muta h; devolve evento).
function ataqueInimigo(h, e, rng) {
  if (h.evasion > 0) {
    h.evasion = 0; h.ult = clamp100(h.ult + 5);
    return { tipo: 'esquiva', alvo: 'heroi', texto: `${e.name} atacou, mas você desviou.`, tom: 'good' };
  }
  const bruto = Math.max(2, Math.round((e.dmg + rng.inteiro(-1, 2)) * (temStatus(e, 'lentidao') ? 0.75 : 1)));
  const dano = reduzirRecebido(h, Math.max(1, Math.round(bruto - Math.min(bruto * 0.55, h.arm * 0.55)) - Math.min(h.shield, bruto)));
  h.shield = Math.max(0, h.shield - bruto);
  h.hp = Math.max(0, h.hp - dano);
  h.stam = limitar(h.stam + 4, h.maxStam);
  h.mana = limitar(h.mana + 3, h.maxMana);
  return { tipo: 'dano', alvo: 'heroi', valor: dano, fonte: e.name, texto: `${e.name} causou ${dano} de dano.`, tom: dano > 10 ? 'bad' : 'info' };
}

// Turno completo do inimigo: status contínuos, perda de turno, ataque.
function turnoInimigo(c, rng, ev) {
  const h = c.heroi, e = c.inimigo;
  const { perde } = processarStatusInimigo(e, ev);
  if (e.hp <= 0) { vitoria(h, e, rng, ev); c.fim = 'vitoria'; return; }
  if (perde) ev.push({ tipo: 'inimigo_incapacitado', alvo: 'inimigo', texto: `${e.name} está incapacitado e perde o turno.`, tom: 'good' });
  else ev.push(ataqueInimigo(h, e, rng));
  avancarStatus(e);
}

function vitoria(h, e, rng, ev) {
  const moedas = rng.inteiro(e.reward[0], e.reward[1]);
  const vitorias = h.wins + 1, nivel = nivelPorVitorias(vitorias);
  const antes = bonusNivel(h.level), depois = bonusNivel(nivel);
  const nivelAnterior = h.level;
  h.wins = vitorias; h.level = nivel; h.coins += moedas; h.ult = clamp100(h.ult + 16);
  const d = k => depois[k] - antes[k];
  h.maxHp += d('hp'); h.maxMana += d('mana'); h.maxStam += d('stam');
  h.hp = limitar(h.hp + d('hp'), h.maxHp); h.mana = limitar(h.mana + d('mana'), h.maxMana); h.stam = limitar(h.stam + d('stam'), h.maxStam);
  h.pow += d('pow'); h.mag += d('mag'); h.dex += d('dex'); h.arm += d('arm');
  e.hp = 0;
  ev.push({ tipo: 'vitoria', alvo: 'inimigo', moedas, texto: `${e.name} derrotado! Você recebeu ${moedas} moedas.`, tom: 'good' });
  if (nivel > nivelAnterior) ev.push({ tipo: 'nivel', nivel, texto: `Você subiu para o nível ${nivel}. Status base aumentaram automaticamente.`, tom: 'good' });
}

// Ação do herói + resposta do inimigo. acao: {tipo:'basico'|'esquivar'|'suprema'|'habilidade', raridade?}
export function executarAcao(combate, acao) {
  const c = structuredClone(combate); const rng = criarRng(c.rng); const h = c.heroi, e = c.inimigo; const ev = [];
  const emitir = x => ev.push(x);
  const fechar = () => { c.rng = rng.estado; return { combate: c, eventos: ev }; };
  if (c.fim || h.hp <= 0 || e.hp <= 0) return { combate: c, eventos: [{ tipo: 'invalido', texto: 'O combate já terminou.', tom: 'bad' }] };
  const recusar = texto => { emitir({ tipo: 'recusado', texto, tom: 'bad' }); return fechar(); };

  if (acao.tipo === 'esquivar') {
    if (h.stam < 8) return recusar('Stamina insuficiente para esquivar.');
    h.stam -= 8; h.evasion = (h.branch === 'Arqueiro Acrobático' || h.branch === 'Ninja / Shinobi') ? 55 : 30; h.ult = clamp100(h.ult + 6);
    emitir({ tipo: 'postura', alvo: 'heroi', valor: h.evasion, texto: `Você entrou em postura evasiva (+${h.evasion}% evasão).`, tom: 'good' });
    turnoInimigo(c, rng, ev); return fim(c, ev, fechar);
  }

  let dano = 0, critico = false;
  if (acao.tipo === 'suprema') {
    if (h.ult < 100) return recusar('A Suprema ainda não está pronta.');
    h.ult = 0;
    const bruto = 42 + h.pow + h.mag + rng.inteiro(8, 20);
    dano = ajustarDanoCausado(h, e, Math.max(1, Math.round(bruto - Math.min(bruto * 0.55, armaduraEfetiva(e, penetracao(h, 'suprema')) * 0.55))), rng).dano;
    e.hp = Math.max(0, e.hp - dano);
    emitir({ tipo: 'dano', alvo: 'inimigo', valor: dano, fonte: 'suprema', texto: `${RAMIFICACOES[h.branch]?.skills[2] ?? 'Ultimate'} causou ${dano} de dano.`, tom: 'good' });
  } else if (acao.tipo === 'habilidade') {
    const hab = habilidadeEscolhida(h, acao.raridade);
    if (!hab) return recusar('Escolha uma habilidade desbloqueada antes de agir.');
    const custo = Math.max(1, Math.round(custoHabilidade(h, acao.raridade) * multiplicadorCusto(h)));
    const recurso = hab.resource || (['mago', 'clerigo', 'paladino'].includes(h.classId) || h.branch === 'Guardião Arcano' ? 'mana' : 'stam');
    if (h[recurso] < custo) return recusar(`${recurso === 'mana' ? 'Mana' : 'Stamina'} insuficiente para ${hab.name}.`);
    h[recurso] -= custo;
    const bruto = Math.max(1, Math.round((hab.damage + h[recurso === 'mana' ? 'mag' : 'pow'] * 1.35 + h.dex * 0.22 - armaduraEfetiva(e, penetracao(h, 'habilidade', recurso === 'mana')) * 0.45) * multiplicadorDano(h) * multiplicadorRecebido(e)));
    const aj = ajustarDanoCausado(h, e, bruto, rng); dano = aj.dano; critico = aj.critico;
    e.hp = Math.max(0, e.hp - dano);
    h.ult = clamp100(h.ult + 12 + RARIDADES.indexOf(acao.raridade) * 4);
    if (h.branch === 'Guardião Arcano' && acao.raridade === 'common') h.shield += 14 + h.mag;
    h.shield += escudoDaHabilidade(h);
    if (h.branch === 'Berserker' || h.branch === 'Necromante') h.hp = limitar(h.hp + Math.max(3, Math.round(dano * 0.16)), h.maxHp);
    emitir({ tipo: 'dano', alvo: 'inimigo', valor: dano, fonte: hab.id, habilidade: hab.name, critico, texto: `${hab.name} causou ${dano} de dano${critico ? ' — CRÍTICO!' : ''}. ${hab.effect}`, tom: 'good' });
    aplicarEfeitos(efeitosDaHabilidade(h.branch, hab.index), { h, e, dano, rng, ev, curaMult: multiplicadorCura(h) });
  } else { // ataque básico (D20)
    if (h.stam < 8) return recusar('Stamina insuficiente para o ataque básico.');
    h.stam -= 8;
    const d20 = rng.inteiro(1, 20);
    if (d20 === 1 || d20 + Math.floor(h.dex / 3) + bonusD20(h) < 9) {
      emitir({ tipo: 'erro', alvo: 'inimigo', d20, texto: `Ataque básico errou (D20 ${d20}).`, tom: 'bad' });
    } else {
      const arma = ARMAS.find(a => a.id === h.weaponId);
      const bruto = Math.max(1, Math.round((9 + h.pow + Math.floor(h.dex * 0.45) + (arma?.bonus ?? 0) + rng.inteiro(1, 6) - armaduraEfetiva(e, penetracao(h, 'basico')) * 0.55) * multiplicadorDano(h) * multiplicadorRecebido(e)));
      const aj = ajustarDanoCausado(h, e, bruto, rng); dano = aj.dano; critico = aj.critico || d20 === 20;
      e.hp = Math.max(0, e.hp - dano);
      if (marcarNoBasico(h, rng)) { e.status ||= []; if (!e.status.some(x => x.id === 'marcar')) e.status.push({ id: 'marcar', turnos: 2, dano: 0, forca: 0 }); emitir({ tipo: 'status', alvo: 'inimigo', id: 'marcar', turnos: 2, texto: `${e.name} foi marcado.`, tom: 'good' }); }
      h.ult = clamp100(h.ult + 10 + (h.race === 'humano' ? 4 : 0));
      emitir({ tipo: 'dano', alvo: 'inimigo', valor: dano, fonte: 'basico', d20, critico, texto: `Ataque básico: ${dano} de dano${critico ? ' — CRÍTICO!' : ''}.`, tom: critico ? 'good' : 'info' });
    }
  }
  if (e.hp <= 0) { vitoria(h, e, rng, ev); c.fim = 'vitoria'; return fechar(); }
  turnoInimigo(c, rng, ev);
  return fim(c, ev, fechar);
}

function fim(c, ev, fechar) {
  c.turno += 1;
  if (!c.fim && c.heroi.hp > 0) ev.push(...fimDeTurno(c.heroi));
  if (c.heroi.hp <= 0) { c.fim = 'derrota'; ev.push({ tipo: 'derrota', alvo: 'heroi', texto: `${c.heroi.name} foi derrotado. Recrie o personagem para tentar novamente.`, tom: 'bad' }); }
  return fechar();
}
