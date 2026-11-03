// Gerador pseudoaleatório determinístico (mulberry32). O estado é um inteiro de 32 bits,
// guardado dentro do estado do jogo: mesma semente + mesmas ações = mesmo resultado
// (replays, testes reproduzíveis, saves consistentes).
export function criarRng(semente = 1) {
  let s = semente >>> 0;
  const rng = {
    get estado() { return s >>> 0; },
    definir(v) { s = v >>> 0; },
    // Float em [0,1)
    proximo() {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    // Inteiro inclusivo [min,max] (equivale ao antigo lu(min,max))
    inteiro(min, max) { return Math.floor(rng.proximo() * (max - min + 1)) + min; },
    escolher(lista) { return lista[rng.inteiro(0, lista.length - 1)]; },
    embaralhar(lista) { const a = lista.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rng.inteiro(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  };
  return rng;
}
