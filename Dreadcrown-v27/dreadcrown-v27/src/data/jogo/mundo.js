// Mundo de Dreadcrown: regiões, ligações (portais), inimigos por região e aparência.
// Dado puro e editável. Coordenadas: o centro de cada região é (0,0); o mapa vai de -tamanho a +tamanho.
// "areas" referenciam o campo `area` de data/jogo/inimigos.js (cada inimigo vive na sua área).
// "mapa" é a posição da região no mapa-múndi (0..100) — só para desenhar o mapa.
export const REGIOES = {
  vale: {
    nome: 'Vale Quebrado', tier: 'weak', semente: 1101, tamanho: 70, relevo: 3.2, vitoriasMin: 0, mapa: [18, 70],
    areas: ['Estrada Quebrada', 'Pântano Raso', 'Bosque Frio'], quantidade: 6,
    visual: { ceu: '#8fb0c9', nevoa: '#a9bccb', nevoaDist: [30, 120], chao: ['#3f5a2c', '#587a3a', '#6b6a4c'], props: ['pinheiro', 'pedra', 'arbusto'], luz: '#fff2d6', agua: null },
    acampamento: [-8, 6], loja: [-12, 10], inicio: [0, 0],
    portais: [{ para: 'mortas', pos: [62, 0], rotulo: 'Terras Mortas' }, { para: 'cavernas', pos: [0, -62], rotulo: 'Cavernas Profundas' }]
  },
  mortas: {
    nome: 'Terras Mortas', tier: 'weak', semente: 2202, tamanho: 70, relevo: 2.4, vitoriasMin: 0, mapa: [40, 78],
    areas: ['Cemitério Antigo', 'Caverna Baixa'], quantidade: 6,
    visual: { ceu: '#5d6676', nevoa: '#6b7280', nevoaDist: [18, 90], chao: ['#3b3d3a', '#4b4a45', '#575149'], props: ['arvore_morta', 'lapide', 'pedra'], luz: '#c9d3ff', agua: null },
    acampamento: [6, -8], loja: null, inicio: [-58, 0],
    portais: [{ para: 'vale', pos: [-62, 0], rotulo: 'Vale Quebrado' }, { para: 'picos', pos: [0, 62], rotulo: 'Picos Ventosos' }]
  },
  cavernas: {
    nome: 'Cavernas Profundas', tier: 'medium', semente: 3303, tamanho: 64, relevo: 4.5, vitoriasMin: 5, mapa: [20, 40],
    areas: ['Cavernas Negras', 'Catacumbas', 'Salão do Tesouro'], quantidade: 7,
    visual: { ceu: '#14121c', nevoa: '#1b1826', nevoaDist: [10, 60], chao: ['#2a2733', '#38323f', '#443a47'], props: ['cristal', 'pedra', 'estalagmite'], luz: '#9c8cff', agua: null },
    acampamento: [8, 8], loja: [12, 4], inicio: [0, 56],
    portais: [{ para: 'vale', pos: [0, 58], rotulo: 'Vale Quebrado' }, { para: 'picos', pos: [58, 0], rotulo: 'Picos Ventosos' }]
  },
  picos: {
    nome: 'Picos Ventosos', tier: 'medium', semente: 4404, tamanho: 74, relevo: 9, vitoriasMin: 5, mapa: [58, 48],
    areas: ['Picos Ventosos', 'Passo Rochoso'], quantidade: 6,
    visual: { ceu: '#a9c4e6', nevoa: '#c6d6ea', nevoaDist: [40, 160], chao: ['#6d6f73', '#8a8c8e', '#a2a39f'], props: ['pedra', 'pinheiro', 'pedra_grande'], luz: '#fff8ee', agua: null },
    acampamento: [-6, -6], loja: [-10, -2], inicio: [0, -66],
    portais: [{ para: 'mortas', pos: [0, -68], rotulo: 'Terras Mortas' }, { para: 'cavernas', pos: [-68, 0], rotulo: 'Cavernas Profundas' }, { para: 'fortaleza', pos: [68, 0], rotulo: 'Fortaleza Rubra' }]
  },
  fortaleza: {
    nome: 'Fortaleza Rubra', tier: 'strong', semente: 5505, tamanho: 66, relevo: 3.6, vitoriasMin: 12, mapa: [78, 30],
    areas: ['Fortaleza Rubra', 'Templo Partido', 'Ruínas Profundas'], quantidade: 6,
    visual: { ceu: '#6b2f2a', nevoa: '#7a3b33', nevoaDist: [16, 90], chao: ['#4a3a34', '#5d463d', '#6e5144'], props: ['pilar', 'pedra', 'arvore_morta'], luz: '#ffb98a', agua: null },
    acampamento: [0, 8], loja: [4, 12], inicio: [-60, 0],
    portais: [{ para: 'picos', pos: [-62, 0], rotulo: 'Picos Ventosos' }, { para: 'fenda', pos: [62, 0], rotulo: 'Fenda Infernal' }]
  },
  fenda: {
    nome: 'Fenda Infernal', tier: 'strong', semente: 6606, tamanho: 60, relevo: 5.5, vitoriasMin: 12, mapa: [90, 12],
    areas: ['Portão Negro'], quantidade: 4, chefe: { area: 'Fenda Infernal', pos: [0, 32] },
    visual: { ceu: '#2a0a0a', nevoa: '#3a0f0c', nevoaDist: [10, 70], chao: ['#241313', '#331a16', '#4a2218'], props: ['pilar', 'cristal_rubro', 'pedra'], luz: '#ff7a3d', agua: null },
    acampamento: [-6, -10], loja: null, inicio: [-54, 0],
    portais: [{ para: 'fortaleza', pos: [-56, 0], rotulo: 'Fortaleza Rubra' }]
  }
};
export const REGIAO_INICIAL = 'vale';

// Parâmetros de simulação do mundo (ajuste livremente).
export const PARAMETROS_MUNDO = {
  velocidade: 4.2, velocidadeFurtivo: 2.0, velocidadePatrulha: 1.4, velocidadePerseguicao: 3.6,
  visao: { weak: 10, medium: 12, strong: 14 }, anguloVisao: 70, tempoAlerta: 0.8, perderAlvo: 3,
  raioContato: 1.3, alcanceAtaque: 2.6, respawnSegundos: 150, raioPonto: 3.2, raioPortal: 3.5
};
