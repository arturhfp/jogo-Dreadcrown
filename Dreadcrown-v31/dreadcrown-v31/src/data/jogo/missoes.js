// Missões (v31). SÓ DADOS. Cada alvo é um inimigo que JÁ existe no mundo (id estável), então não há inimigo novo nem mudança de balanceamento.
// Grupos: 'rede' (campanha da Rede do Louco, em degraus), 'faccao' (contratos de facção), 'cla' (contratos de clã).
// Raridade usa os rótulos do jogo (common/rare/epic/legendary); `nivel` é o nível de herói recomendado (só aviso, não bloqueia).
// Decisões: 'matar' | 'poupar' | 'recrutar'. Efeitos: rep {facção: delta}, eixos {nome: n}, selo (passos; + enfraquece), moedas,
// revela {pontos: [ids de ponto do mapa]}, linhagem ('pista'|'descoberta'). Nomes e histórias dos alvos são invenção autorizada pelo autor.
export const DEGRAUS = { informante: 'Informante', tenente: 'Tenente', comandante: 'Comandante', guardiao: 'Guardião', louco: 'O Louco' };

export const MISSOES = [
  { id: 'rede-1', grupo: 'rede', degrau: 'informante', facao: 'culto', raridade: 'common', nivel: 1, requer: {},
    titulo: 'O Mensageiro de Estrada',
    alvo: { inimigo: 'vale:3', nome: 'Dorn Mãos-Leves', papel: 'Mensageiro do Culto', historia: 'Saqueador de estrada que leva recados escritos em cera preta. Não sabe o que dizem, só para quem.' },
    opcoes: ['matar', 'poupar'], texto: 'Um mensageiro do Culto do Rei Desperto usa as estradas do Vale. Descubra para quem ele trabalha.',
    efeitos: {
      matar: { rep: { culto: -10, vigilia: 8 }, eixos: { crueldade: 1, selo: 1 }, moedas: 15 },
      poupar: { rep: { culto: -4, vigilia: 4 }, eixos: { misericordia: 1 }, moedas: 8 }
    }, revela: { pontos: ['camp:mortas'], texto: 'Cera preta aponta para as Terras Mortas.' } },
  { id: 'rede-2', grupo: 'rede', degrau: 'informante', facao: 'culto', raridade: 'common', nivel: 2, requer: { missao: 'rede-1' },
    titulo: 'A Irmã do Bosque',
    alvo: { inimigo: 'vale:0', nome: 'Wenna Corvo-Tímido', papel: 'Recrutadora do Culto', historia: 'Ex-camponesa que perdeu a casa para a fome e agora recruta os que perderam tudo. Acredita estar salvando gente.' },
    opcoes: ['matar', 'poupar'], texto: 'Uma recrutadora arrebanha desesperados no Bosque Frio.',
    efeitos: {
      matar: { rep: { culto: -12, vigilia: 8, concordia: 3 }, eixos: { crueldade: 1, selo: 1 }, moedas: 20 },
      poupar: { rep: { culto: -4, andarilhos: 6 }, eixos: { misericordia: 1, despertar: 1 }, moedas: 10 }
    }, revela: { pontos: [], texto: 'Ela cita um tenente nas cavernas: "Aquele que lê o vazio".' } },
  { id: 'rede-3', grupo: 'rede', degrau: 'tenente', facao: 'culto', raridade: 'rare', nivel: 4, requer: { missao: 'rede-2' },
    titulo: 'Aquele que Lê o Vazio',
    alvo: { inimigo: 'cavernas:1', nome: 'Irmão Sallow', papel: 'Tenente do Culto nas Cavernas', historia: 'Copista de rituais que mapeia onde o selo mais se fragilizou. Só ele sabe o caminho das Catacumbas.' },
    opcoes: ['matar', 'poupar'], texto: 'O tenente das Cavernas Profundas guarda o caminho para as Catacumbas.',
    efeitos: {
      matar: { rep: { culto: -15, vigilia: 10, cinzas: -4 }, eixos: { crueldade: 1, selo: 1 }, moedas: 40 },
      poupar: { rep: { culto: -5, vigilia: -5 }, eixos: { misericordia: 1, despertar: 1 }, selo: 1, moedas: 25 }
    }, revela: { pontos: ['dg:catacumbas'], texto: 'Um mapa de carvão marca a porta das Catacumbas.' }, linhagem: 'pista' },
  { id: 'rede-4', grupo: 'rede', degrau: 'comandante', facao: 'culto', raridade: 'epic', nivel: 6, requer: { missao: 'rede-3' },
    titulo: 'O Comandante do Ossuário',
    alvo: { inimigo: 'dg:catacumbas:2', nome: 'Mestra Ysolde Ossária', papel: 'Comandante do Culto nas Catacumbas', historia: 'Foi sacerdotisa da Vigília até acreditar que o selo era uma jaula. Guarda um fragmento do mapa da Fortaleza Rubra.' },
    opcoes: ['matar', 'poupar', 'recrutar'], texto: 'No Ossuário das Catacumbas, a comandante do Culto guarda um fragmento de mapa.',
    efeitos: {
      matar: { rep: { culto: -20, vigilia: 12 }, eixos: { crueldade: 2, selo: 1 }, moedas: 80 },
      poupar: { rep: { culto: -8, vigilia: -8 }, eixos: { misericordia: 2, despertar: 1 }, selo: 1, moedas: 50 },
      recrutar: { rep: { culto: 15, vigilia: -15, legiao: -6 }, eixos: { despertar: 2 }, selo: 1, moedas: 30 }
    }, revela: { pontos: ['camp:fortaleza'], texto: 'O fragmento mostra a rota até a Fortaleza Rubra.' } },
  { id: 'rede-5', grupo: 'rede', degrau: 'comandante', facao: 'legiao', raridade: 'epic', nivel: 8, requer: { missao: 'rede-4' },
    titulo: 'O Estandarte Rubro',
    alvo: { inimigo: 'fortaleza:0', nome: 'Capitão Vorrak Sem-Elmo', papel: 'Comandante da Legião Rubra', historia: 'Veterano que persegue a coroa para si. Sabe onde os dragões guardam o Portão Negro e não divide o segredo.' },
    opcoes: ['matar', 'poupar', 'recrutar'], texto: 'A Legião Rubra, rede rival, também caça a coroa. Seu comandante conhece o caminho até o Portão Negro.',
    efeitos: {
      matar: { rep: { legiao: -20, vigilia: 8, culto: 6 }, eixos: { crueldade: 2 }, moedas: 100 },
      poupar: { rep: { legiao: -6, vigilia: -4 }, eixos: { misericordia: 2 }, moedas: 60 },
      recrutar: { rep: { legiao: 18, vigilia: -12, concordia: -6 }, eixos: { despertar: 2 }, selo: 1, moedas: 40 }
    }, revela: { pontos: ['camp:fenda'], texto: 'Um mapa de guerra marca o Portão Negro, onde Solaris e Estaroh guardam o Louco.' }, linhagem: 'descoberta' },
  // ---- contratos de facção ----
  { id: 'fac-hordas-1', grupo: 'faccao', degrau: null, facao: 'hordas-cinzentas', raridade: 'common', nivel: 3, requer: {},
    titulo: 'Prova do Ogro de Pedra',
    alvo: { inimigo: 'picos:1', nome: 'Gruum Quebra-Colina', papel: 'Ogro que ataca as caravanas dos Picos', historia: 'Um ogro isolado que as Hordas Cinzentas querem longe das rotas.' },
    opcoes: [], texto: 'As Hordas Cinzentas pedem que alguém derrube o ogro dos Picos.',
    efeitos: { matar: { rep: { 'hordas-cinzentas': 15 }, moedas: 45 } } },
  { id: 'fac-andarilhos-1', grupo: 'faccao', degrau: null, facao: 'andarilhos', raridade: 'common', nivel: 2, requer: {},
    titulo: 'Contrato de Caça no Vale',
    alvo: { inimigo: 'vale:5', nome: 'Presa-Fria', papel: 'Lobo que ronda o acampamento', historia: 'Um lobo cinzento velho e esperto que já levou três cabras de uma caravana.' },
    opcoes: [], texto: 'A Companhia dos Andarilhos paga por um lobo que assombra as estradas do Vale.',
    efeitos: { matar: { rep: { andarilhos: 12, 'cinco-cofres': 4 }, moedas: 30 } } },
  // ---- contratos de clã (só para quem pertence ao clã) ----
  { id: 'cla-rastro-1', grupo: 'cla', degrau: null, facao: 'hordas-cinzentas', cla: 'rastro-de-lobo', raridade: 'rare', nivel: 3, requer: { clan: 'rastro-de-lobo' },
    titulo: 'O Rastro de Presa-de-Aço',
    alvo: { inimigo: 'vale:2', nome: 'Presa-de-Aço', papel: 'Lobo-líder que o Rastro-de-Lobo persegue', historia: 'O líder da matilha que o clã segue há três invernos; a caça só termina quando o rastro termina.' },
    opcoes: [], texto: 'O Rastro-de-Lobo pede a você que termine uma caça antiga.',
    efeitos: { matar: { rep: { 'hordas-cinzentas': 10 }, moedas: 60 } } }
];

export const missaoPorId = id => MISSOES.find(m => m.id === id);
export const missoesDoGrupo = g => MISSOES.filter(m => m.grupo === g);
export const missaoDoAlvo = inimigoId => MISSOES.filter(m => m.alvo.inimigo === inimigoId);
