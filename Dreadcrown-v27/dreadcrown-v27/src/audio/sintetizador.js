// Sintetizador procedural (WebAudio): não precisa de arquivos de áudio. Funciona sem rede.
// Política de navegadores: o contexto só inicia após um gesto do usuário -> chame destravar() num clique.
import { somDoEvento, AMBIENTES } from './mapa-sons.js';

export function criarAudio({ criarContexto = () => new (globalThis.AudioContext || globalThis.webkitAudioContext)() } = {}) {
  let ctx = null, mestre = null, musica = null, silenciado = false, volumeSfx = 0.8, volumeMusica = 0.35, temporizador = null, ambienteAtual = null;
  const pronto = () => !!ctx && ctx.state !== 'closed';

  function destravar() {
    try {
      if (!ctx) { ctx = criarContexto(); mestre = ctx.createGain(); mestre.gain.value = silenciado ? 0 : 1; mestre.connect(ctx.destination); musica = ctx.createGain(); musica.gain.value = volumeMusica; musica.connect(mestre); }
      if (ctx.state === 'suspended') ctx.resume?.();
      return true;
    } catch { ctx = null; return false; }
  }
  const env = (g, t0, dur, vol) => { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); };
  function osc(tipo, f0, f1, t0, dur, vol, destino = mestre) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = tipo; o.frequency.setValueAtTime(f0, t0);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    env(g, t0, dur, vol * volumeSfx); o.connect(g); g.connect(destino); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function ruido(t0, dur, vol, freq = 1200) {
    const n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq;
    env(g, t0, dur, vol * volumeSfx); s.connect(f); f.connect(g); g.connect(mestre); s.start(t0);
  }
  const RECEITAS = {
    impacto: (s, t) => { osc('sine', s.grave * 1.6, s.grave * 0.5, t, s.dur, s.vol); ruido(t, s.dur * 0.6, s.vol * 0.7, s.brilho ? 3000 : 1500); if (s.brilho) osc('square', 880, 440, t, 0.15, s.vol * 0.3); },
    explosao: (s, t) => { osc('sawtooth', s.grave * 3, s.grave * 0.4, t, s.dur, s.vol); ruido(t, s.dur, s.vol, 600); },
    magia: (s, t) => { osc('triangle', s.nota, s.nota * 2, t, s.dur, s.vol); osc('sine', s.nota * 1.5, s.nota * 3, t + 0.05, s.dur * 0.8, s.vol * 0.5); },
    tick: (s, t) => osc('square', s.nota, s.nota * 0.7, t, s.dur, s.vol),
    ar: (s, t) => ruido(t, s.dur, s.vol, 2500),
    subida: (s, t) => osc('sine', s.nota, s.nota * 1.5, t, s.dur, s.vol),
    arpejo: (s, t) => [1, 1.25, 1.5, 2].forEach((m, i) => osc('triangle', s.nota * m, null, t + i * 0.09, s.dur / 2, s.vol)),
    metal: (s, t) => { osc('square', s.nota, s.nota * 1.01, t, s.dur, s.vol * 0.5); osc('sine', s.nota * 2.01, null, t, s.dur, s.vol * 0.4); },
    fanfarra: (s, t) => [1, 1.25, 1.5, 2, 1.5, 2].forEach((m, i) => osc('sawtooth', s.nota * m, null, t + i * 0.14, 0.3, s.vol * 0.5)),
    queda: (s, t) => osc('sawtooth', s.nota, s.nota * 0.4, t, s.dur, s.vol)
  };
  function tocar(somOuEvento, contexto) {
    const s = somOuEvento?.receita ? somOuEvento : somDoEvento(somOuEvento, contexto);
    if (!s || silenciado || !pronto()) return false;
    try { RECEITAS[s.receita]?.(s, ctx.currentTime); return true; } catch { return false; }
  }
  const tocarEventos = (eventos, contexto) => eventos.map(e => tocar(e, contexto)).filter(Boolean).length;

  // Música generativa: drone + notas esparsas na escala do ambiente.
  function ambiente(nome) {
    if (nome === ambienteAtual) return; pararMusica(); const a = AMBIENTES[nome]; if (!a || !pronto()) return; ambienteAtual = nome;
    let passo = 0; const drone = ctx.createOscillator(), dg = ctx.createGain(); drone.type = 'sawtooth'; drone.frequency.value = a.raiz / 2; dg.gain.value = 0.05; drone.connect(dg); dg.connect(musica); drone.start();
    const tocarNota = () => {
      if (!pronto() || silenciado) return; const g = ctx.createGain(), o = ctx.createOscillator(), t = ctx.currentTime; const semi = a.escala[(passo * 3 + (passo >> 2)) % a.escala.length];
      o.type = 'triangle'; o.frequency.value = a.raiz * 2 ** ((semi + (passo % 8 === 0 ? 12 : 0)) / 12); env(g, t, 60 / a.bpm * 1.6, 0.08 + a.brilho * 0.06); o.connect(g); g.connect(musica); o.start(t); o.stop(t + 2); passo++;
    };
    temporizador = setInterval(tocarNota, (60 / a.bpm) * 1000 * 2); musica._drone = drone;
  }
  function pararMusica() { clearInterval(temporizador); temporizador = null; try { musica?._drone?.stop(); } catch { /* ok */ } if (musica) musica._drone = null; ambienteAtual = null; }
  function silenciar(v) { silenciado = !!v; if (mestre) mestre.gain.value = silenciado ? 0 : 1; }
  function volumes({ sfx, musica: m } = {}) { if (sfx !== undefined) volumeSfx = sfx; if (m !== undefined) { volumeMusica = m; if (musica) musica.gain.value = m; } }
  return { destravar, tocar, tocarEventos, ambiente, pararMusica, silenciar, volumes, get silenciado() { return silenciado; }, get pronto() { return pronto(); } };
}
