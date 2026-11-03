// Testes de regras: dados íntegros, equivalência com o código original do bundle, equipamentos e save.
import fs from 'fs'; import vm from 'vm'; import assert from 'assert'; import path from 'path'; import { fileURLToPath } from 'url';
import { RACAS } from '../src/data/jogo/racas.js'; import { CLASSES } from '../src/data/jogo/classes.js';
import { RAMIFICACOES } from '../src/data/jogo/ramificacoes.js'; import { RARIDADES } from '../src/data/jogo/habilidades-oficiais.js';
import { gerarHabilidades } from '../src/rules/habilidades.js';
import { EQUIPAMENTOS, conjuntosAtivos, multiplicador } from '../src/rules/equipamentos.js';
import { aplicarGlossario } from '../src/data/glossario.js';
import { salvar, carregar, migrar, novoSave, VERSAO_SAVE } from '../src/state/save.js';
const aqui = path.dirname(fileURLToPath(import.meta.url));
let ok = 0; const t = (n, f) => { try { f(); ok++; console.log('ok  ', n); } catch (e) { console.log('FALHA', n, '\n  ', e.message); process.exitCode = 1; } };

// Original, executado numa VM (referência de equivalência).
const src = fs.readFileSync(path.join(aqui, '../tools/migracao/trecho_original_bundle.js'), 'utf8');
const ctx = { Math, JSON, String, Object, Array, Number }; vm.createContext(ctx);
vm.runInContext(src + ';globalThis.__x={E1,ABG1,GDDDamageMultiplier,GDDActiveSets}', ctx);
const O = ctx.__x;
const semGloss = h => h.map(x => ({ ...x }));

t('5 raças, 6 classes, 5 ramificações por classe', () => {
  assert.equal(RACAS.length, 5); assert.equal(CLASSES.length, 6);
  for (const c of CLASSES) { assert.equal(c.branches.length, 5); for (const b of c.branches) assert.ok(RAMIFICACOES[b], b); }
});
t('habilidades: 600 combinações equivalem ao original (exceto glossário)', () => {
  let n = 0;
  for (const r of RACAS) for (const c of CLASSES) for (const b of c.branches) for (const rar of RARIDADES) {
    const novo = gerarHabilidades(b, rar, r.id, c.id), velho = O.E1(b, rar, r.id, c.id);
    assert.equal(novo.length, velho.length === 4 ? 4 : velho.length);
    novo.forEach((h, i) => { const v = velho[i];
      for (const k of ['id', 'rarity', 'index', 'damage', 'cost', 'resource']) assert.equal(h[k], v[k], `${b}/${rar}/${r.id}/${c.id}#${i}.${k}`);
      for (const k of ['name', 'description', 'effect']) assert.equal(h[k], aplicarGlossario(v[k]), `${k}`); });
    n++;
  }
  assert.equal(n, 600);
});
t('habilidades: ramificação desconhecida usa modelo padrão (igual ao original)', () => {
  const a = gerarHabilidades('Inexistente', 'rare', 'elfo', 'mago'), b = O.E1('Inexistente', 'rare', 'elfo', 'mago');
  assert.equal(a.length, b.length); a.forEach((h, i) => { assert.equal(h.damage, b[i].damage); assert.equal(h.cost, b[i].cost); });
});
t('glossário: nenhuma habilidade exibe "Abismo"; "Abissal" preservado', () => {
  for (const r of RACAS) for (const c of CLASSES) for (const b of c.branches) for (const rar of RARIDADES)
    for (const h of gerarHabilidades(b, rar, r.id, c.id)) assert.ok(!/Abismo/.test(h.name + h.description + h.effect), h.name);
  assert.equal(aplicarGlossario('Cataclismo do Abismo'), 'Cataclismo de Dreadcrown');
  assert.equal(aplicarGlossario('Supernova Abissal'), 'Supernova Abissal');
});
t('equipamentos: 684 itens, ids únicos, equivalentes ao original', () => {
  assert.equal(EQUIPAMENTOS.length, O.ABG1.length); assert.equal(new Set(EQUIPAMENTOS.map(e => e.id)).size, EQUIPAMENTOS.length);
  EQUIPAMENTOS.forEach((e, i) => assert.deepEqual(e, O.ABG1[i]));
});
t('bônus de conjunto: original nunca ativava (bug), corrigido ativa com 3 peças', () => {
  const pecas = EQUIPAMENTOS.filter(e => e.id.startsWith('gdd-mage-archmage-rare-')).slice(0, 3).map(e => e.id);
  const heroi = { equippedGear: Object.fromEntries(pecas.map((id, i) => ['s' + i, id])) };
  assert.equal(O.GDDDamageMultiplier(heroi), 1, 'original deveria falhar (bug conhecido)');
  assert.deepEqual(conjuntosAtivos(heroi), ['mage-archmage']); assert.equal(multiplicador(heroi, 'dano'), 1.25);
  assert.equal(multiplicador({ equippedGear: { a: pecas[0], b: pecas[1] } }, 'dano'), 1);
});
t('save: salvar/carregar ida e volta', () => {
  const mem = {}; const arm = { setItem: (k, v) => mem[k] = v, getItem: k => mem[k] ?? null, removeItem: k => delete mem[k] };
  assert.ok(salvar(novoSave({ heroi: { nome: 'Grok' } }), arm)); assert.equal(carregar(arm).heroi.nome, 'Grok');
});
t('save: migra v0 sem versão, rejeita versão futura, tolera JSON corrompido e armazenamento ausente', () => {
  assert.equal(migrar({ heroi: { x: 1 } }).versao, VERSAO_SAVE);
  assert.throws(() => migrar({ versao: 99 }));
  const arm = { getItem: () => '{quebrado', setItem() { throw new Error('cheio'); } };
  assert.equal(carregar(arm), null); assert.equal(salvar(novoSave(), arm), false);
});
console.log(ok + ' testes ok'); 
