// Tela do mundo aberto: cena 3D + HUD (vida, minimapa, prompts), mapa-múndi, ficha do herói, modais de acampamento e loja.
// Só LÊ o estado e chama `acoes.mundo*`; simulação em rules/mundo.js, desenho em src/world/cena.js.
import { h, ilha, icone } from './dom.js';
import { montarPainelHeroi } from './painel-heroi.js';
import { modalCamp, modalLoja } from './modais.js';
import { REGIOES } from '../../data/jogo/mundo.js';
import { regiao, pontoProximo, portalLiberado, percebe } from '../../rules/mundo.js';
import { rotuloTier } from '../../rules/inimigos.js';
import { BRANCHES } from '../../data/catalogo.js';

const arr = n => Math.max(0, Math.round(n));
const pct = (v, m) => `${Math.max(0, Math.min(100, (v / m) * 100))}%`;

export function montarMundo({ estado, acoes }) {
  const host = h('div', { cls: 'world-host' }), canvasMini = h('canvas', { cls: 'world-minimap', width: 168, height: 168 });
  const ctxMini = canvasMini.getContext('2d');
  const hud = { regiao: h('div', { cls: 'world-region' }), tier: h('small', {}), barras: h('div', { cls: 'world-bars' }), prompt: h('div', { cls: 'world-prompt' }), toast: h('div', { cls: 'world-toast' }), modal: h('div', { cls: 'modal-host' }) };
  const painel = montarPainelHeroi({ acoes });
  const botoes = h('div', { cls: 'world-buttons' },
    h('button', { type: 'button', cls: 'ghost-button', testid: 'button-world-map', onClick: () => acoes.mundoModal('mapa') }, icone('estrela', 13), ' Mapa (M)'),
    h('button', { type: 'button', cls: 'ghost-button', testid: 'button-world-sheet', onClick: () => acoes.mundoModal('ficha') }, icone('mochila', 13), ' Ficha (I)'));
  const ajuda = h('div', { cls: 'world-help' }, h('b', {}, 'WASD'), ' mover · ', h('b', {}, 'Shift'), ' furtivo · ', h('b', {}, 'Espaço/F'), ' atacar · ', h('b', {}, 'E'), ' interagir · ', h('b', {}, 'arrastar'), ' câmera');
  // controles de toque (aparecem só em telas touch)
  const stick = h('div', { cls: 'world-stick touch-only' }, h('div', { cls: 'world-stick-knob' }));
  let toque = null;
  const knob = stick.firstChild, atualizarStick = (e, fim) => {
    const r = stick.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; let dx = (e.clientX - cx) / (r.width / 2), dy = (e.clientY - cy) / (r.height / 2); const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
    if (fim) { dx = dy = 0; } knob.style.transform = `translate(${dx * 28}px, ${dy * 28}px)`; if (acoes.mundoCena()) { const ex = acoes.mundoCena().entradaExterna ||= {}; ex.mx = dx; ex.mz = dy; }
  };
  stick.addEventListener('pointerdown', e => { toque = e.pointerId; stick.setPointerCapture(e.pointerId); atualizarStick(e); }); stick.addEventListener('pointermove', e => { if (e.pointerId === toque) atualizarStick(e); }); stick.addEventListener('pointerup', e => { toque = null; atualizarStick(e, true); });
  // v27: no celular o sistema pode cancelar o toque (ligação, gesto de borda…); sem isto o herói seguia andando sozinho.
  const soltarStick = e => { if (toque === null) return; toque = null; atualizarStick(e, true); }; stick.addEventListener('pointercancel', soltarStick); stick.addEventListener('lostpointercapture', soltarStick);
  const exTouch = () => (acoes.mundoCena() ? (acoes.mundoCena().entradaExterna ||= {}) : {});
  const botoesToque = h('div', { cls: 'world-touch-buttons touch-only' },
    h('button', { type: 'button', cls: 'action-button', onClick: () => { exTouch().ataque = true; } }, icone('espada', 14), ' Atacar'),
    h('button', { type: 'button', cls: 'action-button', onClick: () => acoes.mundoInteragir() }, 'Interagir'),
    h('button', { type: 'button', cls: 'action-button', id: 'btn-furtivo', onClick: e => { const x = exTouch(); x.furtivo = !x.furtivo; e.currentTarget.classList.toggle('active', !!x.furtivo); } }, 'Furtivo'));

  const raiz = h('div', { cls: 'world-screen' }, host,
    h('div', { cls: 'world-hud' },
      h('div', { cls: 'world-card world-top-left' }, hud.regiao, hud.tier, hud.barras),
      h('div', { cls: 'world-top-right' }, canvasMini, botoes), hud.toast, hud.prompt, ajuda, stick, botoesToque), hud.modal);

  // ---------- ilhas ----------
  const dRegiao = ilha(hud.regiao, s => s.mundo.regiaoId, s => { const r = regiao(s.mundo.regiaoId); return [h('strong', {}, r.nome), h('span', {}, ` · ameaça ${rotuloTier(r.tier)}`)]; });
  const medidor = (rot, v, m, tipo) => h('div', { cls: 'world-bar' }, h('span', {}, rot), h('div', { cls: 'bar-track' }, h('div', { cls: `bar-fill ${tipo}`, estilo: { width: pct(v, m) } })), h('b', {}, `${arr(v)}/${arr(m)}`));
  const dBarras = ilha(hud.barras, s => JSON.stringify([s.heroi.hp, s.heroi.maxHp, s.heroi.mana, s.heroi.maxMana, s.heroi.stam, s.heroi.maxStam, s.heroi.coins, s.heroi.level, s.heroi.wins]), s => {
    const hr = s.heroi; return [h('div', { cls: 'world-hero' }, `${hr.name} · Nv ${hr.level} · ${hr.wins} vitórias · ${hr.coins} moedas`), medidor('Vida', hr.hp, hr.maxHp, 'health'), medidor('Mana', hr.mana, hr.maxMana, 'mana'), medidor('Stamina', hr.stam, hr.maxStam, 'stamina')];
  });

  function mapaMundi(s) {
    const atual = s.mundo.regiaoId, heroi = s.heroi, visitadas = new Set(s.visitadas || []), noCamp = pontoProximo(s.mundo)?.tipo === 'acampamento';
    const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('class', 'world-map-svg');
    const el = (t, a, txt) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (txt) e.textContent = txt; return e; };
    svg.append(el('rect', { x: 0, y: 0, width: 100, height: 100, rx: 4, fill: '#141821' }));
    const feitas = new Set(); for (const [id, r] of Object.entries(REGIOES)) for (const p of r.portais) { const k = [id, p.para].sort().join('|'); if (feitas.has(k)) continue; feitas.add(k); svg.append(el('line', { x1: r.mapa[0], y1: 100 - r.mapa[1], x2: REGIOES[p.para].mapa[0], y2: 100 - REGIOES[p.para].mapa[1], stroke: '#4a5470', 'stroke-width': 0.8, 'stroke-dasharray': '2 1.5' })); }
    for (const [id, r] of Object.entries(REGIOES)) {
      const lib = portalLiberado(heroi, id), vis = visitadas.has(id) || id === atual, cor = id === atual ? '#ffd24a' : !lib ? '#5a3030' : vis ? '#6fd08a' : '#7aa7ff';
      svg.append(el('circle', { cx: r.mapa[0], cy: 100 - r.mapa[1], r: id === atual ? 4.2 : 3.2, fill: cor, stroke: '#0b0d12', 'stroke-width': 0.8 }));
      svg.append(el('text', { x: r.mapa[0], y: 100 - r.mapa[1] + 8, 'text-anchor': 'middle', 'font-size': 3.4, fill: vis || lib ? '#e8ecf8' : '#8b8f9b' }, vis || lib ? r.nome : '???'));
    }
    const lista = Object.entries(REGIOES).map(([id, r]) => {
      const lib = portalLiberado(heroi, id), vis = visitadas.has(id), pode = lib && vis && id !== atual && noCamp;
      return h('div', { cls: 'world-map-row' }, h('div', {}, h('strong', {}, id === atual ? `${r.nome} (você está aqui)` : r.nome), h('small', {}, ` ameaça ${rotuloTier(r.tier)} · ${lib ? (vis ? 'visitada' : 'liberada') : `requer ${r.vitoriasMin} vitórias`}`)),
        id !== atual && h('button', { type: 'button', cls: 'ghost-button', disabled: !pode, title: pode ? 'Viajar' : 'Viagem rápida: só a partir de um acampamento, para regiões já visitadas', onClick: () => acoes.mundoViajar(id) }, 'Viajar'));
    });
    return h('div', { cls: 'modal-backdrop' }, h('div', { cls: 'modal-card world-map-card' },
      h('div', { cls: 'modal-top' }, h('div', {}, h('div', { cls: 'eyebrow' }, 'Mapa-múndi'), h('h2', {}, 'Dreadcrown'), h('p', {}, 'Cada portal liga duas regiões. Viagem rápida só a partir de um acampamento.')), h('button', { type: 'button', cls: 'icon-button', title: 'Fechar', onClick: () => acoes.mundoModal(null) }, icone('fechar', 16))),
      h('div', { cls: 'world-map-body' }, svg, h('div', { cls: 'world-map-list' }, lista))));
  }
  const modalFicha = () => h('div', { cls: 'modal-backdrop' }, h('div', { cls: 'modal-card world-sheet-card' },
    h('div', { cls: 'modal-top' }, h('div', {}, h('div', { cls: 'eyebrow' }, 'Ficha do herói'), h('h2', {}, 'Equipamentos, habilidades e inventário')), h('button', { type: 'button', cls: 'icon-button', title: 'Fechar', onClick: () => acoes.mundoModal(null) }, icone('fechar', 16))),
    h('div', { cls: 'world-sheet-body' }, painel.abasEl, painel.resumo, painel.conteudoAba)));
  const acoesCamp = { acampar: e => acoes.mundoAcampar(e) };
  const dModal = ilha(hud.modal, s => s.modal === 'loja' ? 'loja' + JSON.stringify([s.heroi.coins, s.loja.length]) : s.modal === 'camp' ? 'camp' + Math.round(s.heroi.hp) : s.modalMundo === 'ficha' ? 'ficha' + JSON.stringify([s.aba, s.heroi, s.diceTick]) : s.modalMundo === 'mapa' ? 'mapa' + JSON.stringify([s.mundo.regiaoId, s.visitadas, s.heroi.wins, !!pontoProximo(s.mundo)]) : '',
    s => s.modal === 'camp' ? modalCamp(s.heroi, acoesCamp, 'Você montou acampamento. Escolha uma ação para descansar antes de seguir viagem.', () => acoes.mundoFecharCamp())
      : s.modal === 'loja' ? modalLoja(s.heroi, s.loja, acoes) : s.modalMundo === 'ficha' ? modalFicha() : s.modalMundo === 'mapa' ? mapaMundi(s) : h('span'));

  // ---------- minimapa ----------
  function desenharMinimapa(est) {
    const r = regiao(est.regiaoId), W = canvasMini.width, c = ctxMini, k = W / (r.tamanho * 2), X = x => (x + r.tamanho) * k, Z = z => (z + r.tamanho) * k;
    c.clearRect(0, 0, W, W); c.fillStyle = 'rgba(14,16,22,.82)'; c.fillRect(0, 0, W, W); c.strokeStyle = 'rgba(255,255,255,.18)'; c.strokeRect(.5, .5, W - 1, W - 1);
    for (const p of [{ tipo: 'acampamento', x: r.acampamento?.[0], z: r.acampamento?.[1] }, { tipo: 'loja', x: r.loja?.[0], z: r.loja?.[1] }, ...r.portais.map(q => ({ tipo: 'portal', x: q.pos[0], z: q.pos[1], para: q.para }))]) {
      if (p.x === undefined) continue; c.fillStyle = p.tipo === 'acampamento' ? '#ffa23a' : p.tipo === 'loja' ? '#ffd24a' : portalLiberado(estado.heroi, p.para) ? '#6fd0ff' : '#a04040';
      c.beginPath(); if (p.tipo === 'portal') c.rect(X(p.x) - 4, Z(p.z) - 4, 8, 8); else c.arc(X(p.x), Z(p.z), 4, 0, 6.3); c.fill();
    }
    for (const e of est.inimigos) { if (e.estado === 'morto') continue; c.fillStyle = e.estado === 'persegue' ? '#ff4a3a' : e.estado === 'alerta' ? '#ffd24a' : '#c07a7a'; c.beginPath(); c.arc(X(e.x), Z(e.z), e.chefe ? 5 : 3, 0, 6.3); c.fill(); }
    const hr = est.heroi; c.save(); c.translate(X(hr.x), Z(hr.z)); c.rotate(hr.rumo); c.fillStyle = '#7dffb0'; c.beginPath(); c.moveTo(7, 0); c.lineTo(-5, -4.5); c.lineTo(-3, 0); c.lineTo(-5, 4.5); c.closePath(); c.fill(); c.restore();
  }
  // ---------- prompt contextual ----------
  function textoPrompt(s) {
    const est = s.mundo, pt = pontoProximo(est); if (pt) {
      if (pt.tipo === 'portal') return portalLiberado(s.heroi, pt.para) ? `[E] Viajar: ${pt.rotulo}` : `Portal selado — ${pt.rotulo} exige ${regiao(pt.para).vitoriasMin} vitórias (você tem ${s.heroi.wins})`;
      return pt.tipo === 'acampamento' ? '[E] Acampar' : '[E] Falar com o mercador';
    }
    let melhor = null, md = 1e9; for (const e of est.inimigos) { if (e.estado === 'morto') continue; const d = Math.hypot(e.x - est.heroi.x, e.z - est.heroi.z); if (d < md) { md = d; melhor = e; } }
    if (melhor && md <= 5 && melhor.estado === 'patrulha') { const costas = Math.cos(melhor.rumo) * (est.heroi.x - melhor.x) + Math.sin(melhor.rumo) * (est.heroi.z - melhor.z) < 0; return costas ? `[Espaço] Emboscar ${melhor.nome} (golpe surpresa!)` : `[Espaço] Atacar ${melhor.nome} — por trás dá vantagem`; }
    if (melhor && md <= 14 && (melhor.estado === 'alerta' || melhor.estado === 'persegue')) return `${melhor.nome} está te caçando! Fuja (corrida é mais rápida que andar furtivo) ou enfrente.`;
    void percebe; void BRANCHES; return '';
  }
  let toastT = 0;
  function atualizar() {
    const s = estado; if (!s.mundo) return;
    dRegiao(s); dBarras(s); dModal(s); if (s.modalMundo === 'ficha') painel.atualizar(s);
    const t = textoPrompt(s); if (hud.prompt.textContent !== t) hud.prompt.textContent = t; hud.prompt.style.opacity = t ? 1 : 0;
    desenharMinimapa(s.mundo);
    if (toastT && performance.now() > toastT) { hud.toast.style.opacity = 0; toastT = 0; }
  }
  function toast(texto, ms = 2600) { hud.toast.textContent = texto; hud.toast.style.opacity = 1; toastT = performance.now() + ms; }
  return { raiz, host, atualizar, toast, painel: { atualizar: s => painel.atualizar(s) } };
}
