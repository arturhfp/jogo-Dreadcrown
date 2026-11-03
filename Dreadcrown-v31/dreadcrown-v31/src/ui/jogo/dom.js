// Mini-biblioteca de DOM (substitui o React). h("div", {cls:"x", onClick: fn}, filhos...)
export function h(tag, props = {}, ...filhos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'cls') el.className = v;
    else if (k === 'estilo') Object.assign(el.style, v);
    else if (k === 'testid') el.setAttribute('data-testid', v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value' || k === 'disabled' || k === 'checked' || k === 'selected') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  anexar(el, filhos); return el;
}
function anexar(el, filhos) {
  for (const f of filhos.flat(Infinity)) { if (f === null || f === undefined || f === false) continue; el.append(f instanceof Node ? f : document.createTextNode(String(f))); }
}
export const limpar = el => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
// "Ilha": área que só é redesenhada quando a assinatura (string) muda. Mantém nós vizinhos (ex.: palco 3D) intactos.
export function ilha(container, assinatura, desenhar) {
  let ultima = null;
  return dados => { const s = assinatura(dados); if (s === ultima) return; ultima = s; limpar(container); anexar(container, [desenhar(dados)]); };
}
const ICONES = {
  espada: '<path d="M5 19L17 7M14 4l6 6M4 20l3-1-2-2z"/>', escudo: '<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/>', raio: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  coracao: '<path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6C19 16.5 12 21 12 21z"/>', gota: '<path d="M12 2s6 7 6 12a6 6 0 0 1-12 0c0-5 6-12 6-12z"/>',
  moeda: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 10h6"/>', mochila: '<path d="M6 8a6 6 0 0 1 12 0v12H6zM9 14h6"/>', fogueira: '<path d="M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 3-6 .5 2 1.5 2 2 1z"/>',
  fechar: '<path d="M5 5l14 14M19 5L5 19"/>', marca: '<path d="M5 12l5 5 9-10"/>', estrela: '<path d="M12 2l3 7 7 .6-5.3 4.7 1.7 7.2L12 17.7 5.6 21.5l1.7-7.2L2 9.6 9 9z"/>',
  dado: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="15" r="1"/>', voltar: '<path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3"/>', coroa: '<path d="M3 18l2-10 5 5 2-8 2 8 5-5 2 10z"/>'
};
export function icone(nome, tam = 14) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', tam); s.setAttribute('height', tam); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '1.8'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.innerHTML = ICONES[nome] || ICONES.estrela; return s;
}
