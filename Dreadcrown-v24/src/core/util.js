/* =====================================================================
   Utilitários e acesso ao three.js
   ---------------------------------------------------------------------
   RESPONSABILIDADE: Reúne o three.js embutido no jogo (window.__THREE) e as funções matemáticas/auxiliares usadas por todo o motor 3D. Se o WebGL não existir, T vira um objeto de mentira e ENABLED fica false, para o jogo continuar na versão 2D sem erros.
   RELAÇÃO COM OUTROS MÓDULOS: Não depende de nenhum outro módulo; todos os módulos 3D dependem dele.
   API PÚBLICA: T, ENABLED, V3, TAU, clamp, lerp, rnd, pick, hashStr, isMobile, col, norm, txt.
   REGRAS / CUIDADOS: O three.js NÃO é importado de um pacote: ele já vem dentro do bundle do jogo e é exposto como window.__THREE. Não adicione outra cópia (dobraria o tamanho do arquivo).
   ===================================================================== */

const THREE_GLOBAL = typeof window !== 'undefined' ? window.__THREE : undefined; /* ausente fora do navegador (testes em Node) */
const T = THREE_GLOBAL || new Proxy({}, { get: () => class { } });
const hasGL = () => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } };

const { Vector3, Quaternion, Matrix4, Color, Euler, MathUtils } = T;
const V3 = (x = 0, y = 0, z = 0) => new Vector3(x, y, z);
const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const isMobile = () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width:820px)').matches;
const col = c => (c instanceof Color ? c.clone() : new Color(c));

/* =====================================================================
   Integração com o jogo: palcos (batalha + criador), eventos, coreografia
   ===================================================================== */
const norm = t => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const txt = e => (e && (e.innerText || e.textContent) || '');
/** true quando o three.js e o WebGL estão disponíveis; se false, o jogo segue na versão 2D. */
const ENABLED = !!THREE_GLOBAL && hasGL();


export { Color, ENABLED, Matrix4, Quaternion, T, TAU, V3, Vector3, clamp, col, hashStr, isMobile, lerp, norm, pick, rnd, txt };
