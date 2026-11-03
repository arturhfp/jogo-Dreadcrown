// Modelos de habilidades usados quando não há nome oficial (e para dano/custo/efeito textual).
// Tudo aqui é dado puro: ajuste números e textos sem tocar em lógica.

export const ESTILO_RACIAL = {
  humano:   { prefixo: 'Arcana',   efeito: '+4 Suprema ao fim do turno', papel: 'Mago' },
  elfo:     { prefixo: 'Élfica',   efeito: '+10% chance de acerto',      papel: 'Tecelão Arcano' },
  anao:     { prefixo: 'Rúnica',   efeito: '+8 ARM por 1 turno',         papel: 'Runomante' },
  orc:      { prefixo: 'Xamânica', efeito: '+12% dano físico',           papel: 'Xamã' },
  tiefling: { prefixo: 'Infernal', efeito: '+14% dano elemental',        papel: 'Bruxo Infernal' }
};
export const ESTILO_RACIAL_PADRAO = { prefixo: 'Ancestral', efeito: '+5% dano', papel: 'Adepto' };

export const ESTILO_CLASSE = {
  tanke:     { recurso: 'stam', tipo: 'controle e resistência',        escala: 1.15 },
  mago:      { recurso: 'mana', tipo: 'magia elemental e área',        escala: 1.35 },
  paladino:  { recurso: 'mana', tipo: 'luz, proteção e execução',      escala: 1.2 },
  clerigo:   { recurso: 'mana', tipo: 'cura, bênção e maldição',       escala: 1.1 },
  assassino: { recurso: 'stam', tipo: 'furtividade, crítico e veneno', escala: 1.3 },
  arqueiro:  { recurso: 'stam', tipo: 'alcance, precisão e elementos', escala: 1.25 }
};
export const ESTILO_CLASSE_PADRAO = { recurso: 'stam', tipo: 'combate', escala: 1 };

export const FOGO_RACIAL = {
  humano:   ['Faísca Imperial', 'Bola de Fogo Real', 'Coroa Solar', 'Supernova do Rei'],
  elfo:     ['Fagulha Élfica', 'Chama Lunar', 'Incêndio Astral', 'Sol da Floresta'],
  anao:     ['Brasa Rúnica', 'Martelo Incandescente', 'Forja Vulcânica', 'Coração da Montanha'],
  orc:      ['Brasa Xamânica', 'Fogo dos Ancestrais', 'Totem da Fúria', 'Solstício da Cinza'],
  tiefling: ['Fagulha Infernal', 'Bola de Fogo Infernal', 'Inferno Profano', 'Supernova Abissal']
};

export const CONJUNTO_FEITICOS = {
  fire:      ['Bola de Fogo', 'Explosão Carmesim', 'Chamas Devastadoras', 'Supernova'],
  ice:       ['Bola de Gelo', 'Lança Glacial', 'Nevasca da Devastação', 'Zero Absoluto'],
  lightning: ['Faísca Voltaica', 'Raio Encadeado', 'Tempestade do Trovão', 'Julgamento Celeste'],
  dark:      ['Toque Sombrio', 'Dreno de Essência', 'Ruptura do Abismo', 'Legião da Morte'],
  astral:    ['Estilhaço Estelar', 'Órbita Gravitacional', 'Colapso Galáctico', 'Explosão Galáctica'],
  holy:      ['Luz Sagrada', 'Lança Radiante', 'Aurora da Redenção', 'Milagre Celestial'],
  nature:    ['Raiz Selvagem', 'Espinhos Vivos', 'Tempestade da Floresta', 'Avatar Primordial'],
  poison:    ['Lâmina Tóxica', 'Nuvem Venenosa', 'Praga Mortal', 'Apocalipse Venéfico'],
  shadow:    ['Passo Sombrio', 'Lâmina de Névoa', 'Eclipse Umbral', 'Mil Cortes das Sombras'],
  blood:     ['Corte Rubro', 'Hemorragia Profunda', 'Fúria Sanguínea', 'Carnificina Carmesim'],
  ghost:     ['Corte Fantasma', 'Imagem Residual', 'Véu Espectral', 'Exército dos Ecos'],
  physical:  ['Golpe Brutal', 'Quebra-Guarda', 'Impacto Devastador', 'Ruptura Titânica'],
  elemental: ['Flecha Elemental', 'Rajada Elemental', 'Tempestade Elemental', 'Cataclismo Elemental']
};

export const VARIANTES_RACIAIS = {
  humano:   ['Arcano', 'Real', 'Supremo', 'Ascendente'],
  elfo:     ['Élfico', 'Lunar', 'Ancestral', 'Celestial'],
  anao:     ['Rúnico', 'da Forja', 'da Montanha', 'do Titã'],
  orc:      ['Xamânico', 'dos Ancestrais', 'do Totem', 'da Guerra'],
  tiefling: ['Infernal', 'Abissal', 'Profano', 'Demoníaco']
};
export const VARIANTES_PADRAO = ['Ancestral', 'Refinado', 'Supremo', 'Absoluto'];

export const ELEMENTO_MAGO = { Piromante: 'fire', Criomante: 'ice', Eletromante: 'lightning', 'Mago Astral': 'astral', Necromante: 'dark' };
export const FINAL_MAGO = { fire: 'Supernova', ice: 'Nevasca da Devastação', lightning: 'Apocalipse do Trovão', astral: 'Explosão Galáctica', dark: 'Eclipse da Morte' };

export const TITULOS_RARIDADE = {
  common:    ['Técnica', 'Arte', 'Golpe', 'Domínio'],
  rare:      ['Arcana', 'Refinada', 'Superior', 'Rúnica'],
  epic:      ['Devastadora', 'Suprema', 'Cataclísmica', 'Ascendente'],
  legendary: ['Lendária', 'Mítica', 'Apocalíptica', 'Absoluta']
};

export const DANO_BASE = { common: 22, rare: 58, epic: 115, legendary: 205 };
export const CUSTO_BASE = { common: 7, rare: 13, epic: 22, legendary: 36 };

export const EFEITO_POR_TEMA = {
  fire:      ['Queima por 1 turno.', 'Explode em área.', 'Reduz resistência ao fogo.', 'Causa queimadura massiva e +20 Suprema.'],
  ice:       ['Reduz velocidade.', 'Pode congelar.', 'Congela por 1 turno.', 'Grande chance de congelar e +20 Suprema.'],
  lightning: ['Atinge 1 alvo.', 'Salta para um alvo próximo.', 'Aumenta velocidade.', 'Pode atordoar e +20 Suprema.'],
  astral:    ['Marca o alvo.', 'Puxa o inimigo.', 'Cria uma zona gravitacional.', 'Explosão em área e +20 Suprema.'],
  dark:      ['Aplica corrupção.', 'Drena vida.', 'Invoca ecos sombrios.', 'Drena muito e +20 Suprema.'],
  holy:      ['Protege um aliado.', 'Cura parte da vida.', 'Remove um efeito negativo.', 'Cura em massa e +20 Suprema.'],
  physical:  ['Pode interromper.', 'Quebra defesa.', 'Atordoa brevemente.', 'Impacto massivo e +20 Suprema.'],
  nature:    ['Prende o alvo.', 'Aplica sangramento natural.', 'Cria área de espinhos.', 'Invoca força ancestral e +20 Suprema.'],
  poison:    ['Aplica veneno.', 'Dano contínuo.', 'Enfraquece cura recebida.', 'Veneno devastador e +20 Suprema.'],
  shadow:    ['Aumenta evasão.', 'Pode atacar pelas costas.', 'Cria uma cópia.', 'Golpe umbral massivo e +20 Suprema.'],
  blood:     ['Causa sangramento.', 'Recupera parte do dano.', 'Fica mais forte com pouca vida.', 'Carnificina massiva e +20 Suprema.'],
  ghost:     ['Atravessa parte da defesa.', 'Cria uma imagem.', 'Duplica o próximo golpe.', 'Invoca ecos e +20 Suprema.'],
  elemental: ['Aplica efeito elemental.', 'Atinge vários alvos.', 'Alterna elementos.', 'Cataclismo elemental e +20 Suprema.']
};

export const EXTRA_RACIAL = { humano: 'disciplina humana', elfo: 'afinidade élfica', anao: 'runa ancestral', orc: 'força xamânica', tiefling: 'essência infernal' };
export const RAMIFICACAO_PADRAO = { theme: 'physical', desc: 'Especialização de combate.', skills: ['Ataque Inicial', 'Técnica da Escola', 'Golpe Supremo'] };
