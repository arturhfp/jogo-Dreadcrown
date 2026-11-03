// Modais compartilhados (acampamento e loja): usados na batalha e no mundo aberto.
import { h, icone } from './dom.js';
const arr = n => Math.max(0, Math.round(n));

export const modalCamp = (hr, acoes, descricao = 'Você venceu. Escolha somente uma ação; o próximo encontro começa automaticamente.', aoFechar = null) => h('div', { cls: 'modal-backdrop' }, h('div', { cls: 'modal-card camp-card' },
  h('div', { cls: 'modal-top' }, h('div', {}, h('div', { cls: 'eyebrow' }, 'Entre uma batalha e outra'), h('h2', {}, 'Acampamento'), h('p', {}, descricao)), aoFechar ? h('button', { type: 'button', cls: 'icon-button', title: 'Sair do acampamento', onClick: aoFechar }, icone('fechar', 16)) : icone('fogueira', 28)),
  h('div', { cls: 'camp-summary' }, `${hr.name} terminou com `, h('b', {}, `${arr(hr.hp)}/${hr.maxHp} HP`), `, ${arr(hr.mana)}/${hr.maxMana} mana e ${arr(hr.stam)}/${hr.maxStam} stamina.`),
  h('div', { cls: 'camp-options' },
    h('button', { type: 'button', cls: 'camp-option', onClick: () => acoes.acampar('descansar') }, h('strong', {}, icone('fogueira', 15), ' Descansar'), h('span', {}, 'Recupera vida, mana e stamina de forma equilibrada.'), h('em', {}, '+25% HP · +55% mana · +55% stamina')),
    h('button', { type: 'button', cls: 'camp-option', onClick: () => acoes.acampar('vasculhar') }, h('strong', {}, icone('mochila', 15), ' Lootear'), h('span', {}, 'Procura moedas, poções ou equipamento compatível.'), h('em', {}, 'Sem recuperação de recursos')),
    h('button', { type: 'button', cls: 'camp-option', onClick: () => acoes.acampar('tratar') }, h('strong', {}, icone('coracao', 15), ' Tratar ferimentos'), h('span', {}, 'Prioriza a recuperação física antes de seguir viagem.'), h('em', {}, '+55% HP · pequena recuperação de recursos')))));
export const modalLoja = (hr, itens, acoes) => h('div', { cls: 'modal-backdrop' }, h('div', { cls: 'modal-card shop-card' },
  h('div', { cls: 'modal-top' }, h('div', {}, h('div', { cls: 'eyebrow' }, 'Mercador errante'), h('h2', {}, 'Loja de Dreadcrown'), h('p', {}, 'Aparece ocasionalmente após uma vitória. O estoque muda a cada visita.')),
    h('button', { type: 'button', cls: 'icon-button', 'aria-label': 'Sair da loja', title: 'Sair da loja', onClick: () => acoes.fecharLoja() }, icone('fechar', 16))),
  h('div', { cls: 'shop-wallet' }, icone('moeda', 14), ' Ouro disponível: ', h('b', {}, hr.coins)),
  h('div', { cls: 'shop-grid' }, itens.map((it, i) => h('div', { cls: 'shop-item' }, h('span', { cls: 'rarity' }, it.rarity || it.type), h('strong', {}, it.name), h('small', {}, it.desc), h('div', { cls: 'item-price' }, `${it.price} moedas`), h('button', { type: 'button', onClick: () => acoes.comprar(i) }, 'Comprar'))))));

// Derrota em batalha (v27): antes o jogador só via "Recrie o personagem". Agora pode retomar o último salvamento (gravado antes
// da batalha, ao tocar no inimigo no mundo) ou recriar. Não altera nenhuma regra de combate.
export const modalDerrota = (hr, acoes, podeRetomar) => h('div', { cls: 'modal-backdrop' }, h('div', { cls: 'modal-card camp-card defeat-card' },
  h('div', { cls: 'modal-top' }, h('div', {}, h('div', { cls: 'eyebrow' }, 'Fim da linha'), h('h2', {}, 'Derrota'), h('p', {}, `${hr.name} caiu em combate. O que restou de você pode voltar ao último ponto salvo.`)), icone('coroa', 28)),
  h('div', { cls: 'camp-options' },
    h('button', { type: 'button', cls: 'camp-option', testid: 'button-resume-save', disabled: !podeRetomar, onClick: () => acoes.retomarSave() }, h('strong', {}, icone('voltar', 15), ' Retomar do último salvamento'), h('span', {}, podeRetomar ? 'Volta ao mundo com o último progresso gravado.' : 'Não há salvamento disponível.'), h('em', {}, 'Mantém nível, itens e posição')),
    h('button', { type: 'button', cls: 'camp-option', testid: 'button-recreate', onClick: () => acoes.recriar() }, h('strong', {}, icone('estrela', 15), ' Criar novo personagem'), h('span', {}, 'Volta à tela de criação. O salvamento existente só é substituído quando você jogar de novo.'), h('em', {}, 'Recomeçar')))));
