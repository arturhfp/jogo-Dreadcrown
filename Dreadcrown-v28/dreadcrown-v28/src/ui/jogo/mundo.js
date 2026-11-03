// Tela do mundo aberto (v28): cena 3D contínua + HUD (vida, estado do jogador, minimapa, prompts), mapa-múndi real, ficha do herói, acampamento e loja.
// O mapa-múndi e o minimapa são desenhados a partir da MESMA geografia que o jogo usa (rules/geografia.js) e só mostram o que o jogador descobriu.
// Só LÊ o estado e chama `acoes.mundo*`; simulação em rules/mundo.js, desenho em src/world/cena.js.
import { h, ilha, icone } from './dom.js';
import { montarPainelHeroi } from './painel-heroi.js';
import { modalCamp, modalLoja } from './modais.js';
import { REGIOES, PARAMETROS_MUNDO as PM } from '../../data/jogo/mundo.js';
import { regiao, pontoProximo, lojaDisponivel, noEspaco, inimigosDoEspaco } from '../../rules/mundo.js';
import * as G from '../../rules/geografia.js';
import { dungeonPorId, grade, CELULA } from '../../rules/dungeon.js';
import { rotuloTier } from '../../rules/inimigos.js';

const arr = n => Math.max(0, Math.round(n));
const pct = (v, m) => `${Math.max(0, Math.min(100, (v / m) * 100))}%`;

export function montarMundo({ estado, acoes }) {
  const host = h('div', { cls: 'world-host' }), canvasMini = h('canvas', { cls: 'world-minimap', width: 168, height: 168 });
  const ctxMini = canvasMini.getContext('2d');
  const hud = { regiao: h('div', { cls: 'world-region' }), tier: h('small', {}), modo: h('small', { cls: 'world-mode', testid: 'world-mode' }), barras: h('div', { cls: 'world-bars' }), prompt: h('div', { cls: 'world-prompt' }), toast: h('div', { cls: 'world-toast' }), modal: h('div', { cls: 'modal-host' }) };
  const painel = montarPainelHeroi({ acoes });
  const botoes = h('div', { cls: 'world-buttons' },
    h('button', { type: 'button', cls: 'ghost-button', testid: 'button-world-map', onClick: () => acoes.mundoModal('mapa') }, icone('estrela', 13), ' Mapa (M)'),
    h('button', { type: 'button', cls: 'ghost-button', testid: 'button-world-sheet', onClick: () => acoes.mundoModal('ficha') }, icone('mochila', 13), ' Ficha (I)'));
  const ajuda = h('div', { cls: 'world-help' }, h('b', {}, 'WASD'), ' mover · ', h('b', {}, 'Shift'), ' furtivo · ', h('b', {}, 'Espaço/F'), ' atacar · ', h('b', {}, 'E'), ' interagir (acampamento, entrada de dungeon, baú) · ', h('b', {}, 'arrastar'), ' câmera');
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
      h('div', { cls: 'world-card world-top-left' }, hud.regiao, hud.modo, hud.tier, hud.barras),
      h('div', { cls: 'world-top-right' }, canvasMini, botoes), hud.toast, hud.prompt, ajuda, stick, botoesToque), hud.modal);

  // ---------- ilhas ----------
  /** Estado do jogador, em palavras: o que ele está fazendo agora (spec v28 §9). */
  const textoModo = s => {
    if (s.modal === 'loja') return 'COMÉRCIO · mercador do acampamento'; if (s.modal === 'camp') return 'ACAMPAMENTO';
    const pt = pontoProximo(s.mundo), dg = s.mundo.espaco.tipo === 'dungeon';
    if (dg) return pt?.tipo === 'saida' ? 'DUNGEON · perto da saída' : pt?.tipo === 'bau' ? 'DUNGEON · baú à vista' : `DUNGEON · ${dungeonPorId(s.mundo.espaco.id).nome}`;
    if (pt?.tipo === 'dungeon') return 'ENTRADA DE DUNGEON ao alcance'; if (pt?.tipo === 'acampamento') return 'ACAMPAMENTO ao alcance'; return 'EXPLORANDO';
  };
  const dRegiao = ilha(hud.regiao, s => [s.mundo.regiaoId, s.mundo.espaco.tipo, s.mundo.espaco.id, s.heroi.wins].join('|'), s => {
    const r = regiao(s.mundo.regiaoId), dg = s.mundo.espaco.tipo === 'dungeon' ? dungeonPorId(s.mundo.espaco.id) : null, rec = s.heroi.wins < r.vitoriasMin ? ` · recomendado: ${r.vitoriasMin}+ vitórias` : '';
    return [h('strong', {}, dg ? dg.nome : r.nome), h('span', {}, dg ? ` · ${r.nome}` : ''), h('span', {}, ` · ameaça ${rotuloTier(r.tier)}${rec}`)];
  });
  const medidor = (rot, v, m, tipo) => h('div', { cls: 'world-bar' }, h('span', {}, rot), h('div', { cls: 'bar-track' }, h('div', { cls: `bar-fill ${tipo}`, estilo: { width: pct(v, m) } })), h('b', {}, `${arr(v)}/${arr(m)}`));
  const dBarras = ilha(hud.barras, s => JSON.stringify([s.heroi.hp, s.heroi.maxHp, s.heroi.mana, s.heroi.maxMana, s.heroi.stam, s.heroi.maxStam, s.heroi.coins, s.heroi.level, s.heroi.wins]), s => {
    const hr = s.heroi; return [h('div', { cls: 'world-hero' }, `${hr.name} · Nv ${hr.level} · ${hr.wins} vitórias · ${hr.coins} moedas`), medidor('Vida', hr.hp, hr.maxHp, 'health'), medidor('Mana', hr.mana, hr.maxMana, 'mana'), medidor('Stamina', hr.stam, hr.maxStam, 'stamina')];
  });

  // ---------- mapa-múndi (geografia real + células descobertas) ----------
  const CORES_CELULA = new Map(); // índice da célula → cor (a geografia é fixa, então o cálculo é feito uma vez por célula)
  function corDaCelula(i) {
    let c = CORES_CELULA.get(i); if (c) return c;
    const [x, z] = G.centroDaCelula(i), id = G.territorioEm(x, z), base = REGIOES[id].visual.chao[1], alt = G.alturaGlobal(x, z), f = Math.max(.55, Math.min(1.35, .8 + alt / 38)), n = parseInt(base.slice(1), 16);
    const ch = v => Math.max(0, Math.min(255, Math.round(v * f))); c = alt > 30 ? 'rgb(120,122,126)' : `rgb(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)})`; CORES_CELULA.set(i, c); return c;
  }
  const COR_PONTO = { acampamento: '#ffa23a', dungeon: '#b58cff', marco: '#d7d9de' };
  function desenharMapaMundi(cv, est) {
    const L = G.LIMITES, W = cv.width, k = W / (L.maxX - L.minX), Hh = Math.round((L.maxZ - L.minZ) * k); cv.height = Hh; const c = cv.getContext('2d'), X = x => (x - L.minX) * k, Z = z => (z - L.minZ) * k;
    c.fillStyle = '#0d1016'; c.fillRect(0, 0, W, Hh); const set = est._celulas || new Set(est.descobertas.celulas), tc = PM.celulaMapa, lado = tc * k + 1;
    for (const i of set) { const [x, z] = G.centroDaCelula(i); c.fillStyle = corDaCelula(i); c.fillRect(X(x - tc / 2), Z(z - tc / 2), lado, lado); }
    c.lineWidth = 2; c.strokeStyle = '#b79a63'; c.lineCap = 'round'; c.lineJoin = 'round';
    for (const e of G.ESTRADAS_PONTOS) { c.beginPath(); let aberto = false; for (let j = 0; j < e.pontos.length - 1; j++) { const a = e.pontos[j], b = e.pontos[j + 1], ci = G.celulaDe((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); if (ci >= 0 && set.has(ci)) { if (!aberto) c.moveTo(X(a[0]), Z(a[1])); c.lineTo(X(b[0]), Z(b[1])); aberto = true; } else aberto = false; } c.stroke(); }
    c.font = '600 12px sans-serif'; c.textAlign = 'center'; c.fillStyle = 'rgba(232,236,248,.85)';
    for (const id of est.descobertas.territorios) { const r = REGIOES[id]; if (r) c.fillText(r.nome.toUpperCase(), X(r.centro[0]), Z(r.centro[1]) - 6); }
    c.font = '11px sans-serif'; c.textAlign = 'left';
    for (const id of est.descobertas.pontos) {
      const p = G.pontoPorId(id); if (!p) continue; const px = X(p.x), pz = Z(p.z); c.fillStyle = COR_PONTO[p.tipo] || '#fff'; c.strokeStyle = '#0b0d12'; c.lineWidth = 1.5; c.beginPath();
      if (p.tipo === 'dungeon') { c.moveTo(px, pz - 7); c.lineTo(px + 6, pz); c.lineTo(px, pz + 7); c.lineTo(px - 6, pz); c.closePath(); } else if (p.tipo === 'marco') c.rect(px - 4, pz - 4, 8, 8); else c.arc(px, pz, 5, 0, 6.3);
      c.fill(); c.stroke(); c.fillStyle = '#e8ecf8'; c.fillText(p.rotulo.replace(/^Acampamento · /, ''), px + 9, pz + 4);
    }
    const hr = est.heroi, dg = est.espaco.tipo === 'dungeon', pos = dg ? est.espaco.retorno : hr, rumo = dg ? est.espaco.retorno.rumo + Math.PI : hr.rumo;
    c.save(); c.translate(X(pos.x), Z(pos.z)); c.rotate(rumo); c.fillStyle = '#7dffb0'; c.strokeStyle = '#06210f'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(10, 0); c.lineTo(-7, -6); c.lineTo(-4, 0); c.lineTo(-7, 6); c.closePath(); c.fill(); c.stroke(); c.restore();
    c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 1; c.strokeRect(.5, .5, W - 1, Hh - 1);
  }
  function mapaMundi(s) {
    const est = s.mundo, d = est.descobertas, noCamp = est.espaco.tipo === 'exterior' && pontoProximo(est)?.tipo === 'acampamento', atualCamp = noCamp ? pontoProximo(est).id : null;
    const cv = h('canvas', { cls: 'world-map-svg world-map-canvas', width: 620, testid: 'world-map-canvas' }); desenharMapaMundi(cv, est);
    const territorios = d.territorios.map(id => { const r = REGIOES[id]; return h('div', { cls: 'world-map-row' }, h('div', {}, h('strong', {}, id === est.regiaoId && est.espaco.tipo === 'exterior' ? `${r.nome} (você está aqui)` : r.nome), h('small', {}, `ameaça ${rotuloTier(r.tier)}${s.heroi.wins < r.vitoriasMin ? ` · recomendado ${r.vitoriasMin}+ vitórias` : ''}`))); });
    const pontos = d.pontos.map(id => G.pontoPorId(id)).filter(Boolean).map(p => {
      const camp = p.tipo === 'acampamento', pode = camp && noCamp && p.id !== atualCamp, tipo = camp ? 'acampamento' : p.tipo === 'dungeon' ? 'entrada de dungeon' : p.subtipo;
      return h('div', { cls: 'world-map-row' }, h('div', {}, h('strong', {}, p.rotulo), h('small', {}, tipo)), camp && p.id !== atualCamp && h('button', { type: 'button', cls: 'ghost-button', testid: `button-travel-${p.regiao}`, disabled: !pode, title: pode ? 'Viajar até este acampamento' : 'Viagem rápida: só a partir de um acampamento, para acampamentos já descobertos', onClick: () => acoes.mundoViajar(p.id) }, 'Viajar'));
    });
    const onde = est.espaco.tipo === 'dungeon' ? `Você está dentro de ${dungeonPorId(est.espaco.id).nome}; o marcador mostra a entrada, no mundo aberto.` : `Você está em ${regiao(est.regiaoId).nome}. Explore para revelar o mapa: só o que você já viu aparece aqui.`;
    return h('div', { cls: 'modal-backdrop' }, h('div', { cls: 'modal-card world-map-card', testid: 'modal-map' },
      h('div', { cls: 'modal-top' }, h('div', {}, h('div', { cls: 'eyebrow' }, 'Mapa-múndi'), h('h2', {}, 'Dreadcrown'), h('p', {}, onde)), h('button', { type: 'button', cls: 'icon-button', title: 'Fechar', 'aria-label': 'Fechar mapa', onClick: () => acoes.mundoModal(null) }, icone('fechar', 16))),
      h('div', { cls: 'world-map-body' }, cv, h('div', { cls: 'world-map-list' }, h('div', { cls: 'eyebrow' }, 'Territórios descobertos'), territorios, h('div', { cls: 'eyebrow' }, 'Locais descobertos'), pontos.length ? pontos : h('small', {}, 'Nenhum local descoberto ainda.'),
        h('small', {}, 'Viagem rápida: só a partir de um acampamento, entre acampamentos descobertos. Não há portais: o mundo é contínuo.')))));
  }
  const modalFicha = () => h('div', { cls: 'modal-backdrop' }, h('div', { cls: 'modal-card world-sheet-card' },
    h('div', { cls: 'modal-top' }, h('div', {}, h('div', { cls: 'eyebrow' }, 'Ficha do herói'), h('h2', {}, 'Equipamentos, habilidades e inventário')), h('button', { type: 'button', cls: 'icon-button', title: 'Fechar', onClick: () => acoes.mundoModal(null) }, icone('fechar', 16))),
    h('div', { cls: 'world-sheet-body' }, painel.abasEl, painel.resumo, painel.conteudoAba)));
  // O comércio só é oferecido (e só funciona) em um acampamento válido: `comercio` existe apenas nesse caso.
  const acoesCamp = s => ({ acampar: e => acoes.mundoAcampar(e), ...(lojaDisponivel(s.mundo) ? { comercio: () => acoes.mundoComercio() } : {}) });
  const dModal = ilha(hud.modal, s => s.modal === 'loja' ? 'loja' + JSON.stringify([s.heroi.coins, s.loja.length]) : s.modal === 'camp' ? 'camp' + JSON.stringify([Math.round(s.heroi.hp), Math.round(s.heroi.mana), Math.round(s.heroi.stam), s.heroi.coins, lojaDisponivel(s.mundo), s.log[0]]) : s.modalMundo === 'ficha' ? 'ficha' + JSON.stringify([s.aba, s.heroi, s.diceTick]) : s.modalMundo === 'mapa' ? 'mapa' + JSON.stringify([s.mundo.espaco.tipo, Math.round(s.mundo.heroi.x / 6), Math.round(s.mundo.heroi.z / 6), s.mundo.descobertas.pontos.length, s.mundo._celulas ? s.mundo._celulas.size : s.mundo.descobertas.celulas.length, !!pontoProximo(s.mundo)]) : '',
    s => s.modal === 'camp' ? modalCamp(s.heroi, acoesCamp(s), undefined, () => acoes.mundoFecharCamp())
      : s.modal === 'loja' ? modalLoja(s.heroi, s.loja, acoes) : s.modalMundo === 'ficha' ? modalFicha() : s.modalMundo === 'mapa' ? mapaMundi(s) : h('span'));

  // ---------- minimapa: acompanha o herói (mundo exterior ou interior da dungeon) ----------
  const RAIO_MINI = 60;
  function desenharMinimapa(est) {
    const W = canvasMini.width, c = ctxMini, hr = est.heroi, k = W / (RAIO_MINI * 2), X = x => (x - hr.x + RAIO_MINI) * k, Z = z => (z - hr.z + RAIO_MINI) * k, dg = est.espaco.tipo === 'dungeon';
    c.clearRect(0, 0, W, W); c.fillStyle = dg ? 'rgba(10,8,14,.9)' : 'rgba(14,16,22,.82)'; c.fillRect(0, 0, W, W);
    if (!dg) { // chão: cor do território sob o herói, estradas por cima
      c.fillStyle = REGIOES[est.regiaoId].visual.chao[0] + '55'; c.fillRect(0, 0, W, W); c.strokeStyle = '#b79a63aa'; c.lineWidth = 2.2;
      for (const e of G.ESTRADAS_PONTOS) { c.beginPath(); let aberto = false; for (let j = 0; j < e.pontos.length - 1; j++) { const a = e.pontos[j], b = e.pontos[j + 1]; if (Math.abs(a[0] - hr.x) > RAIO_MINI * 1.5 && Math.abs(b[0] - hr.x) > RAIO_MINI * 1.5) { aberto = false; continue; } if (!aberto) c.moveTo(X(a[0]), Z(a[1])); c.lineTo(X(b[0]), Z(b[1])); aberto = true; } c.stroke(); }
    } else {
      const def = dungeonPorId(est.espaco.id), g = grade(def); c.fillStyle = '#3a3646';
      for (let cz = 0; cz < g.rows; cz++) for (let cx = 0; cx < g.cols; cx++) { if (!g.livre[cz * g.cols + cx]) continue; const x = g.x0 + cx * CELULA, z = g.z0 + cz * CELULA; if (Math.abs(x - hr.x) > RAIO_MINI + 4 || Math.abs(z - hr.z) > RAIO_MINI + 4) continue; c.fillRect(X(x), Z(z), CELULA * k + .6, CELULA * k + .6); }
    }
    const descobertos = new Set(est.descobertas.pontos);
    for (const p of (dg ? [{ id: 'saida', tipo: 'saida', x: dungeonPorId(est.espaco.id).saida.x, z: dungeonPorId(est.espaco.id).saida.z }, ...dungeonPorId(est.espaco.id).baus.filter(b => !est.dungeons[est.espaco.id]?.baus?.[b.id]).map(b => ({ id: b.id, tipo: 'bau', x: b.x, z: b.z }))] : G.PONTOS.filter(q => descobertos.has(q.id)))) {
      if (Math.abs(p.x - hr.x) > RAIO_MINI || Math.abs(p.z - hr.z) > RAIO_MINI) continue; c.fillStyle = p.tipo === 'acampamento' ? '#ffa23a' : p.tipo === 'dungeon' ? '#b58cff' : p.tipo === 'saida' ? '#6fd0ff' : p.tipo === 'bau' ? '#ffd24a' : '#d7d9de';
      c.beginPath(); if (p.tipo === 'dungeon' || p.tipo === 'saida') { c.moveTo(X(p.x), Z(p.z) - 5); c.lineTo(X(p.x) + 4.5, Z(p.z)); c.lineTo(X(p.x), Z(p.z) + 5); c.lineTo(X(p.x) - 4.5, Z(p.z)); c.closePath(); } else if (p.tipo === 'marco' || p.tipo === 'bau') c.rect(X(p.x) - 3, Z(p.z) - 3, 6, 6); else c.arc(X(p.x), Z(p.z), 4, 0, 6.3); c.fill();
    }
    for (const e of inimigosDoEspaco(est)) { if (e.estado === 'morto' || Math.abs(e.x - hr.x) > RAIO_MINI || Math.abs(e.z - hr.z) > RAIO_MINI) continue; c.fillStyle = e.estado === 'persegue' ? '#ff4a3a' : e.estado === 'alerta' ? '#ffd24a' : '#c07a7a'; c.beginPath(); c.arc(X(e.x), Z(e.z), e.chefe ? 5 : 3, 0, 6.3); c.fill(); }
    c.save(); c.translate(W / 2, W / 2); c.rotate(hr.rumo); c.fillStyle = '#7dffb0'; c.beginPath(); c.moveTo(7, 0); c.lineTo(-5, -4.5); c.lineTo(-3, 0); c.lineTo(-5, 4.5); c.closePath(); c.fill(); c.restore();
    c.strokeStyle = 'rgba(255,255,255,.18)'; c.strokeRect(.5, .5, W - 1, W - 1);
  }
  // ---------- prompt contextual ----------
  function textoPrompt(s) {
    const est = s.mundo, pt = pontoProximo(est); if (pt) {
      if (pt.tipo === 'acampamento') return '[E] Acampar (descansar, tratar ferimentos, comerciar)';
      if (pt.tipo === 'dungeon') return `[E] Entrar: ${pt.rotulo}`; if (pt.tipo === 'saida') return '[E] Sair da dungeon e voltar ao mundo aberto'; if (pt.tipo === 'bau') return '[E] Abrir o baú';
    }
    let melhor = null, md = 1e9; for (const e of inimigosDoEspaco(est)) { if (e.estado === 'morto') continue; const d = Math.hypot(e.x - est.heroi.x, e.z - est.heroi.z); if (d < md) { md = d; melhor = e; } }
    if (melhor && md <= 5 && melhor.estado === 'patrulha') { const costas = Math.cos(melhor.rumo) * (est.heroi.x - melhor.x) + Math.sin(melhor.rumo) * (est.heroi.z - melhor.z) < 0; return costas ? `[Espaço] Emboscar ${melhor.nome} (golpe surpresa!)` : `[Espaço] Atacar ${melhor.nome} — por trás dá vantagem`; }
    if (melhor && md <= 14 && (melhor.estado === 'alerta' || melhor.estado === 'persegue')) return `${melhor.nome} está te caçando! Fuja (corrida é mais rápida que andar furtivo) ou enfrente.`;
    void noEspaco; return '';
  }
  let toastT = 0;
  function atualizar() {
    const s = estado; if (!s.mundo) return;
    dRegiao(s); dBarras(s); dModal(s); { const m = textoModo(s); if (hud.modo.textContent !== m) hud.modo.textContent = m; } if (s.modalMundo === 'ficha') painel.atualizar(s);
    const t = textoPrompt(s); if (hud.prompt.textContent !== t) hud.prompt.textContent = t; hud.prompt.style.opacity = t ? 1 : 0;
    desenharMinimapa(s.mundo);
    if (toastT && performance.now() > toastT) { hud.toast.style.opacity = 0; toastT = 0; }
  }
  function toast(texto, ms = 2600) { hud.toast.textContent = texto; hud.toast.style.opacity = 1; toastT = performance.now() + ms; }
  return { raiz, host, atualizar, toast, painel: { atualizar: s => painel.atualizar(s) } };
}
