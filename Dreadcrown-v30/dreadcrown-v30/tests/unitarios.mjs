/* Testes unitários (Node, sem navegador) das regras de DADOS do motor 3D: catálogo e animações.
   Rodam com: node tests/unitarios.mjs */
import assert from 'node:assert/strict';
import { BRANCHES, ENEMIES, HERO_ACT, ARCH_LEAD, HERO_ARCH, ENEMY_ACT, MELEE_CLS, themeOf, CLASSCOL, BRCOL, RACE, pickRe, RACES, CLS } from '../src/data/catalogo.js';
import { ACTIONS, newPose, track } from '../src/3d/animacao.js';

let ok = 0; const t = (nome, fn) => { try { fn(); ok++; console.log('  ok  ' + nome); } catch (e) { console.error('FALHOU ' + nome + '\n   ' + e.message); process.exitCode = 1; } };
const CLASSES = ['tanke', 'mago', 'paladino', 'clerigo', 'assassino', 'arqueiro'], SLOTS = ['basic', 'common', 'rare', 'epic', 'legendary', 'ultimate'];

t('6 classes × 5 subclasses', () => { assert.deepEqual(Object.keys(BRANCHES).sort(), [...CLASSES].sort()); CLASSES.forEach(c => assert.equal(BRANCHES[c].length, 5, c)); });
t('15 inimigos com campos obrigatórios', () => { assert.equal(ENEMIES.length, 15); ENEMIES.forEach(e => ['name', 'kind', 'theme'].forEach(k => assert.ok(e[k], e.name + ' sem ' + k))); });
t('todo par classe×subclasse tem tema e cor', () => { CLASSES.forEach(c => { assert.ok(CLASSCOL[c]); assert.equal(BRCOL[c].length, 5); for (let b = 0; b < 5; b++) assert.ok(themeOf(c, b), c + b); }); });
t('5 raças com visual definido', () => { assert.deepEqual(Object.keys(RACE).sort(), ['anao', 'elfo', 'humano', 'orc', 'tiefling']); });
t('HERO_ACT cobre 6 classes × 6 slots e cada ação existe em ACTIONS', () => { CLASSES.forEach(c => SLOTS.forEach(s => { const a = HERO_ACT[c][s]; assert.ok(a, c + '/' + s); assert.ok(ACTIONS[a], 'ação inexistente: ' + a); })); });
t('ENEMY_ACT só usa ações existentes', () => { Object.values(ENEMY_ACT).forEach(a => assert.ok(ACTIONS[a], a)); });
t('MELEE_CLS não inclui classes de longe', () => { ['mago', 'clerigo', 'arqueiro'].forEach(c => assert.ok(!MELEE_CLS[c])); });
t('ações: durações e instantes de hit coerentes', () => { for (const [n, d] of Object.entries(ACTIONS)) { assert.ok(d.dur > 0, n); (d.hit || []).forEach(h => assert.ok(h >= 0 && h <= d.dur, n + ' hit fora da duração')); const base = Object.keys(newPose()); for (const k of Object.keys(d.ch)) assert.ok(base.includes(k), n + ' canal inválido: ' + k); } });
t('keyframes ordenados no tempo', () => { for (const [n, d] of Object.entries(ACTIONS)) for (const [k, keys] of Object.entries(d.ch)) for (let i = 1; i < keys.length; i++) assert.ok(keys[i][0] >= keys[i - 1][0], n + '.' + k); });
t('track: extremos e ponto médio suave', () => { const k = [[0, 0], [1, 10]]; assert.equal(track(k, -1), 0); assert.equal(track(k, 2), 10); assert.equal(track(k, .5), 5); });
t('arqueiro: toda ação do arco tem tempo de puxada e hits', () => { Object.keys(HERO_ARCH).forEach(a => { assert.ok(ACTIONS[a], a); assert.ok(ACTIONS[a].hit.length >= 1, a + ' sem hit'); }); Object.keys(ARCH_LEAD).forEach(a => assert.ok(ACTIONS[a], 'ARCH_LEAD ' + a)); SLOTS.forEach(s => assert.ok(HERO_ARCH[HERO_ACT.arqueiro[s]], 'slot ' + s + ' do arqueiro não aciona o arco')); });
t('detecção de raça/classe por texto', () => { assert.equal(pickRe(RACES, 'Anão'), 'anao'); assert.equal(pickRe(CLS, 'Clérigo'), 'clerigo'); assert.equal(pickRe(CLS, 'xyz'), null); });
console.log(ok + ' testes passaram'); 
