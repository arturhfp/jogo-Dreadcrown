// Modais compartilhados: acampamento e loja (só no mundo aberto), vitória e derrota (batalha).
import { h, icone } from './dom.js';
const arr = n => Math.max(0, Math.round(n));

// Acampamento (v28): ponto seguro do mundo aberto. Descansar, lootear e tratar ferimentos continuam como na v27; o COMÉRCIO é uma escolha explícita
// ("Comércio"), a única forma de abrir a loja. `acoes.comercio` só existe quando o acampamento é um acampamento válido do mundo aberto.
export const modalCamp = (hr, acoes, descricao = 'Você montou acampamento. Descanse, trate os ferimentos, procure suprimentos ou visite o mercador antes de seguir viagem.', aoFechar = null) => h('div', { cls: 'modal-backdrop' }, h('div', { cls: 'modal-card camp-card', testid: 'modal-camp' },
  h('div', { cls: 'modal-top' }, h('div', {}, h('div', { cls: 'eyebrow' }, 'Ponto seguro'), h('h2', {}, 'Acampamento'), h('p', {}, descricao)), aoFechar ? h('button', { type: 'button', cls: 'icon-button', title: 'Sair do acampamento', 'aria-label': 'Sair do acampamento', testid: 'button-camp-close', onClick: aoFechar }, icone('fechar', 16)) : icone('fogueira', 28)),
  h('div', { cls: 'camp-summary' }, `${hr.name} está com `, h('b', {}, `${arr(hr.hp)}/${hr.maxHp} HP`), `, ${arr(hr.mana)}/${hr.maxMana} mana e ${arr(hr.stam)}/${hr.maxStam} stamina · `, h('b', {}, `${hr.coins} moedas`), '.'),
  h('div', { cls: 'camp-options' },
    h('button', { type: 'button', cls: 'camp-option', testid: 'button-camp-rest', onClick: () => acoes.acampar('descansar') }, h('strong', {}, icone('fogueira', 15), ' Descansar'), h('span', {}, 'Recupera vida, mana e stamina de forma equilibrada.'), h('em', {}, '+25% HP · +55% mana · +55% stamina')),
    h('button', { type: 'button', cls: 'camp-option', testid: 'button-camp-loot', onClick: () => acoes.acampar('vasculhar') }, h('strong', {}, icone('mochila', 15), ' Lootear'), h('span', {}, 'Procura moedas, poções ou equipamento compatível. Cada acampamento só rende de novo depois de um tempo.'), h('em', {}, 'Sem recuperação de recursos')),
    h('button', { type: 'button', cls: 'camp-option', testid: 'button-camp-heal', onClick: () => acoes.acampar('tratar') }, h('strong', {}, icone('coracao', 15), ' Tratar ferimentos'), h('span', {}, 'Prioriza a recuperação física antes de seguir viagem.'), h('em', {}, '+55% HP · pequena recuperação de recursos')),
    acoes.comercio && h('button', { type: 'button', cls: 'camp-option camp-trade', testid: 'button-camp-trade', onClick: () => acoes.comercio() }, h('strong', {}, icone('moeda', 15), ' Comércio'), h('span', {}, 'O mercador do acampamento vende poções, armas, equipamentos e melhorias.'), h('em', {}, 'Só existe nos acampamentos')),
    aoFechar && h('button', { type: 'button', cls: 'camp-option', testid: 'button-camp-leave', onClick: aoFechar }, h('strong', {}, icone('voltar', 15), ' Seguir viagem'), h('span', {}, 'Apaga a fogueira e volta a explorar.')))));

// Loja (v28): só é aberta a partir do acampamento (app.js → abrirLoja). Sair da loja devolve o jogador ao acampamento.
export const modalLoja = (hr, itens, acoes) => h('div', { cls: 'modal-backdrop' }, h('div', { cls: 'modal-card shop-card', testid: 'modal-shop' },
  h('div', { cls: 'modal-top' }, h('div', {}, h('div', { cls: 'eyebrow' }, 'Mercador do acampamento'), h('h2', {}, 'Loja de Dreadcrown'), h('p', {}, 'O mercador só atende nos acampamentos. O estoque muda a cada visita.')),
    h('button', { type: 'button', cls: 'icon-button', 'aria-label': 'Sair da loja', title: 'Voltar ao acampamento', testid: 'button-shop-close', onClick: () => acoes.fecharLoja() }, icone('fechar', 16))),
  h('div', { cls: 'shop-wallet' }, icone('moeda', 14), ' Ouro disponível: ', h('b', {}, hr.coins)),
  h('div', { cls: 'shop-grid' }, itens.map((it, i) => h('div', { cls: 'shop-item' }, h('span', { cls: 'rarity' }, it.rarity || it.type), h('strong', {}, it.name), h('small', {}, it.desc), h('div', { cls: 'item-price' }, it.precoBase ? [h('s', {}, `${it.precoBase}`), ` ${it.price} moedas · clã −${it.descontoClan}%`] : `${it.price} moedas`), h('button', { type: 'button', disabled: hr.coins < it.price, onClick: () => acoes.comprar(i) }, 'Comprar'))))));

// Vitória (v28): resumo do combate. Nada é aberto automaticamente (nem acampamento, nem loja): o jogador decide quando voltar a explorar.
export const modalVitoria = (hr, linhas, acoes, noMundo) => h('div', { cls: 'modal-backdrop' }, h('div', { cls: 'modal-card camp-card victory-card', testid: 'modal-victory' },
  h('div', { cls: 'modal-top' }, h('div', {}, h('div', { cls: 'eyebrow' }, 'Combate encerrado'), h('h2', {}, 'Vitória'), h('p', {}, `${hr.name} · nível ${hr.level} · ${hr.wins} vitórias · ${hr.coins} moedas`)), icone('coroa', 28)),
  h('div', { cls: 'camp-summary' }, linhas.map(t => h('div', {}, t))),
  h('div', { cls: 'camp-options' },
    h('button', { type: 'button', cls: 'camp-option', testid: 'button-continue-victory', onClick: () => acoes.continuarAposVitoria() }, h('strong', {}, icone('voltar', 15), noMundo ? ' Continuar explorando' : ' Próximo encontro de teste'), h('span', {}, noMundo ? 'Volta ao mundo aberto. Acampamentos e mercadores ficam onde estão: visite-os quando quiser.' : 'Modo ADM: começa outro encontro.')))));

// Derrota em batalha (v27): antes o jogador só via "Recrie o personagem". Agora pode retomar o último salvamento (gravado antes
// da batalha, ao tocar no inimigo no mundo) ou recriar. Não altera nenhuma regra de combate.
export const modalDerrota = (hr, acoes, podeRetomar) => h('div', { cls: 'modal-backdrop' }, h('div', { cls: 'modal-card camp-card defeat-card' },
  h('div', { cls: 'modal-top' }, h('div', {}, h('div', { cls: 'eyebrow' }, 'Fim da linha'), h('h2', {}, 'Derrota'), h('p', {}, `${hr.name} caiu em combate. O que restou de você pode voltar ao último ponto salvo.`)), icone('coroa', 28)),
  h('div', { cls: 'camp-options' },
    h('button', { type: 'button', cls: 'camp-option', testid: 'button-resume-save', disabled: !podeRetomar, onClick: () => acoes.retomarSave() }, h('strong', {}, icone('voltar', 15), ' Retomar do último salvamento'), h('span', {}, podeRetomar ? 'Volta ao mundo com o último progresso gravado.' : 'Não há salvamento disponível.'), h('em', {}, 'Mantém nível, itens e posição')),
    h('button', { type: 'button', cls: 'camp-option', testid: 'button-recreate', onClick: () => acoes.recriar() }, h('strong', {}, icone('estrela', 15), ' Criar novo personagem'), h('span', {}, 'Volta à tela de criação. O salvamento existente só é substituído quando você jogar de novo.'), h('em', {}, 'Recomeçar')))));
