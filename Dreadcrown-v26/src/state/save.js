// Save versionado em localStorage, com migração entre versões e tolerância a falhas
// (modo privado, armazenamento bloqueado, JSON corrompido). Sem dependência de DOM além de localStorage.
export const VERSAO_SAVE = 2;
const CHAVE = 'dreadcrown.save';

// Cada migração leva a versão N → N+1. Adicione novas aqui; nunca altere as antigas.
export const MIGRACOES = {
  // 0 → 1: saves sem campo de versão (protótipos) ganham estrutura padrão.
  0: s => ({ ...s, versao: 1, heroi: s.heroi || null, progresso: s.progresso || { vitorias: 0, ouro: 0 }, config: s.config || {} }),
  // 1 → 2: mundo explorável (opcional; ausente = jogador começa na Estrada Quebrada).
  1: s => ({ ...s, versao: 2, mundo: s.mundo || null })
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
