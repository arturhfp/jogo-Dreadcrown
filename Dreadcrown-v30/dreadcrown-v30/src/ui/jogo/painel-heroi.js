// Painel do herói (abas Arsenal / Habilidades / Inventário / Dados + resumo). Usado na batalha e no mundo aberto.
// Só LÊ o estado e dispara callbacks de `acoes`; as regras vivem em src/rules.
import { h, ilha, icone } from './dom.js';
import { raca, classe, bonusEquipamento } from '../../rules/heroi.js';
import { RARIDADES, ROTULO_RARIDADE, NIVEL_DESBLOQUEIO } from '../../data/jogo/habilidades-oficiais.js';
import { ARMAS } from '../../data/jogo/armas.js';
import { ARMADURAS_BASE } from '../../data/jogo/armaduras-base.js';
import { EQUIPAMENTOS, equipamentoPorId } from '../../rules/equipamentos.js';
import { gerarHabilidades } from '../../rules/habilidades.js';
import { criarRng } from '../../core/rng.js';
import { FACCOES } from '../../data/jogo/faccoes.js';
import { origemPorId, textoBonus } from '../../data/jogo/origens.js';
import { ROTULO_SELO, ESTADOS_SELO } from '../../rules/selo.js';
import { consultarReputacao, ROTULO_FAIXA } from '../../rules/reputacao.js';
import { clasDaRaca, clanPorId } from '../../data/jogo/clas.js';
import { clanDoHeroi, clansPerdidos, podeEntrarNoClan } from '../../rules/cla.js';
import { aceitaHeroi, faixaEfetiva } from '../../rules/aceitacao.js';

const ROTULO_SLOT = { helmet: 'Capacete', chest: 'Armadura', boots: 'Botas', accessory: 'Relíquia' };

export function montarPainelHeroi({ acoes }) {
  const abas = [['equipment', 'Arsenal'], ['skills', 'Habilidades'], ['inventory', 'Inventário'], ['destiny', 'Destino'], ['dice', 'Dados']];
  const resumo = h('div', { cls: 'selection-summary' });
  const abasEl = h('div', { cls: 'phase-tabs' });
  const conteudoAba = h('div', { cls: 'tab-host' });
  const dAbas = ilha(abasEl, s => s.aba, s => abas.map(([k, r]) => h('button', { type: 'button', cls: `phase-tab ${s.aba === k ? 'active' : ''}`, onClick: () => acoes.aba(k) }, r)));
  const dResumo = ilha(resumo, s => JSON.stringify([s.heroi.name, s.heroi.race, s.heroi.classId, s.heroi.branch, s.heroi.level, s.heroi.wins, s.heroi.arm, s.heroi.origem]), s => {
    const hr = s.heroi;
    return h('div', {}, h('div', { cls: 'eyebrow' }, 'Arauto escolhido'), h('h3', {}, hr.name), h('p', {}, `${raca(hr.race).name} · ${classe(hr.classId).name} · ${hr.branch}`), origemPorId(hr.origem) && h('span', { cls: 'origin-line', testid: 'hero-origin' }, `Origem: ${origemPorId(hr.origem).nome}`),
      h('div', { cls: 'summary-stats' }, [['Nível', hr.level], ['Vitórias', hr.wins], ['ARM', hr.arm]].map(([a, b]) => h('div', { cls: 'summary-stat' }, h('span', {}, a), h('strong', {}, b)))));
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
  // Aba "Destino" (v29): origem sorteada, estado do Selo, linhagem da coroa, eixos de escolha e reputação com as facções. Só leitura.
  const ROTULO_LINHAGEM = { bloqueada: 'Adormecida', pista: 'Sinais em sonhos', descoberta: 'Desperta' };
  const painelDestino = (hr, camp) => {
    const o = origemPorId(hr.origem), selo = camp?.selo ?? 'firme', rep = camp?.reputacao ?? {}, eixos = camp?.eixos ?? {};
    return h('div', { cls: 'battle-panel destiny-panel', testid: 'panel-destiny' }, h('div', { cls: 'battle-panel-head' }, h('h3', {}, 'Destino'), h('span', {}, 'Origem, Selo e facções')),
      h('div', { cls: 'destiny-origin' }, h('h4', {}, 'Origem'), o ? h('div', { cls: 'item-card' }, h('strong', { testid: 'destiny-origin-name' }, o.nome), h('span', {}, textoBonus(o)), h('small', {}, o.historia)) : h('div', { cls: 'item-card' }, h('strong', {}, 'Sem origem'), h('small', {}, 'Heróis criados antes da v29 não recebem origem nem bônus.'))),
      h('div', { cls: 'destiny-clan', testid: 'destiny-clan' }, h('h4', {}, 'Clã'), (() => {
        const c = clanDoHeroi(hr), perdidos = clansPerdidos(hr);
        if (c) return h('div', { cls: 'item-card' }, h('strong', { testid: 'destiny-clan-name' }, c.nome), h('span', {}, c.especialidade), h('small', {}, c.descricao), h('small', {}, `Benefício: ${c.beneficio}${c.efeito ? '' : ' (em breve)'}`));
        return h('div', {}, h('div', { cls: 'item-card' }, h('strong', {}, 'Sem clã'), h('small', {}, perdidos.length ? 'Você perdeu um clã para sempre; outro só aceita quem conquistou a sua confiança.' : 'Escolha um clã da sua raça.')),
          h('div', { cls: 'faction-list' }, clasDaRaca(hr.race).map(c => { const r = podeEntrarNoClan(hr, camp, c.id); return h('button', { type: 'button', cls: 'ghost-button', testid: `button-join-${c.id}`, disabled: !r.ok, title: r.ok ? c.beneficio : r.motivo, onClick: () => acoes.escolherClan(c.id) }, `${c.nome}${perdidos.includes(c.id) ? ' (perdido)' : ''}`); })));
      })()),
      h('div', { cls: 'destiny-seal' }, h('h4', {}, 'O Selo'), h('div', { cls: 'seal-track', testid: 'seal-state' }, ESTADOS_SELO.map(e => h('span', { cls: `seal-step ${e === selo ? 'active' : ''}` }, ROTULO_SELO[e]))),
        h('small', {}, `Linhagem da coroa: ${ROTULO_LINHAGEM[camp?.linhagem] ?? 'Adormecida'} · Coroa: separada do corpo do Louco`)),
      h('div', { cls: 'destiny-axes' }, h('h4', {}, 'Rumo das escolhas'), h('small', {}, `Misericórdia ${eixos.misericordia ?? 0} · Crueldade ${eixos.crueldade ?? 0} · Selo ${eixos.selo ?? 0} · Despertar ${eixos.despertar ?? 0}`)),
      h('div', { cls: 'destiny-factions' }, h('h4', {}, 'Facções'), h('div', { cls: 'faction-list' }, FACCOES.map(f => { const r = consultarReputacao(rep, f.id), ac = aceitaHeroi(f.id, hr, camp), fx = faixaEfetiva(f.id, hr, camp);
        return h('div', { cls: `faction-row faixa-${fx}`, title: f.descricao + (ac.aceita ? '' : ` — ${ac.motivo}`), 'data-faction': f.id }, h('b', {}, f.nome), h('span', {}, ac.aceita ? `${ROTULO_FAIXA[fx]} (${r.valor})` : `Rejeita você · ${ac.motivo}`)); }))));
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
  const dAba = ilha(conteudoAba, s => s.aba === 'dice' ? 'dice' + s.diceTick : s.aba === 'destiny' ? 'destiny' + JSON.stringify([s.heroi.origem, s.heroi.clan, s.heroi.clansPerdidos, s.heroi.race, s.campanha]) : JSON.stringify([s.aba, s.heroi]), s => s.aba === 'equipment' ? painelEquip(s.heroi) : s.aba === 'skills' ? painelHabilidades(s.heroi) : s.aba === 'inventory' ? painelInventario(s.heroi) : s.aba === 'destiny' ? painelDestino(s.heroi, s.campanha) : painelDados());
  return { abasEl, resumo, conteudoAba, atualizar: s => { dAbas(s); dResumo(s); dAba(s); } };
}
