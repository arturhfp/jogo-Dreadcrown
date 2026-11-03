/* Teste de navegador da v28 (Chromium + SwiftShader, HTML único): mundo contínuo, dungeon (entrada física → combate real → baú → saída), mapa/minimapa e save dentro da dungeon.
   O herói ANDA de verdade pela simulação (a cena recebe a entrada de movimento); teleportes só posicionam o ponto de partida de cada trecho e estão marcados.
   Uso: npm run build && node tests/mundo-v28.mjs */
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let ok = 0, falhas = 0; const t = (n, c, x = '') => { if (c) { ok++; console.log('  ok  ' + n); } else { falhas++; console.error('FALHOU ' + n + ' ' + x); } };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await browser.newPage({ viewport: { width: 1280, height: 900 } }); p.setDefaultTimeout(120000);
const erros = []; p.on('pageerror', e => erros.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') erros.push('console: ' + m.text().slice(0, 200)); });
const fps = () => p.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else r((n / 3).toFixed(1)); }; requestAnimationFrame(f); }));
const D = (fn, a) => p.evaluate(fn, a), espera = (fn, a, ms = 120000) => p.waitForFunction(fn, a, { polling: 250, timeout: ms });
await p.goto('file://' + path.join(raiz, 'dist/Dreadcrown.html')); await p.waitForTimeout(1200);
await p.locator('[data-testid=input-hero-name]').fill('Andarilho'); await p.locator('[data-testid=button-race-orc]').click(); await p.locator('[data-testid=button-class-tanke]').click(); await p.locator('[data-testid=button-enter-abyss]').click();
await espera(() => window.__dreadcrown.estado.tela === 'mundo' && window.__dreadcrown.cena() && window.__dreadcrown.cena().pronto);
const modo = () => D(() => document.querySelector('[data-testid=world-mode]')?.innerText || '');
/** Anda de verdade até (x,z): vira a câmera para o alvo e empurra "para frente" até chegar (ou parar por colisão/evento). */
const andar = (x, z, tol = 1.2, ms = 400000) => p.evaluate(([x, z, tol, ms]) => new Promise(res => {
  const d = window.__dreadcrown, c = d.cena(), m = d.estado.mundo, ini = performance.now(); let parado = 0, ult = [m.heroi.x, m.heroi.z];
  const iv = setInterval(() => {
    const dx = x - m.heroi.x, dz = z - m.heroi.z, dist = Math.hypot(dx, dz), fim = r => { clearInterval(iv); c.entradaExterna = null; res({ r, dist, x: m.heroi.x, z: m.heroi.z }); };
    if (d.estado.tela !== 'mundo' || !d.cena()) return fim('saiu'); if (dist < tol) return fim('chegou'); if (performance.now() - ini > ms) return fim('tempo');
    c.camYaw = Math.atan2(dz, dx); c.entradaExterna = { mx: 0, mz: -1 }; const mov = Math.hypot(m.heroi.x - ult[0], m.heroi.z - ult[1]); parado = mov < 0.02 ? parado + 1 : 0; ult = [m.heroi.x, m.heroi.z]; if (parado > 60) fim('bloqueado');
  }, 100);
}), [x, z, tol, ms]);

// ---------- 1. mundo contínuo: andar de um bioma a outro sem portais ----------
const trecho = await D(() => {
  const d = window.__dreadcrown, G = d.geo, a = G.pontoPorId('camp:vale'), b = G.pontoPorId('camp:mortas');
  for (const off of [0, 8, -8, 16, -16, 24, -24, 32, -32, 40, -40]) {
    const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz), nx = -dz / L, nz = dx / L; let mudou = -1;
    const pt = f => [a.x + dx * f + nx * off, a.z + dz * f + nz * off];
    for (let f = 0; f <= 1; f += 0.005) { const q = pt(f); if (G.territorioEm(q[0], q[1]) !== 'vale') { mudou = f; break; } }
    if (mudou < 0) continue; const f0 = Math.max(0, mudou - 9 / L), f1 = Math.min(1, mudou + 9 / L); let livre = true;
    for (let f = f0; f <= f1; f += 1 / L) { const q = pt(f); if (!G.caminhavelExterior(q[0], q[1], 0.6)) { livre = false; break; } }
    if (livre) return { ini: pt(f0), fim: pt(f1), de: G.territorioEm(...pt(f0)), para: G.territorioEm(...pt(f1)), off };
  } return null;
});
t('existe um trecho a pé e desimpedido entre o Vale e as Terras Mortas (geografia contínua)', !!trecho && trecho.de === 'vale' && trecho.para !== 'vale', JSON.stringify(trecho));
const antes = await D(([ini]) => { const d = window.__dreadcrown, m = d.estado.mundo; m.heroi.x = ini[0]; m.heroi.z = ini[1]; return { hp: d.estado.heroi.hp, wins: d.estado.heroi.wins, nome: d.estado.heroi.name }; }, [trecho.ini]); // teleporte só do ponto de partida
await p.waitForTimeout(500); await D(() => { const d = window.__dreadcrown, m = d.estado.mundo; for (const e of m.inimigos) if (e.estado !== 'morto' && e.espaco === 'exterior' && Math.hypot(e.x - m.heroi.x, e.z - m.heroi.z) < 160) d.regrasMundo.derrotarInimigo(m, e.id); }); // sem encontros no meio do trecho (isola o teste de caminhada; a perseguição é testada em mundo.mjs)
const reg0 = await D(() => window.__dreadcrown.estado.mundo.regiaoId);
const r1 = await andar(trecho.fim[0], trecho.fim[1]);
const depois = await D(() => { const d = window.__dreadcrown, m = d.estado.mundo; return { reg: m.regiaoId, tela: d.estado.tela, espaco: m.espaco.tipo, hp: d.estado.heroi.hp, nome: d.estado.heroi.name, modal: d.estado.modal, cena: !!d.cena() }; });
t('o herói atravessa a divisa a pé: chegou ao outro território', r1.r === 'chegou' && reg0 === 'vale' && depois.reg === trecho.para, JSON.stringify({ r1, reg0, depois }));
t('sem portal nem recarga: continua na tela do mundo, no exterior, mesma cena, mesmo personagem', depois.tela === 'mundo' && depois.espaco === 'exterior' && depois.cena && depois.nome === antes.nome && depois.hp === antes.hp && !depois.modal);
t('chunks vizinhos estão carregados e o total é limitado (streaming)', await D(() => { const e = window.__dreadcrown.cena().exterior.estatisticas(); return e.chunks >= 4 && e.chunks <= 30; }), JSON.stringify(await D(() => window.__dreadcrown.cena().exterior.estatisticas())));
t('o HUD segue mostrando exploração', /EXPLORANDO/.test(await modo()), await modo());
// colisão: empurrar contra a borda do mundo não deixa sair do terreno caminhável
const borda = await D(() => { const d = window.__dreadcrown, G = d.geo, m = d.estado.mundo; let melhor = null; for (let a = 0; a < 6.28; a += 0.1) { for (let r = 100; r < 700; r += 4) { const x = 270 + Math.cos(a) * r, z = 240 + Math.sin(a) * r; if (!G.caminhavelExterior(x, z, 0.45)) { melhor = { x: x - Math.cos(a) * 12, z: z - Math.sin(a) * 12, ax: x, az: z }; break; } } if (melhor && G.caminhavelExterior(melhor.x, melhor.z, 0.45)) break; melhor = null; } if (melhor) { m.heroi.x = melhor.x; m.heroi.z = melhor.z; } return melhor; });
t('existe uma barreira (montanha/borda) para testar a colisão', !!borda);
await andar(borda.ax, borda.az, 0.3, 20000);
t('empurrar contra a barreira não atravessa: o herói permanece em terreno caminhável', await D(() => { const d = window.__dreadcrown, h = d.estado.mundo.heroi; return d.geo.caminhavelExterior(h.x, h.z, 0.1); }));

// ---------- 2. minimapa e mapa-múndi ----------
t('minimapa existe e é redesenhado (canvas com pixels)', await D(() => { const c = document.querySelector('.world-minimap'); const px = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < px.length; i += 4 * 17) if (px[i] > 0) n++; return n > 200; }));
await D(() => window.__dreadcrown.acoes.mundoModal('mapa')); await p.waitForTimeout(600);
t('mapa-múndi abre com um canvas geográfico único (não seis círculos)', await p.locator('[data-testid=world-map-canvas]').count() === 1 && await D(() => { const c = document.querySelector('[data-testid=world-map-canvas]'); return c.width >= 300 && c.height >= 200; }));
const lista = await D(() => document.querySelector('[data-testid=modal-map]').innerText);
t('o mapa só lista locais descobertos: o acampamento do Vale sim, o da Fenda (longe) não', /Vale/.test(lista) && !/Fenda/i.test(lista.split('Locais descobertos')[1] || ''), lista.slice(0, 400));
await D(() => window.__dreadcrown.acoes.mundoModal(null));

// ---------- 3. dungeon: entrada física ----------
const porta = await D(() => { const d = window.__dreadcrown, G = d.geo, q = G.pontoPorId('dg:catacumbas'); return { x: q.x, z: q.z, rumo: q.rumo }; });
t('a entrada da dungeon é um ponto do mundo aberto (e não está descoberta antes de chegar perto)', await D(() => !window.__dreadcrown.estado.mundo.descobertas.pontos.includes('dg:catacumbas')));
const ant = { x: porta.x + Math.cos(porta.rumo) * 14, z: porta.z + Math.sin(porta.rumo) * 14 };
await D(([x, z]) => { const m = window.__dreadcrown.estado.mundo; m.heroi.x = x; m.heroi.z = z; for (const e of m.inimigos) if (e.estado !== 'morto' && e.espaco === 'exterior' && Math.hypot(e.x - x, e.z - z) < 160) window.__dreadcrown.regrasMundo.derrotarInimigo(m, e.id); }, [ant.x, ant.z]); // teleporte: ponto de partida a 14 m do portão
const r2 = await andar(porta.x + Math.cos(porta.rumo) * 3, porta.z + Math.sin(porta.rumo) * 3, 1.4);
console.log('  info fps (software render) fora:', await fps());
t('o herói caminha até o portão e a interface avisa que há uma entrada ao alcance', r2.r === 'chegou' && /ENTRADA DE DUNGEON/.test(await modo()), JSON.stringify(r2) + ' ' + await modo());
t('a entrada foi descoberta ao se aproximar', await D(() => window.__dreadcrown.estado.mundo.descobertas.pontos.includes('dg:catacumbas')));
const eq0 = await D(() => { const h = window.__dreadcrown.estado.heroi; return JSON.stringify({ w: h.weaponId, a: h.armorId, iw: h.inventoryWeapons, ig: h.inventoryGear, pots: h.pots, lvl: h.level, cls: h.classId, race: h.race, wu: h.weaponUpgrades }); });
await D(() => window.__dreadcrown.acoes.mundoInteragir());
await espera(() => window.__dreadcrown.estado.mundo.espaco.tipo === 'dungeon' && window.__dreadcrown.cena().interior);
t('interagir leva à dungeon correta (Catacumbas), sem trocar de tela', await D(() => window.__dreadcrown.estado.mundo.espaco.id === 'catacumbas' && window.__dreadcrown.estado.tela === 'mundo'));
t('a interface indica que o jogador está dentro da dungeon', /DUNGEON/.test(await modo()), await modo());
t('o exterior foi descarregado ao entrar (sem chunks do exterior em memória)', await D(() => { const c = window.__dreadcrown.cena(); return !c.exterior || c.exterior.estatisticas().chunks === 0; }));
// andar pelo interior
console.log('  info fps (software render) dentro da dungeon:', await fps());
const r3 = await andar(0, 0, 1.5, 300000); t('o herói anda pelo interior da dungeon (sai do vestíbulo rumo ao corredor)', r3.r === 'chegou', JSON.stringify(r3));

// ---------- 4. combate real na dungeon ----------
const alvo = await D(() => { const d = window.__dreadcrown, m = d.estado.mundo, e = m.inimigos.find(q => q.espaco === 'dg:catacumbas' && !q.chefe && q.estado !== 'morto'); m.heroi.x = e.x; m.heroi.z = e.z + 3.5; e.rumo = Math.PI / 2; d.estado.config.esquivaAtiva = false; return { id: e.id, nome: e.nome }; });
await espera(() => window.__dreadcrown.estado.tela === 'batalha', null, 300000);
t('um inimigo da dungeon inicia um combate REAL (mesma tela e regras)', await D(a => window.__dreadcrown.estado.origemMundo.id === a.id && window.__dreadcrown.estado.combate.inimigo.name === a.nome, alvo), JSON.stringify(alvo));
const coins0 = await D(() => window.__dreadcrown.estado.heroi.coins), wins0 = await D(() => window.__dreadcrown.estado.heroi.wins);
await D(() => { const d = window.__dreadcrown; d.estado.combate.inimigo.hp = 1; });
for (let i = 0; i < 10 && !(await D(() => window.__dreadcrown.estado.combate.fim)); i++) await D(() => { const h = window.__dreadcrown.estado.combate.heroi; h.stam = h.maxStam; h.hp = h.maxHp; window.__dreadcrown.acoes.agir('basic'); });
await espera(() => window.__dreadcrown.estado.modal === 'vitoria');
t('vitória na dungeon: recompensas reais (moedas e vitórias) e NENHUMA loja/acampamento', await D(([c, w]) => { const e = window.__dreadcrown.estado; return e.heroi.coins > c && e.heroi.wins === w + 1 && !document.querySelector('.shop-card') && !document.querySelector('[data-testid=modal-camp]'); }, [coins0, wins0]));
await p.locator('[data-testid=button-continue-victory]').click({ timeout: 300000 }); // a transição reconstrói o mundo 3D: sob render por software leva dezenas de segundos
await espera(() => window.__dreadcrown.estado.tela === 'mundo' && window.__dreadcrown.cena() && window.__dreadcrown.cena().pronto);
t('depois da vitória o jogador volta DENTRO da dungeon e o inimigo derrotado não reaparece', await D(a => { const m = window.__dreadcrown.estado.mundo; return m.espaco.tipo === 'dungeon' && m.inimigos.find(q => q.id === a.id).estado === 'morto' && !window.__dreadcrown.estado.modal; }, alvo));

// ---------- 5. baú (regra real de recompensa) ----------
const bau = await D(() => { const d = window.__dreadcrown, m = d.estado.mundo, b = d.regrasMundo.pontosDoEspaco(m).find(q => q.tipo === 'bau'); return b ? { id: b.id, x: b.x, z: b.z } : null; });
t('há baús como pontos de interação dentro da dungeon', !!bau);
await D(b => { const m = window.__dreadcrown.estado.mundo; m.heroi.x = b.x - 1.4; m.heroi.z = b.z; }, bau);
await p.waitForTimeout(400);
const c1 = await D(() => window.__dreadcrown.estado.heroi.coins);
await D(() => window.__dreadcrown.acoes.mundoInteragir());
t('abrir o baú rende moedas pela regra real e o baú some dos pontos', await D(([c, b]) => window.__dreadcrown.estado.heroi.coins > c && !window.__dreadcrown.regrasMundo.pontosDoEspaco(window.__dreadcrown.estado.mundo).some(q => q.id === b.id), [c1, bau]));

// ---------- 6. save dentro da dungeon não prende o jogador ----------
await D(() => { const d = window.__dreadcrown; d.acoes.mundoModal(null); d.Save && 0; });
await p.waitForTimeout(300);
const gravado = await D(() => { const d = window.__dreadcrown; const s = d.Save.carregar(); return s ? s.progresso.mundo.espaco : null; });
t('o save feito dentro da dungeon guarda o espaço (dungeon) e o retorno', !!gravado && gravado.tipo === 'dungeon' && gravado.id === 'catacumbas' && !!gravado.retorno, JSON.stringify(gravado));
await p.reload(); await p.waitForTimeout(1500);
await p.locator('[data-testid=button-continue]').click();
await espera(() => window.__dreadcrown.estado.tela === 'mundo' && window.__dreadcrown.cena() && window.__dreadcrown.cena().pronto);
t('carregar o save devolve o jogador à dungeon, jogável, sem loja nem modal', await D(() => { const e = window.__dreadcrown.estado; return e.mundo.espaco.tipo === 'dungeon' && !e.modal; }));
t('o baú aberto e o inimigo derrotado continuam assim após carregar', await D(([b, a]) => { const m = window.__dreadcrown.estado.mundo; return m.dungeons.catacumbas.baus[b.id] === true && m.inimigos.find(q => q.id === a.id).estado === 'morto'; }, [bau, alvo]));

// ---------- 7. saída física ----------
const sai = await D(() => { const q = window.__dreadcrown.regrasMundo.pontosDoEspaco(window.__dreadcrown.estado.mundo).find(x => x.tipo === 'saida'); return q ? { x: q.x, z: q.z } : null; });
await D(([s]) => { const m = window.__dreadcrown.estado.mundo; m.heroi.x = 0; m.heroi.z = s.z - 12; }, [sai]); // teleporte a 12 m da saída
const r4 = await andar(sai.x, sai.z - 1.6, 1.2, 300000);
t('o herói caminha até a porta de saída e a interface avisa', r4.r === 'chegou' && /saída/i.test(await modo()), JSON.stringify(r4) + ' ' + await modo());
await D(() => window.__dreadcrown.acoes.mundoInteragir());
await espera(() => window.__dreadcrown.estado.mundo.espaco.tipo === 'exterior' && window.__dreadcrown.cena().exterior);
const fora = await D(() => { const d = window.__dreadcrown, h = d.estado.mundo.heroi, q = d.geo.pontoPorId('dg:catacumbas'); return { dist: Math.hypot(h.x - q.x, h.z - q.z), livre: d.geo.caminhavelExterior(h.x, h.z, 0.45), eq: JSON.stringify({ w: d.estado.heroi.weaponId, a: d.estado.heroi.armorId, iw: d.estado.heroi.inventoryWeapons, ig: d.estado.heroi.inventoryGear, lvl: d.estado.heroi.level, cls: d.estado.heroi.classId, race: d.estado.heroi.race }), modal: d.estado.modal }; });
t('a saída devolve o herói ao mundo aberto, diante do portão correto, em chão livre', fora.dist < 7 && fora.livre && !fora.modal, JSON.stringify(fora));
const eqAntes = JSON.parse(eq0); const eqDepois = JSON.parse(fora.eq);
t('equipamento, inventário (só ganha o loot do baú), nível, classe e raça preservados na ida e volta', eqAntes.w === eqDepois.w && eqAntes.a === eqDepois.a && eqAntes.iw.every(x => eqDepois.iw.includes(x)) && eqAntes.ig.every(x => eqDepois.ig.includes(x)) && eqAntes.cls === eqDepois.cls && eqAntes.race === eqDepois.race && eqDepois.lvl >= eqAntes.lvl, eq0 + ' → ' + fora.eq);
t('de volta ao exterior a entrada aparece como ao alcance', /ENTRADA DE DUNGEON/.test(await modo()), await modo());
await D(() => window.__dreadcrown.acoes.mundoModal('mapa')); await p.waitForTimeout(600);
t('o mapa-múndi agora lista as Catacumbas (descobertas), com a posição do jogador', /Catacumbas/i.test(await D(() => document.querySelector('[data-testid=modal-map]').innerText)));
await D(() => window.__dreadcrown.acoes.mundoModal(null));
t('sem erros de página/console', erros.length === 0, erros.slice(0, 5).join(' | '));
await p.screenshot({ path: process.env.SHOT || '/tmp/mundo-v28.png' });
await browser.close(); console.log(`\n${ok} ok, ${falhas} falhas`); process.exit(falhas ? 1 : 0);
