// Orquestrador do jogo: liga UI ⇄ motor de regras ⇄ áudio ⇄ save. Sem React.
// Fluxo: ação do jogador → rules/combate (puro, com eventos) → atualiza estado → UI/áudio consomem os eventos.
import { h, limpar, icone } from './dom.js';
import { montarCriacao, SELECAO_INICIAL, aparenciaPara } from './criacao.js';
import { montarBatalha } from './batalha.js';
import { criarHeroi, recalcular, bonusEquipamento } from '../../rules/heroi.js';
import { criarCombate, executarAcao } from '../../rules/combate.js';
import { gerarInimigo, rotuloTier, tierPorVitorias } from '../../rules/inimigos.js';
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
    get heroi() { return this.combate?.heroi; }
  };
  const proxima = () => (estado.rng = (Math.imul(estado.rng, 1664525) + 1013904223) >>> 0);
  const registrar = t => { estado.log = [t, ...estado.log].slice(0, 18); };
  const registrarEventos = ev => { for (const e of ev) if (e.texto) registrar(e.texto); };
  const salvar = () => { if (!estado.admin && estado.heroi) { Save.salvar({ heroi: estado.heroi, progresso: { rng: estado.rng } }); rotuloSave(); } };

  const status = h('span', { cls: 'meta-status' });
  const rotuloSave = () => { status.textContent = Save.carregar() ? 'Progresso salvo neste navegador' : 'Sem progresso salvo'; };
  const botaoSom = h('button', { type: 'button', cls: 'ghost-button', testid: 'button-sound', onClick: () => { audio.destravar(); audio.silenciar(!audio.silenciado); botaoSom.textContent = audio.silenciado ? 'Som: desligado' : 'Som: ligado'; } }, 'Som: ligado');
  const botaoAdm = h('button', { type: 'button', testid: 'button-admin-mode', cls: 'admin-button', onClick: () => entrar(true) }, icone('raio', 12), ' Modo ADM');
  const tela = h('div', { cls: 'tela-host' });
  raiz.append(h('div', { cls: 'abismo-app' }, h('div', { cls: 'app-shell' },
    h('header', { cls: 'topbar' },
      h('div', { cls: 'brand-lockup' }, h('div', { cls: 'brand-mark' }, icone('coroa', 20)), h('div', {}, h('div', { cls: 'brand-title' }, 'Dreadcrown'), h('div', { cls: 'brand-subtitle' }, 'codex de batalha // edição 03'))),
      h('div', { cls: 'topbar-meta' }, status, botaoSom, botaoAdm)), tela)));
  rotuloSave();
  document.title = 'Dreadcrown';
  document.addEventListener('pointerdown', () => audio.destravar(), { once: true });
  document.addEventListener('keydown', () => audio.destravar(), { once: true });

  let criacao = null, batalha = null;
  const contextoSom = () => ({ tema: estado.heroi ? temaDaRamificacao(estado.heroi.branch) : 'physical' });
  const aplicar = (r, somEventos = true) => { registrarEventos(r.eventos); if (somEventos) audio.tocarEventos(r.eventos, contextoSom()); };

  function mostrarCriacao() {
    estado.tela = 'criar'; estado.modal = null; estado.admin = false; audio.ambiente('menu');
    criacao = montarCriacao({ estado, aoMudar: () => criacao.atualizar(), aoEntrar: () => entrar(false), aoContinuar: continuar, temSave: () => !!Save.carregar() });
    limpar(tela).append(criacao.raiz); batalha = null;
  }
  function novoEncontro(chefe = false) {
    const inim = gerarInimigo(criarRng(proxima()), chefe, estado.heroi.wins);
    estado.combate = criarCombate({ heroi: estado.heroi, inimigo: inim, semente: proxima() });
  }
  function mostrarBatalha() {
    estado.tela = 'batalha'; estado.aba = 'equipment'; criacao = null;
    batalha = montarBatalha({ estado, acoes }); limpar(tela).append(batalha.raiz); batalha.atualizar();
    audio.ambiente(estado.admin ? 'chefe' : 'batalha');
  }
  function entrar(admin) {
    estado.admin = admin; audio.destravar();
    const hr = criarHeroi(estado.selecao, admin); hr.appearance = aparenciaPara(hr.classId, hr.race, hr.branch, estado.selecao.appearance);
    estado.combate = criarCombate({ heroi: hr, inimigo: gerarInimigo(criarRng(proxima()), admin, admin ? 24 : 0), semente: proxima() });
    estado.log = [admin ? 'Modo ADM ativado. O chefe final foi invocado diretamente.' : 'Você entrou em Dreadcrown. Os primeiros encontros serão de ameaça FRACA.'];
    mostrarBatalha(); if (!admin) salvar();
  }
  function continuar() {
    const s = Save.carregar(); if (!s) return;
    estado.admin = false; estado.rng = s.progresso?.rng ?? estado.rng; estado.combate = criarCombate({ heroi: s.heroi, inimigo: gerarInimigo(criarRng(proxima()), false, s.heroi.wins), semente: proxima() });
    estado.log = [`Jornada retomada: ${s.heroi.name}, nível ${s.heroi.level}.`]; mostrarBatalha();
  }
  const tick = () => batalha?.atualizar();
  const trocarHeroi = novo => { estado.combate = { ...estado.combate, heroi: novo }; };

  const acoes = {
    aba(k) { estado.aba = k; tick(); },
    registrar(t) { registrar(t); estado.diceTick++; tick(); },
    agir(a) {
      let acao = a === 'basic' ? { tipo: 'basico' } : a === 'dodge' ? { tipo: 'esquivar' } : a === 'ultimate' ? { tipo: 'suprema' } : { tipo: 'habilidade', raridade: a.split(':')[1] };
      const r = executarAcao(estado.combate, acao); estado.combate = r.combate; aplicar(r);
      if (estado.combate.fim === 'vitoria') { estado.modal = 'camp'; audio.ambiente('acampamento'); salvar(); }
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
        novoEncontro(false); registrar(`Novo encontro: ameaça ${rotuloTier(tierPorVitorias(estado.heroi.wins))}.`);
        if (r.abreLoja) { estado.loja = montarLoja(estado.heroi, proxima()).itens; estado.modal = 'loja'; }
        tick();
      }, 320);
    },
    comprar(i) {
      const r = comprar(estado.heroi, estado.loja[i]); trocarHeroi(r.heroi); aplicar(r);
      if (r.ok) estado.loja = estado.loja.filter((_, j) => j !== i); salvar(); tick();
    },
    fecharLoja() { estado.modal = null; tick(); },
    recriar() { mostrarCriacao(); },
    sairAdmin() { mostrarCriacao(); }
  };
  mostrarCriacao();
  window.__dreadcrown = { estado, acoes, audio, Save, novoEncontro };
  return window.__dreadcrown;
}
