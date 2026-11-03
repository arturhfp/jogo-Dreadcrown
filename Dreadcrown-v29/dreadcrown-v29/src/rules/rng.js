// Gerador pseudoaleatório determinístico (mulberry32). O estado é um número: dá para salvar,
// repetir uma batalha (replay) e testar sem depender de Math.random.
export class Rng {
  constructor(semente = Date.now() >>> 0) { this.estado = semente >>> 0; }
  /** Número em [0,1). */
  proximo() {
    let t = (this.estado += 0x6D2B79F5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** Inteiro em [min,max] (inclusivo), equivalente ao antigo lu(min,max). */
  inteiro(min, max) { return Math.floor(this.proximo() * (max - min + 1)) + min; }
  /** Embaralha uma cópia do vetor (Fisher–Yates). */
  embaralhar(v) { const a = v.slice(); for (let i = a.length - 1; i > 0; i--) { const j = this.inteiro(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  escolher(v) { return v[this.inteiro(0, v.length - 1)]; }
}
