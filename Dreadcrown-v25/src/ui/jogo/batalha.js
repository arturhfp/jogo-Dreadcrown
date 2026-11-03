// Tela de batalha: arena (persistente, hospeda o palco 3D), painéis laterais, ações, modais.
// A UI só LÊ o estado e dispara callbacks; todas as regras vivem em src/rules.
import { KIT_CLASSES } from '../../data/jogo/classes-kit.js';
import { h, ilha, icone } from './dom.js';
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

  const abas = [['equipment', 'Arsenal'], ['skills', 'Habilidades'], ['inventory', 'Inventário'], ['dice', 'Dados']];
  const resumo = h('div', { cls: 'selection-summary' });
  const abasEl = h('div', { cls: 'phase-tabs' });
  const raiz = h('div', {}, el.banner,
    h('div', { cls: 'layout-grid arena-mode' },
      h('aside', { cls: 'left-rail' }, el.eyebrow, h('h1', { cls: 'page-heading' }, 'A arena respira.'), h('p', { cls: 'page-intro' }, 'O inimigo lê seus movimentos. Escolha uma ação e veja o selo responder.'),
        h('div', { cls: 'section-rule' }), abasEl, resumo, el.conteudoAba,
        h('button', { type: 'button', cls: 'ghost-button return-create', onClick: () => acoes.recriar() }, icone('voltar', 13), ' Recriar personagem')),
      h('main', { cls: 'right-rail' }, arena, el.opcoes, el.painelCombate,
        h('div', { cls: 'panels' }, h('div', { cls: 'card panel' }, h('p', { cls: 'eyebrow' }, 'Registro de combate'), el.log), h('div', { cls: 'card panel' }, h('p', { cls: 'eyebrow' }, 'Leitura do arauto'), el.nota)))),
    el.modal);

  /* ---------- ilhas ---------- */
  const dAbas = ilha(abasEl, s => s.aba, s => abas.map(([k, r]) => h('button', { type: 'button', cls: `phase-tab ${s.aba === k ? 'active' : ''}`, onClick: () => acoes.aba(k) }, r)));
  const dResumo = ilha(resumo, s => JSON.stringify([s.heroi.name, s.heroi.race, s.heroi.classId, s.heroi.branch, s.heroi.level, s.heroi.wins, s.heroi.arm]), s => {
    const hr = s.heroi;
    return h('div', {}, h('div', { cls: 'eyebrow' }, 'Arauto escolhido'), h('h3', {}, hr.name), h('p', {}, `${raca(hr.race).name} · ${classe(hr.classId).name} · ${hr.branch}`),
      h('div', { cls: 'summary-stats' }, [['Nível', hr.level], ['Vitórias', hr.wins], ['ARM', hr.arm]].map(([a, b]) => h('div', { cls: 'summary-stat' }, h('span', {}, a), h('strong', {}, b)))));
  });
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

  /* ---------- abas da esquerda ---------- */
  const painelEquip = hr => {
    const pool = EQUIPAMENTOS.filter(o => o.classId === hr.classId && (hr.inventoryGear?.includes(o.id) || Object.values(hr.equippedGear || {}).includes(o.id)));
    const ativo = bonusEquipamento(hr).conjuntosAtivos.length > 0, equipados = Object.values(hr.equippedGear || {}).filter(Boolean).length;
    const efeitos = bonusEquipamento(hr).conjuntosAtivos.map(id => EQUIPAMENTOS.find(t => t.setId === id)?.setEffect || 'Bônus de conjunto ativo');
    return h('div', { cls: 'battle-panel' }, h('div', { cls: 'battle-panel-head' }, h('h3', {}, 'Equipamentos de classe'), h('span', {}, ativo ? 'CONJUNTO ATIVO' : '4 espaços')),
      h('div', { cls: 'gear-slots' }, Object.keys(ROTULO_SLOT).map(o => { const d = equipamentoPorId(hr.equippedGear?.[o]); return h('div', { cls: `gear-slot ${d ? 'filled' : ''}` }, h('b', {}, ROTULO_SLOT[o]), h('span', {}, d?.name ?? 'Vazio'), h('small', {}, d ? `+${d.def} ARM · +${d.hp} HP${d.mana ? ` · +${d.mana} mana` : ''}` : 'Encontre no saque.')); })),
      h('div', { cls: 'battle-equip-grid' }, pool.map(o => { const sel = hr.equippedGear?.[o.slot] === o.id; return h('button', { type: 'button', cls: `battle-equip ${sel ? 'selected' : ''}`, onClick: () => acoes.equipar(o.id) }, h('b', {}, sel && icone('marca', 12), ' ', o.name), h('small', {}, `${ROTULO_SLOT[o.slot]} · +${o.def} ARM · +${o.hp} HP${o.mana ? ` · +${o.mana} mana` : ''}`)); })),
      h('div', { cls: `set-bonus ${ativo ? 'active' : ''}` }, h('strong', {}, 'Bônus de conjunto'), h('span', {}, ativo ? '4/4 peças equipadas · BÔNUS ATIVO' : `${equipados}/4 peças equipadas`), h('small', {}, efeitos.join(' • ') || 'Capacete + armadura + botas do mesmo conjunto ativam os bônus próprios do conjunto.')));
  };
  const painelHabilidades = hr => h('div', { cls: 'battle-panel' }, h('div', { cls: 'battle-panel-head' }, h('h3', {}, 'Habilidades da ramificação'), h('span', {}, 'Escolha 1 por raridade. Cada opção depende da classe, raça e subclasse.')),
    h('div', { cls: 'skill-groups' }, RARIDADES.map(r => {
      const aberto = hr.level >= NIVEL_DESBLOQUEIO[r], d = hr.selectedSkills[r], lista = gerarHabilidades(hr.branch, r, hr.race, hr.classId);
      return h('div', { cls: `skill-group ${aberto ? '' : 'locked-group'}` }, h('h4', {}, ROTULO_RARIDADE[r], h('span', {}, aberto ? '4 opções' : `Nível ${NIVEL_DESBLOQUEIO[r]}`)),
        h('div', { cls: 'skill-picks' }, lista.map((x, i) => h('button', { type: 'button', disabled: !aberto || d !== null, cls: `skill-pick ${d === i ? 'selected' : ''}`, onClick: () => acoes.escolherHabilidade(r, i) },
          h('div', { cls: 'skill-main-line' }, h('strong', {}, x.name), h('span', {}, `${x.damage} dano · ${x.cost} ${x.resource === 'mana' ? 'mana' : 'stamina'}`)), h('small', {}, x.description), h('em', {}, x.effect), d === i && h('b', {}, ' ✓ TRAVADA')))),
        aberto && d !== null && h('button', { type: 'button', cls: 'skill-use-link', onClick: () => acoes.agir(`ability:${r}`) }, icone('raio', 12), ` Usar agora · ${lista[d].damage} dano · custo ${lista[d].cost} ${lista[d].resource === 'mana' ? 'mana' : 'stamina'}`));
    })));
  const painelInventario = hr => {
    const arma = ARMAS.find(u => u.id === hr.weaponId), arm = ARMADURAS_BASE.find(u => u.id === hr.armorId);
    return h('div', { cls: 'battle-panel' }, h('div', { cls: 'battle-panel-head' }, h('h3', {}, 'Equipamentos & consumíveis'), h('span', {}, icone('moeda', 12), ` ${hr.coins} moedas`)),
      h('div', { cls: 'inventory-columns' }, h('div', {}, h('h4', {}, 'Poções'), h('div', { cls: 'potion-row' }, [['life', 'Cura'], ['mana', 'Mana'], ['stamina', 'Stamina']].map(([k, r]) => h('button', { type: 'button', cls: 'potion-button', onClick: () => acoes.pocao(k) }, icone('gota', 14), h('span', {}, r, h('small', {}, 'x' + hr.pots[k])))))),
        h('div', {}, h('h4', {}, 'Equipado'), h('div', { cls: 'equipped-stack' },
          h('div', { cls: 'item-card' }, h('strong', {}, arma?.name), h('span', {}, `+${(arma?.bonus ?? 0) + (hr.weaponUpgrades[hr.weaponId] ?? 0)} dano`)),
          h('div', { cls: 'item-card' }, h('strong', {}, arm?.name ?? 'Sem armadura adicional'), h('span', {}, arm ? `+${arm.def + (hr.armorUpgrades[arm.id] ?? 0)} ARM` : 'Encontre armaduras no saque ou na loja.'))))));
  };
  let dadoCfg = { d: '20', q: 1, m: 0, resultado: '—' };
  const painelDados = () => {
    const rolar = () => { const rng = criarRng((Math.random() * 2 ** 32) >>> 0), d = +dadoCfg.d, v = Array.from({ length: dadoCfg.q }, () => rng.inteiro(1, d)), t = v.reduce((a, b) => a + b, 0) + dadoCfg.m;
      dadoCfg.resultado = `${v.join(' + ')}${dadoCfg.m ? ` ${dadoCfg.m > 0 ? '+' : ''}${dadoCfg.m}` : ''} = ${t}`; acoes.registrar(`D${d} rolado: ${t}.`); };
    return h('div', { cls: 'battle-panel dice-panel' }, h('div', { cls: 'battle-panel-head' }, h('h3', {}, 'Dados do destino'), h('span', {}, 'Treino livre do codex')),
      h('div', { cls: 'dice-controls' }, h('label', {}, 'Dado', h('select', { onChange: e => { dadoCfg.d = e.target.value; } }, [4, 6, 8, 10, 12, 20].map(v => h('option', { value: v, selected: String(v) === dadoCfg.d }, v)))),
        h('label', {}, 'Qtd.', h('input', { type: 'number', min: 1, max: 6, value: dadoCfg.q, onChange: e => { dadoCfg.q = Math.max(1, Math.min(6, +e.target.value)); } })),
        h('label', {}, 'Mod.', h('input', { type: 'number', min: -20, max: 20, value: dadoCfg.m, onChange: e => { dadoCfg.m = +e.target.value; } })),
        h('button', { type: 'button', cls: 'primary-button dice-roll', onClick: rolar }, icone('dado', 14), ' Rolar')),
      h('div', { cls: 'dice-result' }, dadoCfg.resultado),
      h('details', { cls: 'beginner' }, h('summary', {}, 'Sou iniciante — como funcionam os dados?'), h('p', {}, h('b', {}, 'D20'), ' decide se um ataque acerta. 1 é falha crítica, 20 é crítico; o resultado recebe bônus de atributo.'), h('p', {}, 'Os demais dados são livres para treino. Exemplo: 2d6 + 3.')));
  };
  const dAba = ilha(el.conteudoAba, s => s.aba === 'dice' ? 'dice' + s.diceTick : JSON.stringify([s.aba, s.heroi]), s => s.aba === 'equipment' ? painelEquip(s.heroi) : s.aba === 'skills' ? painelHabilidades(s.heroi) : s.aba === 'inventory' ? painelInventario(s.heroi) : painelDados());

  /* ---------- modais ---------- */
  const modalCamp = hr => h('div', { cls: 'modal-backdrop' }, h('div', { cls: 'modal-card camp-card' },
    h('div', { cls: 'modal-top' }, h('div', {}, h('div', { cls: 'eyebrow' }, 'Entre uma batalha e outra'), h('h2', {}, 'Acampamento'), h('p', {}, 'Você venceu. Escolha somente uma ação; o próximo encontro começa automaticamente.')), icone('fogueira', 28)),
    h('div', { cls: 'camp-summary' }, `${hr.name} terminou com `, h('b', {}, `${arr(hr.hp)}/${hr.maxHp} HP`), `, ${arr(hr.mana)}/${hr.maxMana} mana e ${arr(hr.stam)}/${hr.maxStam} stamina.`),
    h('div', { cls: 'camp-options' },
      h('button', { type: 'button', cls: 'camp-option', onClick: () => acoes.acampar('descansar') }, h('strong', {}, icone('fogueira', 15), ' Descansar'), h('span', {}, 'Recupera vida, mana e stamina de forma equilibrada.'), h('em', {}, '+25% HP · +55% mana · +55% stamina')),
      h('button', { type: 'button', cls: 'camp-option', onClick: () => acoes.acampar('vasculhar') }, h('strong', {}, icone('mochila', 15), ' Lootear'), h('span', {}, 'Procura moedas, poções ou equipamento compatível.'), h('em', {}, 'Sem recuperação de recursos')),
      h('button', { type: 'button', cls: 'camp-option', onClick: () => acoes.acampar('tratar') }, h('strong', {}, icone('coracao', 15), ' Tratar ferimentos'), h('span', {}, 'Prioriza a recuperação física antes de seguir viagem.'), h('em', {}, '+55% HP · pequena recuperação de recursos')))));
  const modalLoja = (hr, itens) => h('div', { cls: 'modal-backdrop' }, h('div', { cls: 'modal-card shop-card' },
    h('div', { cls: 'modal-top' }, h('div', {}, h('div', { cls: 'eyebrow' }, 'Mercador errante'), h('h2', {}, 'Loja de Dreadcrown'), h('p', {}, 'Aparece ocasionalmente após uma vitória. O estoque muda a cada visita.')),
      h('button', { type: 'button', cls: 'icon-button', 'aria-label': 'Sair da loja', title: 'Sair da loja', onClick: () => acoes.fecharLoja() }, icone('fechar', 16))),
    h('div', { cls: 'shop-wallet' }, icone('moeda', 14), ' Ouro disponível: ', h('b', {}, hr.coins)),
    h('div', { cls: 'shop-grid' }, itens.map((it, i) => h('div', { cls: 'shop-item' }, h('span', { cls: 'rarity' }, it.rarity || it.type), h('strong', {}, it.name), h('small', {}, it.desc), h('div', { cls: 'item-price' }, `${it.price} moedas`), h('button', { type: 'button', onClick: () => acoes.comprar(i) }, 'Comprar'))))));
  const dModal = ilha(el.modal, s => s.modal === 'loja' ? 'loja' + JSON.stringify([s.heroi.coins, s.loja.length]) : s.modal === 'camp' ? 'camp' + Math.round(s.heroi.hp) : '', s => s.modal === 'camp' ? modalCamp(s.heroi) : s.modal === 'loja' ? modalLoja(s.heroi, s.loja) : h('span'));

  function atualizar() {
    const s = estado, hr = s.heroi, ini = s.combate.inimigo;
    el.banner.style.display = s.admin ? 'flex' : 'none';
    texto(el.eyebrow, `Codex ativo / encontro ${String(hr.wins + 1).padStart(2, '0')}`);
    texto(el.bossTag, `${ini.area} · ameaça ${rotuloTier(ini.tier)}`); texto(el.bossNome, ini.name); texto(el.bossNivel, `${ini.type} · ARM ${ini.armor}`);
    const w = `${Math.max(0, ini.hp / ini.maxHp * 100)}%`; if (el.bossFill.style.width !== w) el.bossFill.style.width = w;
    texto(el.bossVida, Math.max(0, ini.hp)); texto(el.turno.querySelector('.turno-n'), s.combate.turno); texto(el.selo, ini.hp <= 0 ? 'Selo rompido' : ini.lore);
    dAbas(s); dResumo(s); dAba(s); dOpcoes(s); dPaineis(s); dLog(s); dNota(s); dModal(s);
  }
  return { raiz, atualizar };
}
