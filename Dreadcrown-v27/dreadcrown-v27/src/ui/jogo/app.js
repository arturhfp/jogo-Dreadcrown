// Orquestrador do jogo: liga UI ⇄ motor de regras ⇄ áudio ⇄ save. Sem React.
// Fluxo: ação do jogador → rules/combate (puro, com eventos) → atualiza estado → UI/áudio consomem os eventos.
import { h, limpar, icone } from './dom.js';
import { montarCriacao, SELECAO_INICIAL, aparenciaPara } from './criacao.js';
import { montarBatalha } from './batalha.js';
import { montarMundo } from './mundo.js';
import { pedirDefesa } from './defesa.js';
import { CenaMundo } from '../../world/cena.js';
import { criarMundo, trocarRegiao, derrotarInimigo, aplicarDerrotados, pontoProximo, portalLiberado, regiao } from '../../rules/mundo.js';
import { REGIAO_INICIAL, REGIOES } from '../../data/jogo/mundo.js';
import { BRANCHES } from '../../data/catalogo.js';
import { criarHeroi, recalcular, bonusEquipamento } from '../../rules/heroi.js';
import { criarCombate, executarAcao } from '../../rules/combate.js';
import { gerarInimigo, inimigoPorNome, rotuloTier, tierPorVitorias } from '../../rules/inimigos.js';
import { acampar, montarLoja, comprar, usarPocao } from '../../rules/acampamento.js';
import { equipamentoPorId } from '../../rules/equipamentos.js';
import { gerarHabilidades } from '../../rules/habilidades.js';
import { temaDaRamificacao } from '../../rules/efeitos.js';
import { NIVEL_DESBLOQUEIO, ROTULO_RARIDADE } from '../../data/jogo/habilidades-oficiais.js';
import { criarRng } from '../../core/rng.js';
import { criarAudio } from '../../audio/sintetizador.js';
import * as Save from '../../state/save.js';

export function iniciarJogo(raiz = document.getElementById('root')) {
  const audio = criarAudio();
  const estado = {
    tela: 'criar', selecao: SELECAO_INICIAL(), combate: null, log: [], aba: 'equipment', modal: null, loja: [], admin: false, rng: (Date.now() ^ 0x9e3779b9) >>> 0, diceTick: 0,
    config: { esquivaAtiva: true }, mundo: null, visitadas: [], modalMundo: null, origemMundo: null, agindo: false,
    get heroi() { return this.combate?.heroi; }
  };
  const proxima = () => (estado.rng = (Math.imul(estado.rng, 1664525) + 1013904223) >>> 0);
  const registrar = t => { estado.log = [t, ...estado.log].slice(0, 18); };
  const registrarEventos = ev => { for (const e of ev) if (e.texto) registrar(e.texto); };
  const dadosMundo = () => estado.mundo ? { regiaoId: estado.mundo.regiaoId, x: Math.round(estado.mundo.heroi.x * 10) / 10, z: Math.round(estado.mundo.heroi.z * 10) / 10, derrotados: estado.mundo.derrotados, tempo: estado.mundo.tempo } : null;
  // Não salva durante a derrota: um save com vida 0 deixava o jogador preso numa batalha sem ações possíveis (corrigido na v27).
  const salvar = () => { if (!estado.admin && estado.heroi && estado.combate?.fim !== 'derrota') { Save.salvar({ heroi: estado.heroi, progresso: { rng: estado.rng, mundo: dadosMundo(), visitadas: estado.visitadas }, config: estado.config }); rotuloSave(); } };

  const status = h('span', { cls: 'meta-status' });
  // Save utilizável = existe, migra sem erro e o herói passa na validação. Devolve { save, heroi, ajustes } ou { erro }.
  const lerSave = () => {
    let s = null; try { s = Save.carregar(); } catch { s = null; }
    if (!s) return { erro: null };
    const motivo = Save.motivoHeroiInvalido(s.heroi); if (motivo) return { erro: motivo };
    const { heroi, ajustes } = Save.sanitizarHeroi(s.heroi); return { save: s, heroi, ajustes };
  };
  const rotuloSave = () => { const r = lerSave(); status.textContent = r.save ? 'Progresso salvo neste navegador' : r.erro ? 'Save inválido (ignorado)' : 'Sem progresso salvo'; };
  const botaoSom = h('button', { type: 'button', cls: 'ghost-button', testid: 'button-sound', onClick: () => { audio.destravar(); audio.silenciar(!audio.silenciado); botaoSom.textContent = audio.silenciado ? 'Som: desligado' : 'Som: ligado'; } }, 'Som: ligado');
  const botaoDefesa = h('button', { type: 'button', cls: 'ghost-button', testid: 'button-active-dodge', title: 'Esquiva ativa: aperte ESPAÇO no instante certo para reduzir o dano do inimigo', onClick: () => { estado.config.esquivaAtiva = !estado.config.esquivaAtiva; botaoDefesa.textContent = estado.config.esquivaAtiva ? 'Esquiva ativa: ligada' : 'Esquiva ativa: desligada'; salvar(); } }, 'Esquiva ativa: ligada');
  const botaoAdm = h('button', { type: 'button', testid: 'button-admin-mode', cls: 'admin-button', onClick: () => entrar(true) }, icone('raio', 12), ' Modo ADM');
  const tela = h('div', { cls: 'tela-host' });
  raiz.append(h('div', { cls: 'abismo-app' }, h('div', { cls: 'app-shell' },
    h('header', { cls: 'topbar' },
      h('div', { cls: 'brand-lockup' }, h('div', { cls: 'brand-mark' }, icone('coroa', 20)), h('div', {}, h('div', { cls: 'brand-title' }, 'Dreadcrown'), h('div', { cls: 'brand-subtitle' }, 'codex de batalha // edição 03'))),
      h('div', { cls: 'topbar-meta' }, status, botaoDefesa, botaoSom, botaoAdm)), tela)));
  rotuloSave();
  document.title = 'Dreadcrown';
  document.addEventListener('visibilitychange', () => { if (document.hidden && estado.tela === 'mundo' && estado.mundo) salvar(); });
  window.addEventListener('pagehide', () => { if (estado.tela === 'mundo' && estado.mundo) salvar(); });
  document.addEventListener('pointerdown', () => audio.destravar(), { once: true });
  document.addEventListener('keydown', () => audio.destravar(), { once: true });

  let criacao = null, batalha = null, mundoUI = null, cenaMundo = null;
  const contextoSom = () => ({ tema: estado.heroi ? temaDaRamificacao(estado.heroi.branch) : 'physical' });
  const aplicar = (r, somEventos = true) => { registrarEventos(r.eventos); if (somEventos) audio.tocarEventos(r.eventos, contextoSom()); };

  function mostrarCriacao() {
    estado.tela = 'criar'; estado.modal = null; estado.admin = false; audio.ambiente('menu');
    criacao = montarCriacao({ estado, aoMudar: () => criacao.atualizar(), aoEntrar: () => entrar(false), aoContinuar: continuar, temSave: () => !!lerSave().save });
    limpar(tela).append(criacao.raiz); batalha = null; destruirMundo();
  }
  function novoEncontro(chefe = false) {
    const inim = gerarInimigo(criarRng(proxima()), chefe, estado.heroi.wins);
    estado.combate = criarCombate({ heroi: estado.heroi, inimigo: inim, semente: proxima() });
  }
  function mostrarBatalha() {
    estado.tela = 'batalha'; estado.aba = 'equipment'; criacao = null; destruirMundo();
    batalha = montarBatalha({ estado, acoes }); limpar(tela).append(batalha.raiz); batalha.atualizar();
    audio.ambiente(estado.admin || estado.origemMundo?.id?.endsWith(':boss') ? 'chefe' : 'batalha');
  }
  function entrar(admin) {
    estado.admin = admin; audio.destravar();
    const hr = criarHeroi(estado.selecao, admin); hr.appearance = aparenciaPara(hr.classId, hr.race, hr.branch, estado.selecao.appearance);
    estado.combate = criarCombate({ heroi: hr, inimigo: gerarInimigo(criarRng(proxima()), admin, admin ? 24 : 0), semente: proxima() });
    estado.origemMundo = null; estado.mundo = null;
    if (admin) { estado.log = ['Modo ADM ativado. O chefe final foi invocado diretamente.']; mostrarBatalha(); return; }
    estado.log = ['Você entrou em Dreadcrown. Explore o mundo: ataque por trás para emboscar, fuja do que for forte demais.'];
    estado.visitadas = [REGIAO_INICIAL]; estado.mundo = criarMundo({ regiaoId: REGIAO_INICIAL, semente: proxima() });
    mostrarMundo(); salvar();
  }
  const REGIOES_OK = id => !!REGIOES[id];
  const aplicarDerrotadosMundo = () => aplicarDerrotados(estado.mundo); // usa PARAMETROS_MUNDO.respawnSegundos (antes havia um 150 duplicado aqui)
  function continuar() {
    const r = lerSave();
    if (!r.save) { const t = r.erro ? `Não foi possível retomar: o save está inválido (${r.erro}). Crie um novo personagem.` : 'Não há progresso salvo para retomar.'; registrar(t); status.textContent = r.erro ? 'Save inválido (ignorado)' : 'Sem progresso salvo'; (estado.tela === 'batalha' ? tick : () => criacao?.atualizar())(); return; }
    const s = r.save, hr = r.heroi;
    estado.admin = false; estado.rng = s.progresso?.rng ?? estado.rng; estado.combate = criarCombate({ heroi: hr, inimigo: gerarInimigo(criarRng(proxima()), false, hr.wins), semente: proxima() });
    estado.config = { ...estado.config, ...(s.config || {}) }; botaoDefesa.textContent = estado.config.esquivaAtiva ? 'Esquiva ativa: ligada' : 'Esquiva ativa: desligada';
    const m = s.progresso?.mundo, rid = m && REGIOES_OK(m.regiaoId) ? m.regiaoId : REGIAO_INICIAL; estado.origemMundo = null;
    estado.visitadas = (s.progresso?.visitadas || []).filter(REGIOES_OK); if (!estado.visitadas.length) estado.visitadas = [rid];
    estado.mundo = criarMundo({ regiaoId: rid, x: Number.isFinite(m?.x) ? m.x : undefined, z: Number.isFinite(m?.z) ? m.z : undefined, derrotados: m?.derrotados || {}, semente: proxima() }); if (m?.tempo) estado.mundo.tempo = m.tempo; aplicarDerrotadosMundo();
    estado.log = [`Jornada retomada: ${hr.name}, nível ${hr.level}.`, ...(r.ajustes.length ? [`Save corrigido ao carregar (${r.ajustes.join('; ')}).`] : [])]; mostrarMundo();
  }
  let timerMundo = null;
  function destruirMundo() { clearInterval(timerMundo); timerMundo = null; try { cenaMundo?.destroy(); } catch (e) { console.error(e); } cenaMundo = null; mundoUI = null; }
  function mostrarMundo() {
    estado.tela = 'mundo'; estado.modal = null; estado.modalMundo = null; criacao = null; batalha = null; destruirMundo();
    mundoUI = montarMundo({ estado, acoes }); limpar(tela).append(mundoUI.raiz);
    if (!estado.visitadas.includes(estado.mundo.regiaoId)) estado.visitadas.push(estado.mundo.regiaoId);
    audio.ambiente(regiao(estado.mundo.regiaoId).tier === 'strong' ? 'exploracao_perigo' : 'exploracao');
    iniciarCena(); timerMundo = setInterval(() => { if (cenaMundo) cenaMundo.pausado = !!(estado.modal || estado.modalMundo); mundoUI?.atualizar(); }, 120); mundoUI.atualizar();
  }
  async function iniciarCena() {
    const c = new CenaMundo(mundoUI.host, {
      obterMundo: () => estado.mundo, obterHeroi: () => estado.heroi, aoEventos: ev => acoes.mundoEventos(ev), aoInteragir: () => acoes.mundoInteragir(),
      aoMapa: () => acoes.mundoModal(estado.modalMundo === 'mapa' ? null : 'mapa'), aoFicha: () => acoes.mundoModal(estado.modalMundo === 'ficha' ? null : 'ficha'), aoMenu: () => { estado.modal = null; acoes.mundoModal(null); }
    });
    cenaMundo = c; c.carregarRegiao(estado.mundo); const hr = estado.heroi;
    try { await c.definirHeroi({ race: hr.race, cls: hr.classId, br: Math.max(0, BRANCHES[hr.classId].indexOf(hr.branch)) }); } catch (e) { console.error('[mundo] herói 3D falhou', e); }
  }
  const trocarDeRegiao = (destino, rapida) => {
    estado.mundo = trocarRegiao(estado.mundo, destino, { rapida }); if (!estado.visitadas.includes(destino)) estado.visitadas.push(destino);
    if (cenaMundo) { cenaMundo.camInit = false; cenaMundo.carregarRegiao(estado.mundo); }
    audio.ambiente(regiao(destino).tier === 'strong' ? 'exploracao_perigo' : 'exploracao'); mundoUI?.toast(`Você chegou a ${regiao(destino).nome}.`); registrar(`Viagem: ${regiao(destino).nome}.`); salvar(); tick();
  };
  const voltarAoMundo = abreLoja => {
    estado.origemMundo = null; mostrarMundo(); estado.log = [`De volta a ${regiao(estado.mundo.regiaoId).nome}.`, ...estado.log].slice(0, 18);
    if (abreLoja) { estado.loja = montarLoja(estado.heroi, proxima()).itens; estado.modal = 'loja'; } tick();
  };
  const tick = () => { batalha?.atualizar(); mundoUI?.atualizar(); };
  const trocarHeroi = novo => { estado.combate = { ...estado.combate, heroi: novo }; };

  const acoes = {
    aba(k) { estado.aba = k; tick(); },
    registrar(t) { registrar(t); estado.diceTick++; tick(); },
    async agir(a) {
      if (estado.agindo) return;
      const acao = a === 'basic' ? { tipo: 'basico' } : a === 'dodge' ? { tipo: 'esquivar' } : a === 'ultimate' ? { tipo: 'suprema' } : { tipo: 'habilidade', raridade: a.split(':')[1] };
      const c0 = estado.combate; let defesa;
      if (estado.config.esquivaAtiva && acao.tipo !== 'esquivar' && !c0.fim && batalha) {
        // ensaio puro (não altera o estado): só pede a esquiva se o inimigo realmente vai atacar depois desta ação
        const ensaio = executarAcao(c0, acao), pendente = c0.iniciativa === 'avistado' && !c0.iniciativaUsada ? 2 : 1;
        const ataques = ensaio.eventos.filter(e => e.alvo === 'heroi' && (e.tipo === 'dano' || e.tipo === 'esquiva') && e.fonte !== 'suprema' && (e.tipo === 'esquiva' || e.fonte === c0.inimigo.name)).length;
        if (ensaio.eventos[0]?.tipo !== 'recusado' && !ensaio.combate.fim && ataques >= pendente) { estado.agindo = true; try { defesa = await pedirDefesa(batalha.arena, c0.inimigo.name); } finally { estado.agindo = false; } if (estado.tela !== 'batalha') return; }
      }
      const r = executarAcao(estado.combate, { ...acao, defesa }); estado.combate = r.combate; aplicar(r);
      if (estado.combate.fim === 'derrota' && !estado.admin) { estado.modal = 'derrota'; audio.ambiente('menu'); }
      if (estado.combate.fim === 'vitoria') { estado.modal = 'camp'; audio.ambiente('acampamento'); if (estado.origemMundo && estado.mundo) derrotarInimigo(estado.mundo, estado.origemMundo.id); salvar(); }
      tick();
    },
    escolherHabilidade(rar, i) {
      const hr = estado.heroi;
      if (hr.level < NIVEL_DESBLOQUEIO[rar]) { registrar(`A habilidade ${ROTULO_RARIDADE[rar]} ainda está bloqueada pelo nível.`); return tick(); }
      if (hr.selectedSkills[rar] !== null) { registrar(`A habilidade ${ROTULO_RARIDADE[rar]} já foi escolhida e está travada.`); return tick(); }
      trocarHeroi({ ...hr, selectedSkills: { ...hr.selectedSkills, [rar]: i } });
      const hab = gerarHabilidades(hr.branch, rar, hr.race, hr.classId)[i]; registrar(`Você escolheu ${hab.name}. ${hab.description}`); salvar(); tick();
    },
    equipar(id) {
      const hr = estado.heroi, it = equipamentoPorId(id); if (!it) return;
      const atual = hr.equippedGear || { helmet: null, chest: null, boots: null, accessory: null };
      const novoEq = { ...atual, [it.slot]: atual[it.slot] === id ? null : id }, novo = recalcular(hr, novoEq);
      trocarHeroi(novo); if (bonusEquipamento(novo).conjuntosAtivos.length) registrar('✨ Bônus de conjunto ativado: bônus fixos de ARM, Vida e Mana.'); salvar(); tick();
    },
    pocao(k) { const r = usarPocao(estado.heroi, k); trocarHeroi(r.heroi); aplicar(r); tick(); },
    acampar(escolha) {
      const r = acampar(estado.heroi, escolha, proxima()); trocarHeroi(r.heroi); aplicar(r); estado.modal = null; audio.ambiente(estado.admin ? 'chefe' : 'batalha'); tick(); salvar();
      setTimeout(() => {
        if (estado.tela !== 'batalha') return;
        if (estado.origemMundo) { voltarAoMundo(r.abreLoja); return; }
        novoEncontro(false); registrar(`Novo encontro: ameaça ${rotuloTier(tierPorVitorias(estado.heroi.wins))}.`);
        if (r.abreLoja) { estado.loja = montarLoja(estado.heroi, proxima()).itens; estado.modal = 'loja'; }
        tick();
      }, 320);
    },
    comprar(i) {
      const r = comprar(estado.heroi, estado.loja[i]); trocarHeroi(r.heroi); aplicar(r);
      if (r.ok) estado.loja = estado.loja.filter((_, j) => j !== i); mundoUI?.toast(r.eventos[0]?.texto ?? ''); salvar(); tick();
    },
    fecharLoja() { estado.modal = null; tick(); },
    // ----- mundo aberto -----
    mundoCena: () => cenaMundo,
    mundoEventos(ev) {
      for (const e of ev) {
        if (e.tipo === 'alerta') { const i = estado.mundo.inimigos.find(x => x.id === e.id); if (i) mundoUI?.toast(`${i.nome} notou você!`); }
        if (e.tipo === 'encontro') { acoes.iniciarBatalhaDoMundo(e); return; }
      }
    },
    iniciarBatalhaDoMundo(e) {
      if (estado.tela !== 'mundo' || estado.iniciando) return; estado.iniciando = true;
      try {
        estado.origemMundo = { id: e.id, iniciativa: e.iniciativa };
        estado.combate = criarCombate({ heroi: estado.heroi, inimigo: inimigoPorNome(e.nome), semente: proxima(), iniciativa: e.iniciativa });
        estado.log = [e.iniciativa === 'emboscada' ? `Você surpreende ${e.nome} pelas costas!` : e.iniciativa === 'avistado' ? `${e.nome} avistou você e parte para cima!` : `Você enfrenta ${e.nome}.`, ...estado.log].slice(0, 18);
        salvar(); destruirMundo(); mostrarBatalha();
      } finally { estado.iniciando = false; }
    },
    mundoInteragir() {
      if (estado.tela !== 'mundo' || estado.modal || estado.modalMundo) return; const pt = pontoProximo(estado.mundo); if (!pt) return;
      if (pt.tipo === 'acampamento') { estado.modal = 'camp'; audio.ambiente('acampamento'); }
      else if (pt.tipo === 'loja') { estado.loja = montarLoja(estado.heroi, proxima()).itens; estado.modal = 'loja'; }
      else if (pt.tipo === 'portal') { if (!portalLiberado(estado.heroi, pt.para)) { mundoUI?.toast(`Portal selado: exige ${regiao(pt.para).vitoriasMin} vitórias.`); return; } trocarDeRegiao(pt.para, false); return; }
      if (cenaMundo) cenaMundo.pausado = true; tick();
    },
    mundoModal(k) { estado.modalMundo = k; if (cenaMundo) cenaMundo.pausado = !!(k || estado.modal); tick(); },
    mundoViajar(destino) {
      const pt = pontoProximo(estado.mundo); if (pt?.tipo !== 'acampamento' || !portalLiberado(estado.heroi, destino) || !estado.visitadas.includes(destino)) return;
      estado.modalMundo = null; trocarDeRegiao(destino, true); if (cenaMundo) cenaMundo.pausado = false;
    },
    mundoAcampar(escolha) {
      const r = acampar(estado.heroi, escolha, proxima()); trocarHeroi(r.heroi); aplicar(r); estado.modal = null; salvar();
      if (r.abreLoja) { estado.loja = montarLoja(estado.heroi, proxima()).itens; estado.modal = 'loja'; } else audio.ambiente(regiao(estado.mundo.regiaoId).tier === 'strong' ? 'exploracao_perigo' : 'exploracao'); tick();
    },
    mundoFecharCamp() { estado.modal = null; audio.ambiente(regiao(estado.mundo.regiaoId).tier === 'strong' ? 'exploracao_perigo' : 'exploracao'); tick(); },
    retomarSave() { continuar(); },
    temSaveValido: () => !!lerSave().save,
    recriar() { mostrarCriacao(); },
    sairAdmin() { mostrarCriacao(); }
  };
  mostrarCriacao();
  window.__dreadcrown = { estado, acoes, audio, Save, novoEncontro, cena: () => cenaMundo };
  return window.__dreadcrown;
}
