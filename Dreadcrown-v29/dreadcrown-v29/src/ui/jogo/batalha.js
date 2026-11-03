// Tela de batalha: arena (persistente, hospeda o palco 3D), painéis laterais, ações, modais.
// A UI só LÊ o estado e dispara callbacks; todas as regras vivem em src/rules.
import { KIT_CLASSES } from '../../data/jogo/classes-kit.js';
import { h, ilha, icone } from './dom.js';
import { montarPainelHeroi } from './painel-heroi.js';
import { modalDerrota, modalVitoria } from './modais.js';
import { raca, classe } from '../../rules/heroi.js';
import { RARIDADES, ROTULO_RARIDADE, NIVEL_DESBLOQUEIO } from '../../data/jogo/habilidades-oficiais.js';
import { RAMIFICACOES } from '../../data/jogo/ramificacoes.js';
import { ARMAS } from '../../data/jogo/armas.js';
import { ARMADURAS_BASE } from '../../data/jogo/armaduras-base.js';
import { EQUIPAMENTOS, equipamentoPorId } from '../../rules/equipamentos.js';
import { gerarHabilidades } from '../../rules/habilidades.js';
import { habilidadeEscolhida } from '../../rules/combate.js';
import { bonusEquipamento } from '../../rules/heroi.js';
import { rotuloTier } from '../../rules/inimigos.js';
import { criarRng } from '../../core/rng.js';

const ROTULO_SLOT = { helmet: 'Capacete', chest: 'Armadura', boots: 'Botas', accessory: 'Relíquia' };
const texto = (el, t) => { if (el.textContent !== String(t)) el.textContent = t; };
const arr = n => Math.max(0, Math.round(n));

function medidor(rotulo, valor, max, tipo, ic) {
  return h('div', { cls: 'resource-row' }, h('span', { cls: `resource-icon ${tipo}` }, icone(ic, 13)),
    h('div', {}, h('div', { cls: 'resource-meta' }, h('span', {}, rotulo), h('b', {}, `${arr(valor)} / ${arr(max)}`)),
      h('div', { cls: 'bar-track' }, h('div', { cls: `bar-fill ${tipo}`, estilo: { width: `${Math.max(0, Math.min(100, valor / max * 100))}%` } }))));
}

export function montarBatalha({ estado, acoes }) {
  const el = {
    banner: h('div', { cls: 'admin-banner' }, h('div', {}, h('strong', {}, 'Modo teste do administrador'), h('br'), h('span', {}, 'Arauto maximizado · chefe final · todos os equipamentos compatíveis')),
      h('button', { type: 'button', cls: 'ghost-button', onClick: () => acoes.sairAdmin() }, 'Sair do teste')),
    eyebrow: h('div', { cls: 'eyebrow' }), esquerda: h('div', { cls: 'left-panel-host' }), conteudoAba: h('div', { cls: 'tab-host' }),
    bossTag: h('div', { cls: 'boss-tag' }), bossNome: h('div', { cls: 'boss-name' }), bossNivel: h('div', { cls: 'boss-level' }),
    bossFill: h('div', { cls: 'boss-health-fill' }), bossVida: h('strong', { testid: 'text-boss-health' }), selo: h('span'), turno: h('div', { cls: 'codex-stamp' }),
    opcoes: h('div', { cls: 'battle-options' }), painelCombate: h('div', { cls: 'battle-panels' }), log: h('div', { cls: 'log' }), nota: h('div', { cls: 'combat-note' }), modal: h('div', { cls: 'modal-host' })
  };
  const arena = h('div', { cls: 'arena-frame battle-arena' },
    h('div', { cls: 'arena-overlay' },
      h('div', { cls: 'arena-topline' }, h('div', {}, el.bossTag, el.bossNome, el.bossNivel, h('div', { cls: 'boss-health' }, el.bossFill)), h('div', { cls: 'arena-readout' }, el.bossVida, h('span', {}, 'VITALIDADE'))),
      h('div', { cls: 'arena-bottom' }, el.turno, h('div', { cls: 'arena-hint' }, 'Arraste a arena para observar o constructo. Cada decisão deixa uma marca no codex.'))));
  el.turno.append('Turno ', h('span', { cls: 'turno-n' }), h('br'), el.selo);

  const painel = montarPainelHeroi({ acoes });
  const raiz = h('div', {}, el.banner,
    h('div', { cls: 'layout-grid arena-mode' },
      h('aside', { cls: 'left-rail' }, el.eyebrow, h('h1', { cls: 'page-heading' }, 'A arena respira.'), h('p', { cls: 'page-intro' }, 'O inimigo lê seus movimentos. Escolha uma ação e veja o selo responder.'),
        h('div', { cls: 'section-rule' }), painel.abasEl, painel.resumo, painel.conteudoAba,
        h('button', { type: 'button', cls: 'ghost-button return-create', onClick: () => acoes.recriar() }, icone('voltar', 13), ' Recriar personagem')),
      h('main', { cls: 'right-rail' }, arena, el.opcoes, el.painelCombate,
        h('div', { cls: 'panels' }, h('div', { cls: 'card panel' }, h('p', { cls: 'eyebrow' }, 'Registro de combate'), el.log), h('div', { cls: 'card panel' }, h('p', { cls: 'eyebrow' }, 'Leitura do arauto'), el.nota)))),
    el.modal);

  /* ---------- ilhas ---------- */
  const dOpcoes = ilha(el.opcoes, s => JSON.stringify([s.aba, s.combate.inimigo.hp <= 0, s.heroi.ult, s.combate.fim]), s => {
    const morto = s.combate.inimigo.hp <= 0 || !!s.combate.fim;
    const op = (k, ic, t, sub, extra = {}) => h('button', { type: 'button', cls: `battle-option ${extra.ativo ? 'active' : ''}`, onClick: extra.aoClicar, disabled: extra.disabled }, h('strong', {}, icone(ic, 14), ' ', t), h('small', {}, sub));
    return [op('eq', 'escudo', 'Equipamentos', 'Escolha até 2 peças para o conjunto.', { ativo: s.aba === 'equipment', aoClicar: () => acoes.aba('equipment') }),
      op('sk', 'raio', 'Habilidades', 'Quatro slots, um por raridade.', { aoClicar: () => acoes.aba('skills') }),
      op('dg', 'raio', 'Esquiva', '8 stamina · evita o próximo ataque.', { disabled: morto, aoClicar: () => acoes.agir('dodge') }),
      op('iv', 'mochila', 'Inventário', 'Poções e coleção completa.', { aoClicar: () => acoes.aba('inventory') }),
      op('ul', 'estrela', 'Ultimate', `${s.heroi.ult}/100 Suprema.`, { disabled: s.heroi.ult < 100 || morto, aoClicar: () => acoes.agir('ultimate') })];
  });
  const primeiraEscolhida = hr => { for (const r of RARIDADES) { const x = habilidadeEscolhida(hr, r); if (x) return x; } return null; };
  const dPaineis = ilha(el.painelCombate, s => JSON.stringify([s.heroi.hp, s.heroi.maxHp, s.heroi.mana, s.heroi.maxMana, s.heroi.stam, s.heroi.maxStam, s.heroi.ult, s.heroi.selectedSkills, s.heroi.level, s.combate.inimigo.hp <= 0 || !!s.combate.fim, s.heroi.pots, s.heroi.coins, s.heroi.inventoryWeapons.length]), s => {
    const hr = s.heroi, morto = s.combate.inimigo.hp <= 0 || !!s.combate.fim, sel = primeiraEscolhida(hr);
    const rotuloHab = r => `${RARIDADES.indexOf(r) + 1} · ${habilidadeEscolhida(hr, r)?.name ?? (hr.level < NIVEL_DESBLOQUEIO[r] ? 'Bloqueada · Nv ' + NIVEL_DESBLOQUEIO[r] : 'Escolher habilidade')}`;
    return h('div', { cls: 'battle-panels' },
      h('div', { cls: 'panel combat-panel' }, h('div', { cls: 'panel-heading' }, h('span', {}, 'Recursos de combate'), h('span', { cls: 'turn-label' }, 'TURNO ATUAL')),
        medidor('Vida', hr.hp, hr.maxHp, 'health', 'coracao'), medidor('Mana', hr.mana, hr.maxMana, 'mana', 'gota'), medidor('Stamina', hr.stam, hr.maxStam, 'stamina', 'raio'), medidor('Suprema', hr.ult, 100, 'ultimate', 'estrela'),
        h('div', { cls: 'action-grid' },
          h('button', { type: 'button', testid: 'button-action-attack', cls: 'action-button', disabled: morto, onClick: () => acoes.agir('basic') }, icone('espada', 13), ' Ataque básico'),
          h('button', { type: 'button', testid: 'button-action-dodge', cls: 'action-button', disabled: morto, onClick: () => acoes.agir('dodge') }, icone('raio', 13), ' Esquiva'),
          h('button', { type: 'button', testid: 'button-action-ultimate', cls: 'action-button skill-action', disabled: morto || hr.ult < 100, onClick: () => acoes.agir('ultimate') }, icone('estrela', 13), ' Ultimate'),
          RARIDADES.map(r => h('button', { type: 'button', cls: `action-button rarity-${r}`, title: `Habilidade ${ROTULO_RARIDADE[r]}`, disabled: morto, onClick: () => acoes.agir(`ability:${r}`) }, rotuloHab(r))),
          h('button', { type: 'button', cls: 'action-button', disabled: morto || !sel, onClick: () => sel && acoes.agir(`ability:${sel.rarity}`) }, icone('raio', 13), ' ', sel?.name.split(' · ')[0] ?? 'Escolha uma habilidade'))),
      h('div', { cls: 'panel inventory-panel' }, h('div', { cls: 'inventory-title' }, `Mochila · ${hr.inventoryWeapons.length + hr.inventoryArmors.length + 3} itens`),
        h('div', { cls: 'inventory-list' }, [['Poção de cura', 'x' + hr.pots.life], ['Poção de mana', 'x' + hr.pots.mana], ['Moedas', hr.coins]].map(([a, b]) => h('div', { cls: 'inventory-item' }, h('span', { cls: 'inventory-dot' }), h('span', {}, h('strong', {}, a), h('br'), b))))));
  });
  const dLog = ilha(el.log, s => s.log.join('\u0001'), s => s.log.map(t => h('p', {}, t)));
  const dNota = ilha(el.nota, s => JSON.stringify([s.heroi.weaponId, s.heroi.race, s.heroi.arm, s.heroi.pow, s.heroi.mag, s.heroi.dex]), s => {
    const hr = s.heroi, arma = ARMAS.find(a => a.id === hr.weaponId);
    return h('div', {}, h('strong', {}, arma?.name), h('span', {}, arma?.desc), h('span', {}, 'Passiva racial: ', raca(hr.race).passive), h('span', {}, `Passiva de classe — ${KIT_CLASSES[hr.classId]?.nome}: `, KIT_CLASSES[hr.classId]?.descricao), h('span', {}, `Armadura: ${hr.arm} · Poder: ${hr.pow} · Magia: ${hr.mag} · Destreza: ${hr.dex}`));
  });


  /* ---------- modais ---------- */
  // v28: a batalha só mostra vitória e derrota. Acampamento e loja NÃO existem aqui (só no mundo aberto, ver ui/jogo/mundo.js).
  const dModal = ilha(el.modal, s => s.modal === 'vitoria' ? 'vitoria' + s.log.slice(0, 3).join('|') : s.modal === 'derrota' ? 'derrota' : '',
    s => s.modal === 'derrota' ? modalDerrota(s.heroi, acoes, acoes.temSaveValido()) : s.modal === 'vitoria' ? modalVitoria(s.heroi, s.log.slice(0, 3), acoes, !!s.origemMundo) : h('span'));

  function atualizar() {
    const s = estado, hr = s.heroi, ini = s.combate.inimigo;
    el.banner.style.display = s.admin ? 'flex' : 'none';
    texto(el.eyebrow, `Codex ativo / encontro ${String(hr.wins + 1).padStart(2, '0')}`);
    texto(el.bossTag, `${ini.area} · ameaça ${rotuloTier(ini.tier)}`); texto(el.bossNome, ini.name); texto(el.bossNivel, `${ini.type} · ARM ${ini.armor}`);
    const w = `${Math.max(0, ini.hp / ini.maxHp * 100)}%`; if (el.bossFill.style.width !== w) el.bossFill.style.width = w;
    texto(el.bossVida, Math.max(0, ini.hp)); texto(el.turno.querySelector('.turno-n'), s.combate.turno); texto(el.selo, ini.hp <= 0 ? 'Selo rompido' : ini.lore);
    painel.atualizar(s); dOpcoes(s); dPaineis(s); dLog(s); dNota(s); dModal(s);
  }
  return { raiz, atualizar, arena };
}
