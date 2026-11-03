// Save versionado em localStorage, com migração entre versões e tolerância a falhas
// (modo privado, armazenamento bloqueado, JSON corrompido). Sem dependência de DOM além de localStorage.
import { REGIOES } from '../data/jogo/mundo.js';
import { origemPorId } from '../data/jogo/origens.js';
import { criarCampanha } from '../rules/campanha.js';
export const VERSAO_SAVE = 4;
const CHAVE = 'dreadcrown.save';

// Cada migração leva a versão N → N+1. Adicione novas aqui; nunca altere as antigas.
export const MIGRACOES = {
  // 0 → 1: saves sem campo de versão (protótipos) ganham estrutura padrão.
  0: s => ({ ...s, versao: 1, heroi: s.heroi || null, progresso: s.progresso || { vitorias: 0, ouro: 0 }, config: s.config || {} }),
  // 1 → 2: mundo explorável (opcional; ausente = jogador começa na Estrada Quebrada).
  1: s => ({ ...s, versao: 2, mundo: s.mundo || null }),
  // 2 → 3 (v28): o mundo exterior é CONTÍNUO. O save da v27 guardava a região atual e coordenadas RELATIVAS ao centro dela;
  // agora tudo é global (o centro de cada território está em data/jogo/mundo.js). Regiões "visitadas" viram territórios descobertos.
  // Os ids dos inimigos derrotados (`<território>:<n>`) continuam válidos. O herói não é tocado.
  2: s => {
    const pr = s.progresso || {}, m = pr.mundo, visitadas = Array.isArray(pr.visitadas) ? pr.visitadas.filter(id => REGIOES[id]) : [];
    let novo = null;
    if (m && typeof m === 'object') {
      const c = REGIOES[m.regiaoId]?.centro;
      novo = { x: c && Number.isFinite(m.x) ? c[0] + m.x : undefined, z: c && Number.isFinite(m.z) ? c[1] + m.z : undefined, rumo: 0, espaco: { tipo: 'exterior' }, derrotados: m.derrotados && typeof m.derrotados === 'object' ? m.derrotados : {}, tempo: Number.isFinite(m.tempo) ? m.tempo : 0 };
    }
    return { ...s, versao: 3, progresso: { ...pr, mundo: novo, descobertas: { territorios: visitadas, pontos: [], celulas: [] }, dungeons: {} } };
  },
  // 3 → 4 (v29): estado de campanha da lore (reputação neutra, selo Firme, eixos zerados, coroa separada, linhagem bloqueada).
  // O herói NÃO é alterado: quem já jogava continua sem origem e sem bônus retroativo.
  3: s => ({ ...s, versao: 4, progresso: { ...(s.progresso || {}), campanha: criarCampanha() } })
};
export function migrar(dados) {
  let s = { ...dados };
  let v = Number.isInteger(s.versao) ? s.versao : 0;
  if (v > VERSAO_SAVE) throw new Error(`Save de versão futura (${v}) — atualize o jogo.`);
  while (v < VERSAO_SAVE) { const fn = MIGRACOES[v]; if (!fn) throw new Error(`Sem migração de v${v}`); s = fn(s); v = s.versao; }
  return s;
}
export function novoSave(extra = {}) { return { versao: VERSAO_SAVE, heroi: null, progresso: { vitorias: 0, ouro: 0 }, config: {}, mundo: null, ...extra }; }
function armazenamento(arm) { if (arm) return arm; try { return globalThis.localStorage || null; } catch { return null; } }
export function salvar(estado, arm) {
  const a = armazenamento(arm); if (!a) return false;
  try { a.setItem(CHAVE, JSON.stringify({ ...estado, versao: VERSAO_SAVE, salvoEm: Date.now() })); return true; } catch { return false; }
}
export function carregar(arm) {
  const a = armazenamento(arm); if (!a) return null;
  try { const t = a.getItem(CHAVE); if (!t) return null; return migrar(JSON.parse(t)); } catch { return null; }
}
export function apagar(arm) { const a = armazenamento(arm); try { a && a.removeItem(CHAVE); } catch { /* ignora */ } }

// ---------- validação do herói salvo (v27) ----------
// Motivo: um save com herói inválido (campos ausentes, vida 0 gravada após uma derrota…) travava a retomada
// ("Continuar" abria uma batalha em que nenhuma ação era aceita). A validação NÃO altera regras do jogo:
// só impede carregar estado impossível e reconstrói campos ausentes com os mesmos valores iniciais de criarHeroi.
import { RACAS } from '../data/jogo/racas.js';
import { CLASSES } from '../data/jogo/classes.js';
import { RAMIFICACOES } from '../data/jogo/ramificacoes.js';
import { RARIDADES } from '../data/jogo/habilidades-oficiais.js';

const num = v => typeof v === 'number' && Number.isFinite(v);
const CAMPOS_NUMERICOS = ['hp', 'maxHp', 'mana', 'maxMana', 'stam', 'maxStam', 'arm', 'pow', 'mag', 'dex', 'level', 'wins', 'coins', 'ult'];

/** Retorna null se o herói é utilizável, ou um texto dizendo por que não é. */
export function motivoHeroiInvalido(h) {
  if (!h || typeof h !== 'object') return 'herói ausente';
  if (!RACAS.some(r => r.id === h.race)) return `raça desconhecida (${h.race})`;
  if (!CLASSES.some(c => c.id === h.classId)) return `classe desconhecida (${h.classId})`;
  if (!RAMIFICACOES[h.branch]) return `subclasse desconhecida (${h.branch})`;
  for (const k of CAMPOS_NUMERICOS) if (!num(h[k])) return `campo numérico inválido: ${k}`;
  if (h.maxHp <= 0) return 'vida máxima inválida';
  return null;
}
export const heroiValido = h => motivoHeroiInvalido(h) === null;

/** Cópia do herói pronta para jogar: completa campos ausentes e nunca devolve vida 0 (revive com 50% da vida máxima). */
export function sanitizarHeroi(h) {
  const x = structuredClone(h), ajustes = [];
  const garantir = (k, v) => { if (x[k] === undefined || x[k] === null) { x[k] = v; ajustes.push(`${k} restaurado`); } };
  garantir('inventoryWeapons', []); garantir('inventoryArmors', []); garantir('inventoryGear', []);
  garantir('equippedGear', { helmet: null, chest: null, boots: null, accessory: null });
  garantir('weaponUpgrades', {}); garantir('armorUpgrades', {}); garantir('pots', { life: 0, mana: 0, stamina: 0 });
  garantir('selectedSkills', Object.fromEntries(RARIDADES.map(r => [r, null])));
  garantir('shield', 0); garantir('evasion', 0); if (x.armorId === undefined) x.armorId = null; // null é válido: sem armadura base
  for (const r of RARIDADES) if (x.selectedSkills[r] === undefined) x.selectedSkills[r] = null;
  for (const k of ['life', 'mana', 'stamina']) if (!num(x.pots[k])) x.pots[k] = 0;
  if (x.origem !== undefined && x.origem !== null && !origemPorId(x.origem)) { x.origem = null; ajustes.push('origem desconhecida removida'); } // v29: id de origem inválido não vira bônus
  if (x.hp <= 0) { x.hp = Math.max(1, Math.round(x.maxHp * 0.5)); ajustes.push('vida 0 → 50%'); }
  x.hp = Math.min(x.hp, x.maxHp); x.mana = Math.max(0, Math.min(x.mana, x.maxMana)); x.stam = Math.max(0, Math.min(x.stam, x.maxStam));
  return { heroi: x, ajustes };
}
