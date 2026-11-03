// Orquestrador do jogo: liga UI ⇄ motor de regras ⇄ áudio ⇄ save. Sem React.
// Fluxo: ação do jogador → rules/combate (puro, com eventos) → atualiza estado → UI/áudio consomem os eventos.
import { h, limpar, icone } from './dom.js';
import { montarCriacao, SELECAO_INICIAL, aparenciaPara } from './criacao.js';
import { montarBatalha } from './batalha.js';
import { montarMundo } from './mundo.js';
import { pedirDefesa } from './defesa.js';
import { CenaMundo } from '../../world/cena.js';
import { criarMundo, derrotarInimigo, aplicarDerrotados, pontoProximo, lojaDisponivel, entrarDungeon, sairDungeon, abrirBau, viajarParaAcampamento, regiao } from '../../rules/mundo.js';
import { dungeonPorId } from '../../rules/dungeon.js';
import * as Geo from '../../rules/geografia.js';
import * as RegrasMundo from '../../rules/mundo.js';
import { REGIOES, PARAMETROS_MUNDO as PM } from '../../data/jogo/mundo.js';
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
import { sortearOrigem } from '../../rules/origem.js';
import { criarCampanha, aplicarOrigem, sanearCampanha } from '../../rules/campanha.js';
import * as Cla from '../../rules/cla.js';

export function iniciarJogo(raiz = document.getElementById('root')) {
  const audio = criarAudio();
  const estado = {
    tela: 'criar', selecao: SELECAO_INICIAL(), combate: null, log: [], aba: 'equipment', modal: null, loja: [], admin: false, rng: (Date.now() ^ 0x9e3779b9) >>> 0, diceTick: 0,
    config: { esquivaAtiva: true }, campanha: criarCampanha(), origemSorteada: null, mundo: null, modalMundo: null, origemMundo: null, agindo: false,
    get heroi() { return this.combate?.heroi; }
  };
  const proxima = () => (estado.rng = (Math.imul(estado.rng, 1664525) + 1013904223) >>> 0);
  const registrar = t => { estado.log = [t, ...estado.log].slice(0, 18); };
  const registrarEventos = ev => { for (const e of ev) if (e.texto) registrar(e.texto); };
  const r1 = v => Math.round(v * 10) / 10;
  // Estado do mundo que vai para o save (v3): posição GLOBAL, espaço (exterior ou dungeon + ponto de retorno), derrotados, tempo e o que foi descoberto.
  const dadosMundo = () => { const m = estado.mundo; return m ? { x: r1(m.heroi.x), z: r1(m.heroi.z), rumo: Math.round(m.heroi.rumo * 100) / 100, espaco: m.espaco, derrotados: m.derrotados, tempo: m.tempo } : null; };
  // Não salva durante a derrota: um save com vida 0 deixava o jogador preso numa batalha sem ações possíveis (corrigido na v27).
  const salvar = () => {
    if (!estado.admin && estado.heroi && estado.combate?.fim !== 'derrota') {
      const m = estado.mundo; Save.salvar({ heroi: estado.heroi, progresso: { rng: estado.rng, mundo: dadosMundo(), descobertas: m ? { territorios: m.descobertas.territorios, pontos: m.descobertas.pontos, celulas: [...(m._celulas || m.descobertas.celulas)] } : null, dungeons: m?.dungeons ?? {}, vasculhado: m?.vasculhado ?? {}, campanha: estado.campanha }, config: estado.config }); rotuloSave();
    }
  };

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
    estado.origemSorteada = sortearOrigem(proxima()); // v29: a origem é sorteada ao abrir a criação; o jogador não escolhe nem re-sorteia
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
    const hr = criarHeroi({ ...estado.selecao, origem: admin ? null : estado.origemSorteada?.id ?? null }, admin); estado.campanha = admin ? criarCampanha() : aplicarOrigem(criarCampanha(), hr.origem); hr.appearance = aparenciaPara(hr.classId, hr.race, hr.branch, estado.selecao.appearance);
    estado.combate = criarCombate({ heroi: hr, inimigo: gerarInimigo(criarRng(proxima()), admin, admin ? 24 : 0), semente: proxima() });
    estado.origemMundo = null; estado.mundo = null;
    if (admin) { estado.log = ['Modo ADM ativado. O chefe final foi invocado diretamente.']; mostrarBatalha(); return; }
    estado.log = ['Você entrou em Dreadcrown. Explore o mundo: ataque por trás para emboscar, fuja do que for forte demais.'];
    estado.mundo = criarMundo({ semente: proxima() }); estado.mundo.vasculhado = {};
    mostrarMundo(); salvar();
  }
  const aplicarDerrotadosMundo = () => aplicarDerrotados(estado.mundo); // usa PARAMETROS_MUNDO.respawnSegundos / respawnDungeonSegundos
  const num = v => Number.isFinite(v) ? v : undefined;
  // Espaço salvo → espaço válido. Uma dungeon desconhecida (save de outra versão) ou sem ponto de retorno cai no exterior: o jogador nunca fica preso.
  const espacoSalvo = e => { if (e?.tipo === 'dungeon' && dungeonPorId(e.id) && Number.isFinite(e.retorno?.x) && Number.isFinite(e.retorno?.z)) return { tipo: 'dungeon', id: e.id, retorno: { x: e.retorno.x, z: e.retorno.z, rumo: num(e.retorno.rumo) ?? 0 } }; return { tipo: 'exterior' }; };
  function continuar() {
    const r = lerSave();
    if (!r.save) { const t = r.erro ? `Não foi possível retomar: o save está inválido (${r.erro}). Crie um novo personagem.` : 'Não há progresso salvo para retomar.'; registrar(t); status.textContent = r.erro ? 'Save inválido (ignorado)' : 'Sem progresso salvo'; (estado.tela === 'batalha' ? tick : () => criacao?.atualizar())(); return; }
    const s = r.save, hr = r.heroi, pr = s.progresso || {};
    estado.admin = false; estado.rng = pr.rng ?? estado.rng; estado.campanha = sanearCampanha(pr.campanha); estado.combate = criarCombate({ heroi: hr, inimigo: gerarInimigo(criarRng(proxima()), false, hr.wins), semente: proxima() });
    estado.config = { ...estado.config, ...(s.config || {}) }; botaoDefesa.textContent = estado.config.esquivaAtiva ? 'Esquiva ativa: ligada' : 'Esquiva ativa: desligada';
    const m = pr.mundo; estado.origemMundo = null; estado.modal = null; // nenhuma interface (loja, acampamento…) é restaurada por um save: sempre se volta jogando
    estado.mundo = criarMundo({ x: num(m?.x), z: num(m?.z), rumo: num(m?.rumo) ?? 0, espaco: espacoSalvo(m?.espaco), derrotados: m?.derrotados && typeof m.derrotados === 'object' ? m.derrotados : {}, tempo: num(m?.tempo) ?? 0, descobertas: pr.descobertas, dungeons: pr.dungeons, semente: proxima() });
    estado.mundo.vasculhado = pr.vasculhado && typeof pr.vasculhado === 'object' ? pr.vasculhado : {}; aplicarDerrotadosMundo();
    estado.log = [`Jornada retomada: ${hr.name}, nível ${hr.level}.`, ...(r.ajustes.length ? [`Save corrigido ao carregar (${r.ajustes.join('; ')}).`] : [])]; mostrarMundo();
  }
  let timerMundo = null;
  function destruirMundo() { clearInterval(timerMundo); timerMundo = null; try { cenaMundo?.destroy(); } catch (e) { console.error(e); } cenaMundo = null; mundoUI = null; }
  const somDoMundo = () => (estado.mundo.espaco.tipo === 'dungeon' || regiao(estado.mundo.regiaoId).tier === 'strong' ? 'exploracao_perigo' : 'exploracao');
  function mostrarMundo() {
    estado.tela = 'mundo'; estado.modal = null; estado.modalMundo = null; criacao = null; batalha = null; destruirMundo();
    mundoUI = montarMundo({ estado, acoes }); limpar(tela).append(mundoUI.raiz);
    audio.ambiente(somDoMundo());
    iniciarCena(); timerMundo = setInterval(() => { if (cenaMundo) cenaMundo.pausado = !!(estado.modal || estado.modalMundo); mundoUI?.atualizar(); }, 120); mundoUI.atualizar();
  }
  async function iniciarCena() {
    const c = new CenaMundo(mundoUI.host, {
      obterMundo: () => estado.mundo, obterHeroi: () => estado.heroi, aoEventos: ev => acoes.mundoEventos(ev), aoInteragir: () => acoes.mundoInteragir(),
      aoMapa: () => acoes.mundoModal(estado.modalMundo === 'mapa' ? null : 'mapa'), aoFicha: () => acoes.mundoModal(estado.modalMundo === 'ficha' ? null : 'ficha'), aoMenu: () => { estado.modal = null; acoes.mundoModal(null); }
    });
    cenaMundo = c; c.carregarEspaco(estado.mundo); const hr = estado.heroi;
    try { await c.definirHeroi({ race: hr.race, cls: hr.classId, br: Math.max(0, BRANCHES[hr.classId].indexOf(hr.branch)) }); } catch (e) { console.error('[mundo] herói 3D falhou', e); }
  }
  // Depois de uma vitória o jogador volta DIRETO à exploração (sem acampamento nem loja automáticos).
  const voltarAoMundo = () => { estado.origemMundo = null; mostrarMundo(); estado.log = [estado.mundo.espaco.tipo === 'dungeon' ? `De volta às ${dungeonPorId(estado.mundo.espaco.id).nome}.` : `De volta a ${regiao(estado.mundo.regiaoId).nome}.`, ...estado.log].slice(0, 18); tick(); };
  /** REGRA DA LOJA (v28): este é o ÚNICO lugar do jogo que abre a loja. Só vale na tela do mundo, com o acampamento aberto e o herói de fato
   *  num acampamento válido do mundo aberto (rules/mundo.js → lojaDisponivel). Chamado apenas pela escolha explícita "Comércio". */
  const abrirLoja = () => {
    if (estado.tela !== 'mundo' || estado.modal !== 'camp' || !lojaDisponivel(estado.mundo)) { registrar('O comércio só está disponível em um acampamento.'); return false; }
    estado.loja = montarLoja(estado.heroi, proxima()).itens; estado.modal = 'loja'; return true;
  };
  // Rede de segurança: se por qualquer caminho a loja ficar "aberta" fora de um acampamento válido, ela é fechada antes de desenhar.
  const tick = () => { if (estado.modal === 'loja' && !(estado.tela === 'mundo' && estado.mundo && lojaDisponivel(estado.mundo))) estado.modal = null; batalha?.atualizar(); mundoUI?.atualizar(); };
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
      if (estado.combate.fim === 'vitoria') { estado.modal = 'vitoria'; if (estado.origemMundo && estado.mundo) derrotarInimigo(estado.mundo, estado.origemMundo.id); salvar(); } // v28: nada de acampamento/loja automáticos; o jogador volta ao mundo quando quiser
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
    /** v30: herói sem clã (e que não perdeu nenhum) escolhe um clã da própria raça; quem já perdeu um só entra em outro com a confiança dele. */
    escolherClan(id) { const r = Cla.entrarNoClan(estado.heroi, estado.campanha, id); if (r.ok) trocarHeroi(r.heroi); aplicar(r, false); salvar(); tick(); },
    pocao(k) { const r = usarPocao(estado.heroi, k); trocarHeroi(r.heroi); aplicar(r); tick(); },
    /** Fecha o resumo da vitória e devolve o jogador ao mundo aberto (ou, no modo ADM, começa outro encontro de teste). */
    continuarAposVitoria() {
      if (estado.modal !== 'vitoria') return; estado.modal = null;
      if (estado.origemMundo) { voltarAoMundo(); return; }
      novoEncontro(false); registrar(`Novo encontro: ameaça ${rotuloTier(tierPorVitorias(estado.heroi.wins))}.`); tick();
    },
    comprar(i) {
      if (estado.modal !== 'loja' || !lojaDisponivel(estado.mundo)) { tick(); return; } // compra só dentro da loja de um acampamento
      const r = comprar(estado.heroi, estado.loja[i]); trocarHeroi(r.heroi); aplicar(r);
      if (r.ok) estado.loja = estado.loja.filter((_, j) => j !== i); mundoUI?.toast(r.eventos[0]?.texto ?? ''); salvar(); tick();
    },
    fecharLoja() { estado.modal = estado.tela === 'mundo' && estado.mundo && lojaDisponivel(estado.mundo) ? 'camp' : null; tick(); }, // volta ao acampamento
    // ----- mundo aberto -----
    mundoCena: () => cenaMundo,
    mundoEventos(ev) {
      for (const e of ev) {
        if (e.tipo === 'alerta') { const i = estado.mundo.inimigos.find(x => x.id === e.id); if (i) mundoUI?.toast(`${i.nome} notou você!`); }
        if (e.tipo === 'territorio') { mundoUI?.toast(`Você entrou em ${regiao(e.id).nome}.`); audio.ambiente(somDoMundo()); }
        if (e.tipo === 'descoberta' && e.alvo === 'ponto') { mundoUI?.toast(`Descoberto: ${e.rotulo}.`); salvar(); }
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
    /** [E]: age sobre o ponto mais próximo. Acampamento abre o acampamento (a loja só abre pela escolha "Comércio" dentro dele). */
    mundoInteragir() {
      if (estado.tela !== 'mundo' || estado.modal || estado.modalMundo) return; const pt = pontoProximo(estado.mundo); if (!pt) return;
      if (pt.tipo === 'acampamento') { estado.modal = 'camp'; audio.ambiente('acampamento'); if (cenaMundo) cenaMundo.pausado = true; }
      else if (pt.tipo === 'dungeon') { acoes.entrarNaDungeon(pt.dungeon); return; }
      else if (pt.tipo === 'saida') { acoes.sairDaDungeon(); return; }
      else if (pt.tipo === 'bau') { acoes.abrirBau(pt.id); return; }
      tick();
    },
    entrarNaDungeon(id) {
      const r = entrarDungeon(estado.mundo, id); if (!r.ok) return; // a cena detecta a mudança de espaço e carrega o interior
      registrar(`Você entrou em ${r.def.nome}.`); mundoUI?.toast(`${r.def.nome}: cuidado com o que dorme aqui.`); audio.ambiente(somDoMundo()); salvar(); tick();
    },
    sairDaDungeon() {
      const r = sairDungeon(estado.mundo); if (!r.ok) return;
      registrar('Você saiu das catacumbas e voltou ao mundo aberto.'); mundoUI?.toast('De volta ao mundo aberto.'); audio.ambiente(somDoMundo()); salvar(); tick();
    },
    abrirBau(id) {
      const r = abrirBau(estado.mundo, estado.heroi, id, proxima()); aplicar(r); if (r.ok) { trocarHeroi(r.heroi); mundoUI?.toast(r.eventos[r.eventos.length - 1]?.texto ?? 'Baú aberto.'); salvar(); } tick();
    },
    mundoModal(k) { estado.modalMundo = k; if (cenaMundo) cenaMundo.pausado = !!(k || estado.modal); tick(); },
    /** Viagem rápida entre ACAMPAMENTOS já descobertos, só a partir de um acampamento. Não é um portal: não troca de região nem carrega outro mapa. */
    mundoViajar(campId) {
      const r = viajarParaAcampamento(estado.mundo, campId); if (!r.ok) return; estado.modalMundo = null; estado.modal = null;
      if (cenaMundo) { cenaMundo.carregarEspaco(estado.mundo); cenaMundo.pausado = false; } mundoUI?.toast('Você chegou ao acampamento.'); registrar('Viagem rápida entre acampamentos.'); audio.ambiente(somDoMundo()); salvar(); tick();
    },
    /** Ações do acampamento (descansar, lootear, tratar). O acampamento continua aberto depois da ação, para o jogador também poder comerciar. */
    mundoAcampar(escolha) {
      const pt = estado.tela === 'mundo' && estado.modal === 'camp' ? pontoProximo(estado.mundo) : null; if (pt?.tipo !== 'acampamento') return;
      const m = estado.mundo; m.vasculhado ||= {};
      if (escolha === 'vasculhar' && m.vasculhado[pt.id] !== undefined && m.tempo - m.vasculhado[pt.id] < PM.vasculharCampSegundos) {
        registrar('Você já vasculhou este acampamento há pouco: não há mais nada por enquanto.'); tick(); return; // evita farm infinito de moedas (a v27 permitia)
      }
      const r = acampar(estado.heroi, escolha, proxima()); trocarHeroi(r.heroi); aplicar(r); if (escolha === 'vasculhar') m.vasculhado[pt.id] = m.tempo; salvar(); tick();
    },
    /** Escolha explícita "Comércio" dentro do acampamento. */
    mundoComercio() { if (abrirLoja() && cenaMundo) cenaMundo.pausado = true; tick(); },
    mundoFecharCamp() { estado.modal = null; audio.ambiente(somDoMundo()); tick(); },
    retomarSave() { continuar(); },
    temSaveValido: () => !!lerSave().save,
    recriar() { mostrarCriacao(); },
    sairAdmin() { mostrarCriacao(); }
  };
  mostrarCriacao();
  window.__dreadcrown = { estado, acoes, audio, Save, novoEncontro, cena: () => cenaMundo, geo: Geo, regrasMundo: RegrasMundo, regrasHeroi: { criarHeroi, recalcular }, regrasCla: Cla, lojaDisponivel: () => lojaDisponivel(estado.mundo) }; // gancho de testes
  return window.__dreadcrown;
}
