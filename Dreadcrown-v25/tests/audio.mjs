// Testes de áudio: mapeamento de eventos e síntese com um AudioContext falso (sem navegador).
import path from 'path'; import { fileURLToPath } from 'url'; import assert from 'assert/strict';
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const imp = p => import(path.join(raiz, p));
let ok = 0, falhas = 0;
async function t(n, f) { try { await f(); ok++; console.log('  ✓', n); } catch (e) { falhas++; console.log('  ✗', n, '\n    ', e.message.split('\n').slice(0, 3).join(' | ')); } }
const { somDoEvento, AMBIENTES } = await imp('src/audio/mapa-sons.js'); const { criarAudio } = await imp('src/audio/sintetizador.js');
const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
const no = () => ({ connect() {}, start() {}, stop() {}, frequency: param(), gain: param(), type: '', buffer: null });
let criados = 0;
const falso = () => ({ state: 'running', currentTime: 0, sampleRate: 8000, destination: {}, createGain: () => no(), createOscillator: () => { criados++; return no(); }, createBiquadFilter: () => no(),
  createBufferSource: () => { criados++; return no(); }, createBuffer: (c, n) => ({ getChannelData: () => new Float32Array(n) }), resume() {} });
await t('todo tipo de evento do motor tem som (ou é ignorado de propósito)', () => {
  for (const tipo of ['dano', 'erro', 'esquiva', 'postura', 'cura', 'escudo', 'status', 'vitoria', 'nivel', 'derrota', 'moedas', 'recusado']) assert.ok(somDoEvento({ tipo, alvo: 'inimigo', fonte: 'basico' }), tipo);
  assert.equal(somDoEvento({ tipo: 'inimigo_incapacitado' }), null);
});
await t('crítico soa diferente do golpe comum', () => { assert.notEqual(somDoEvento({ tipo: 'dano', alvo: 'inimigo', fonte: 'basico', critico: true }).id, somDoEvento({ tipo: 'dano', alvo: 'inimigo', fonte: 'basico' }).id); });
await t('sem destravar não toca; depois de destravar toca; mudo bloqueia', () => {
  const a = criarAudio({ criarContexto: falso }); assert.equal(a.tocar({ tipo: 'vitoria' }), false); assert.ok(a.destravar()); assert.equal(a.tocar({ tipo: 'vitoria' }), true); a.silenciar(true); assert.equal(a.tocar({ tipo: 'vitoria' }), false);
});
await t('toda receita sintetiza sem lançar erro', () => {
  const a = criarAudio({ criarContexto: falso }); a.destravar(); const n0 = criados;
  for (const ev of [{ tipo: 'dano', alvo: 'inimigo', fonte: 'suprema' }, { tipo: 'dano', alvo: 'inimigo', fonte: 'hab' }, { tipo: 'dano', alvo: 'heroi' }, { tipo: 'cura' }, { tipo: 'derrota' }, { tipo: 'erro' }, { tipo: 'escudo' }, { tipo: 'moedas' }, { tipo: 'nivel' }, { tipo: 'status' }, { tipo: 'dano', fonte: 'queimar', alvo: 'inimigo' }]) assert.equal(a.tocar(ev, { tema: 'fire' }), true, ev.tipo);
  assert.ok(criados > n0);
});
await t('contexto indisponível não derruba o jogo', () => { const a = criarAudio({ criarContexto: () => { throw new Error('sem audio'); } }); assert.equal(a.destravar(), false); assert.equal(a.tocar({ tipo: 'vitoria' }), false); });
await t('ambientes definidos e música inicia/para', () => {
  for (const k of ['menu', 'batalha', 'chefe', 'acampamento']) assert.ok(AMBIENTES[k]);
  const a = criarAudio({ criarContexto: falso }); a.destravar(); a.ambiente('batalha'); a.ambiente('chefe'); a.pararMusica();
});
console.log(`\n${ok} ok, ${falhas} falhas`); process.exit(falhas ? 1 : 0);
