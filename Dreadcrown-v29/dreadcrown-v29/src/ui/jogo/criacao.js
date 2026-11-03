// Tela de criação de personagem (raça, classe, ramificação, arma, aparência).
// Mantém as MESMAS classes CSS/estrutura do jogo original para que o visual e a camada 3D funcionem.
import { h, ilha, icone, limpar } from './dom.js';
import { RACAS } from '../../data/jogo/racas.js';
import { CLASSES } from '../../data/jogo/classes.js';
import { RAMIFICACOES } from '../../data/jogo/ramificacoes.js';
import { raca, classe, armasDaClasse, armaEscolhida } from '../../rules/heroi.js';
import { textoBonus } from '../../data/jogo/origens.js';
import { APARENCIA_PADRAO, OPCOES_APARENCIA, PALETA_CLASSE, ROTULOS_CAMPOS, GRUPOS_EDITOR, CAMPOS_COR, ROTULOS_ABAS } from '../../data/jogo/aparencia.js';

export const SELECAO_INICIAL = () => ({ name: '', race: 'humano', classId: 'tanke', branch: 'Colosso Pesado', weaponId: 'tank-shield', appearance: { ...APARENCIA_PADRAO } });

// Aparência padrão para raça/classe (porta de Fy).
export function aparenciaPara(classeId, racaId, ramificacao, base = APARENCIA_PADRAO) {
  const r = raca(racaId);
  return { ...base, ...PALETA_CLASSE[classeId], skinTone: r.skinOptions[1]?.value ?? r.skinOptions[0].value, raceFeature: r.traits[0], palettePreset: ramificacao ? 'branch' : base.palettePreset };
}
const cartao = ({ selecionado, aoClicar, glifo, titulo, desc, testid, cls = '' }) =>
  h('button', { type: 'button', testid, onClick: aoClicar, cls: `choice-card ${selecionado ? 'selected' : ''} ${cls}` },
    h('span', { cls: 'choice-glyph' }, glifo), h('span', { cls: 'choice-title' }, titulo), h('span', { cls: 'choice-desc' }, desc));

export function montarCriacao({ estado, aoMudar, aoEntrar, aoContinuar, temSave }) {
  const sel = () => estado.selecao;
  const mudar = novo => { estado.selecao = { ...sel(), ...novo }; aoMudar(); };
  const escolherRaca = id => { const r = raca(id), w = armaEscolhida(sel().classId, id); mudar({ race: id, weaponId: w.id, appearance: aparenciaPara(sel().classId, id, sel().branch, sel().appearance) }); };
  const escolherClasse = id => { const b = classe(id).branches[0]; mudar({ classId: id, branch: b, weaponId: armaEscolhida(id, sel().race).id, appearance: aparenciaPara(id, sel().race, b, sel().appearance) }); };

  const nome = h('input', { id: 'hero-name', testid: 'input-hero-name', cls: 'name-input', value: sel().name, placeholder: 'Dê um nome ao impossível', maxlength: 28,
    onInput: e => { estado.selecao.name = e.target.value; botao.disabled = !estado.selecao.name.trim(); aoMudar(true); } });
  const botao = h('button', { type: 'button', testid: 'button-enter-abyss', cls: 'primary-button', disabled: !sel().name.trim(), onClick: aoEntrar }, icone('raio', 15), ' Entrar em Dreadcrown');
  const escolhas = h('div', { cls: 'creation-choices' });
  // v29: origem sorteada (o jogador não escolhe). Fica numa área própria para não ser apagada ao redesenhar as escolhas.
  const origemHost = h('div', { cls: 'origin-card', testid: 'origin-card' });
  const desenharOrigem = () => { const o = estado.origemSorteada; limpar(origemHost); if (o) origemHost.append(h('span', { cls: 'field-label' }, 'Origem sorteada'), h('strong', { testid: 'origin-name' }, o.nome), h('span', { cls: 'origin-bonus', testid: 'origin-bonus' }, textoBonus(o)), h('small', {}, o.historia)); };
  const editor = h('div', { cls: 'appearance-editor-host' });
  let aba = 'body';

  const desenharEscolhas = ilha(escolhas, s => JSON.stringify([s.race, s.classId, s.branch, s.weaponId]), s => {
    const r = raca(s.race), c = classe(s.classId);
    return h('div', {},
      h('div', { cls: 'section-rule' }), h('span', { cls: 'field-label' }, 'Raça'),
      h('div', { cls: 'choice-grid races' }, RACAS.map(p => cartao({ testid: `button-race-${p.id}`, selecionado: s.race === p.id, aoClicar: () => escolherRaca(p.id), glifo: p.name.slice(0, 1), titulo: p.name, desc: `Vida +${p.hp} · Mana +${p.mana} · ${p.passive}` }))),
      h('div', { cls: 'section-rule' }), h('span', { cls: 'field-label' }, 'Classe / disciplina'),
      h('div', { cls: 'class-list' }, CLASSES.map(p => cartao({ testid: `button-class-${p.id}`, selecionado: s.classId === p.id, aoClicar: () => escolherClasse(p.id), glifo: p.name.slice(0, 1), titulo: p.name, desc: `${p.desc} Vida +${p.hp} · Mana +${p.mana}`, cls: 'class-card' }))),
      h('div', { cls: 'section-rule' }), h('span', { cls: 'field-label' }, 'Ramificação'),
      h('div', { cls: 'branch-row' }, c.branches.map((p, i) => cartao({ testid: `button-branch-${p}`, selecionado: s.branch === p, aoClicar: () => mudar({ branch: p, appearance: aparenciaPara(s.classId, s.race, p, s.appearance) }), glifo: `0${i + 1}`, titulo: p, desc: RAMIFICACOES[p]?.desc ?? 'Especialização da classe', cls: 'branch' }))),
      h('div', { cls: 'section-rule' }), h('span', { cls: 'field-label' }, `Arma inicial · ${r.large ? 'porte grande' : 'porte normal'}`),
      h('div', { cls: 'weapon-choices' }, armasDaClasse(s.classId, r.large).filter(p => !p.rarityId || p.rarityId === 'common').map(p =>
        h('button', { type: 'button', cls: `weapon-choice ${s.weaponId === p.id ? 'selected' : ''}`, onClick: () => mudar({ weaponId: p.id }) },
          h('span', {}, h('strong', {}, p.name), h('small', {}, p.desc), h('em', {}, `+${p.bonus} dano · ${p.rarity}`)), s.weaponId === p.id && icone('marca', 15)))));
  });

  const desenharEditor = ilha(editor, s => JSON.stringify([s.appearance, s.race, s.classId, aba]), s => {
    const ap = s.appearance, opcoes = campo => campo === 'skinTone' ? raca(s.race).skinOptions.map(x => x.value) : campo === 'raceFeature' ? raca(s.race).traits : (OPCOES_APARENCIA[campo] ?? []);
    const rotulo = (campo, v) => campo === 'skinTone' ? (raca(s.race).skinOptions.find(x => x.value === v)?.label ?? v) : v;
    const set = (k, v) => { const novo = { ...estado.selecao.appearance, [k]: v }; if (k === 'palettePreset' && v !== 'Personalizada') Object.assign(novo, PALETA_CLASSE[s.classId]); estado.selecao = { ...estado.selecao, appearance: novo }; aoMudar(); };
    return h('div', { cls: 'appearance-editor' },
      h('div', { cls: 'editor-heading' }, h('div', {}, h('span', { cls: 'eyebrow' }, 'Editor de aparência'), h('strong', {}, 'Seu personagem é parte da batalha'), h('small', {}, 'Corpo, rosto, cabelo e equipamento aparecem na arena 3D.')),
        h('div', { cls: 'editor-actions' },
          h('button', { type: 'button', cls: 'ghost-button', onClick: () => { const l = OPCOES_APARENCIA.hairStyle; set('hairStyle', l[Math.floor(Math.random() * l.length)]); } }, icone('estrela', 13), ' Aleatorizar'),
          h('button', { type: 'button', cls: 'ghost-button', onClick: () => { estado.selecao = { ...estado.selecao, appearance: { ...estado.selecao.appearance, ...PALETA_CLASSE[s.classId] } }; aoMudar(); } }, 'Cores da classe'))),
      h('div', { cls: 'editor-tabs' }, Object.keys(GRUPOS_EDITOR).map(k => h('button', { type: 'button', cls: `editor-tab ${aba === k ? 'active' : ''}`, onClick: () => { aba = k; atualizar(); } }, ROTULOS_ABAS[k]))),
      h('div', { cls: 'custom-grid' }, GRUPOS_EDITOR[aba].map(campo => {
        const ehCor = CAMPOS_COR.includes(campo), lista = opcoes(campo);
        const atual = lista.includes(ap[campo]) ? ap[campo] : (lista.find(c => c.toLowerCase().startsWith(String(ap[campo]).toLowerCase().slice(0, 4))) ?? lista[0] ?? ap[campo]);
        return h('label', {}, ROTULOS_CAMPOS[campo], ehCor ? h('input', { type: 'color', value: ap[campo], onInput: e => set(campo, e.target.value) })
          : h('select', { onChange: e => set(campo, e.target.value) }, !lista.includes(atual) && h('option', { value: ap[campo] }, rotulo(campo, ap[campo])), lista.map(c => h('option', { value: c, selected: c === atual }, rotulo(campo, c)))));
      })));
  });

  // arena de prévia (persistente: o palco 3D se prende a ela)
  const campos = { nome: h('div', { cls: 'boss-name' }), nivel: h('div', { cls: 'boss-level' }), arma: h('span') };
  const arena = h('div', { cls: 'arena-frame creator-arena' },
    h('div', { cls: 'arena-overlay' },
      h('div', { cls: 'arena-topline' }, h('div', {}, h('div', { cls: 'boss-tag' }, 'Prévia 3D · atualização instantânea'), campos.nome, campos.nivel), h('div', { cls: 'arena-readout' }, h('strong', {}, '∞'), h('span', {}, 'FORMA'))),
      h('div', { cls: 'arena-bottom' }, h('div', { cls: 'codex-stamp' }, 'Constructo vinculado', h('br'), campos.arma), h('div', { cls: 'arena-hint' }, 'Arraste a arena para observar o personagem. O mesmo modelo entra na batalha.'))));
  const texto = (el, t) => { if (el.textContent !== t) el.textContent = t; };

  const raiz = h('div', { cls: 'layout-grid creation-layout' },
    h('section', { cls: 'left-rail' },
      h('div', { cls: 'eyebrow' }, 'Criação de personagem / v13'), h('h1', { cls: 'page-heading' }, 'Construa seu aventureiro.'),
      h('p', { cls: 'page-intro' }, 'Escolha o que resta de você antes de cruzar o limiar. Raça, classe, ramificação e arsenal mudam suas possibilidades reais.'),
      h('div', { cls: 'stepper' }, h('div', { cls: 'step active' }, h('span', { cls: 'step-number' }, '01'), ' Identidade'), h('div', { cls: 'step' }, h('span', { cls: 'step-number' }, '02'), ' Arsenal'), h('div', { cls: 'step' }, h('span', { cls: 'step-number' }, '03'), ' Arena')),
      h('label', { cls: 'field-label', for: 'hero-name' }, 'Nome do aventureiro'), nome, origemHost, escolhas,
      h('div', { cls: 'balance-note' }, h('b', {}, 'Balanceamento v13:'), ' Vida, mana e stamina combinam o bônus da raça com a reserva da classe. Raças resistentes sustentam mais golpes; conjuradores recebem mana; classes ágeis recebem stamina.'),
      botao, temSave() && h('button', { type: 'button', cls: 'ghost-button', testid: 'button-continue', onClick: aoContinuar }, icone('voltar', 13), ' Continuar jornada salva')),
    h('main', { cls: 'right-rail' }, arena), editor);

  function atualizar() {
    const s = sel(), r = raca(s.race), c = classe(s.classId);
    desenharEscolhas(s); desenharEditor(s); desenharOrigem();
    texto(campos.nome, s.name || 'Arauto sem nome'); texto(campos.nivel, `${r.name} · ${c.name} · ${s.branch}`); texto(campos.arma, armaEscolhida(s.classId, s.race, s.weaponId).name);
    botao.disabled = !s.name.trim();
  }
  atualizar();
  return { raiz, atualizar };
}
