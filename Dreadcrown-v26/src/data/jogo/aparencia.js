// Aparência: valores padrão, opções do editor, paleta por classe e cor por tema elemental.
// Dados extraídos do bundle original; agora editáveis.

export const APARENCIA_PADRAO = {
  "gender": "masculino",
  "bodyType": "atletico",
  "heightType": "medio",
  "stance": "heroica",
  "skinTone": "medio",
  "raceFeature": "Traços humanos",
  "racePattern": "Sem padrão",
  "buildDetail": "Natural",
  "faceShape": "oval",
  "eyeShape": "normal",
  "eyeColor": "#bcecff",
  "browStyle": "fortes",
  "noseStyle": "reto",
  "mouthStyle": "neutra",
  "marking": "nenhuma",
  "hairStyle": "curto",
  "hairColor": "#111820",
  "beard": "nenhuma",
  "accessory": "nenhum",
  "armorStyle": "fortaleza",
  "shoulders": "medias",
  "cape": "nao",
  "gloves": "manoplas",
  "boots": "aventureiro",
  "chestDetail": "emblema",
  "material": "aco",
  "palettePreset": "branch",
  "armorColor": "#536878",
  "secondaryColor": "#182631",
  "accentColor": "#d3b15d",
  "metalColor": "#c4d1dc",
  "auraColor": "#78a9d4"
};

export const OPCOES_APARENCIA = {
  "gender": [
    "Masculino",
    "Feminino"
  ],
  "bodyType": [
    "Leve",
    "Atlético",
    "Robusto"
  ],
  "heightType": [
    "Baixo",
    "Médio",
    "Alto"
  ],
  "stance": [
    "Heroica",
    "Defensiva",
    "Arcana",
    "Furtiva"
  ],
  "buildDetail": [
    "Natural",
    "Cicatrizes de batalha",
    "Runas corporais",
    "Tatuagens"
  ],
  "faceShape": [
    "Oval",
    "Angular",
    "Quadrado",
    "Largo",
    "Estreito"
  ],
  "eyeShape": [
    "Normais",
    "Afiados",
    "Suaves",
    "Estreitos"
  ],
  "browStyle": [
    "Retas",
    "Arqueadas",
    "Fortes",
    "Finas"
  ],
  "noseStyle": [
    "Curto",
    "Reto",
    "Largo",
    "Aquilino"
  ],
  "mouthStyle": [
    "Neutra",
    "Séria",
    "Leve sorriso",
    "Cicatriz no lábio"
  ],
  "marking": [
    "Nenhuma",
    "Cicatriz",
    "Runa",
    "Pintura de guerra",
    "Tatuagem",
    "Marca de queimadura"
  ],
  "hairStyle": [
    "Curto de aventureiro",
    "Undercut",
    "Longo",
    "Ondulado",
    "Rabo de cavalo",
    "Moicano",
    "Tranças",
    "Trança de guerreiro",
    "Careca"
  ],
  "beard": [
    "Nenhuma",
    "Barba por fazer",
    "Barba curta",
    "Barba longa",
    "Barba trançada",
    "Máscara"
  ],
  "accessory": [
    "Nenhum",
    "Capuz",
    "Diadema",
    "Bandana",
    "Visor",
    "Tiara rúnica",
    "Meia máscara"
  ],
  "armorStyle": [
    "Fortaleza de Aço",
    "Armadura de Cerco",
    "Bastião Rúnico"
  ],
  "shoulders": [
    "Sem ombreiras",
    "Leves",
    "Médias",
    "Pesadas",
    "Assimétrica"
  ],
  "cape": [
    "Sem capa",
    "Manto de um ombro",
    "Capa curta",
    "Capa longa",
    "Capa desgastada"
  ],
  "gloves": [
    "Luvas simples",
    "Manoplas",
    "Couro reforçado",
    "Luvas rúnicas",
    "Sem luvas"
  ],
  "boots": [
    "Botas de aventureiro",
    "Grevas de placas",
    "Botas leves",
    "Botas rituais"
  ],
  "chestDetail": [
    "Emblema da classe",
    "Runas",
    "Faixas / correias",
    "Gemas",
    "Sem detalhe"
  ],
  "material": [
    "Aço temperado",
    "Aço negro",
    "Couro trabalhado",
    "Tecido reforçado",
    "Liga arcana",
    "Metal dourado"
  ],
  "palettePreset": [
    "Fiel à ramificação",
    "Clássica da classe",
    "Veterano / desgastado",
    "Personalizada"
  ]
};

export const PALETA_CLASSE = {
  "tanke": {
    "armorColor": "#536878",
    "secondaryColor": "#182631",
    "accentColor": "#d3b15d",
    "metalColor": "#c4d1dc",
    "auraColor": "#78a9d4"
  },
  "mago": {
    "armorColor": "#384f78",
    "secondaryColor": "#171c31",
    "accentColor": "#7fd2e8",
    "metalColor": "#a9b9cb",
    "auraColor": "#78dfff"
  },
  "paladino": {
    "armorColor": "#d9d2bb",
    "secondaryColor": "#33465d",
    "accentColor": "#e6c45e",
    "metalColor": "#eff3f4",
    "auraColor": "#fff0a2"
  },
  "clerigo": {
    "armorColor": "#d8e2d7",
    "secondaryColor": "#325356",
    "accentColor": "#d5bc71",
    "metalColor": "#cdd7d8",
    "auraColor": "#91e8d5"
  },
  "assassino": {
    "armorColor": "#262a38",
    "secondaryColor": "#0b0d13",
    "accentColor": "#7955a8",
    "metalColor": "#7b8592",
    "auraColor": "#a56ce0"
  },
  "arqueiro": {
    "armorColor": "#4d6649",
    "secondaryColor": "#1d2c23",
    "accentColor": "#bd965b",
    "metalColor": "#7e8b83",
    "auraColor": "#7bd69a"
  }
};

export const COR_TEMA = {
  "physical": "#c9a36b",
  "fire": "#ef744c",
  "ice": "#76dbea",
  "lightning": "#f2d26b",
  "dark": "#ad79e0",
  "holy": "#f4df95",
  "nature": "#80d29d",
  "astral": "#9b8df5",
  "poison": "#a9de6e",
  "shadow": "#827af2",
  "blood": "#de6267",
  "ghost": "#a9d9ef",
  "elemental": "#6edaff"
};

export const ROTULOS_CAMPOS = {
  gender: "Personagem", bodyType: "Tipo físico", heightType: "Altura", stance: "Postura", skinTone: "Cor racial / pele", raceFeature: "Traço racial", racePattern: "Padrão racial", buildDetail: "Constituição visual",
  faceShape: "Formato do rosto", eyeShape: "Olhos", eyeColor: "Cor dos olhos", browStyle: "Sobrancelhas", noseStyle: "Nariz", mouthStyle: "Boca", marking: "Marca facial",
  hairStyle: "Cabelo", hairColor: "Cor do cabelo", beard: "Barba / máscara", accessory: "Acessório de cabeça",
  armorStyle: "Conjunto da classe", shoulders: "Ombreiras", cape: "Capa / manto", gloves: "Luvas", boots: "Botas", chestDetail: "Detalhe do peito",
  palettePreset: "Paleta", material: "Material principal", armorColor: "Cor principal", secondaryColor: "Cor secundária", accentColor: "Detalhes / tecido", metalColor: "Metal", auraColor: "Aura / magia"
};
export const GRUPOS_EDITOR = {
  body: ["gender", "bodyType", "heightType", "stance", "skinTone", "raceFeature", "racePattern", "buildDetail"],
  face: ["faceShape", "eyeShape", "eyeColor", "browStyle", "noseStyle", "mouthStyle", "marking"],
  hair: ["hairStyle", "hairColor", "beard", "accessory"],
  gear: ["armorStyle", "shoulders", "cape", "gloves", "boots", "chestDetail"],
  colors: ["palettePreset", "material", "armorColor", "secondaryColor", "accentColor", "metalColor", "auraColor"]
};
export const CAMPOS_COR = ["eyeColor", "hairColor", "armorColor", "secondaryColor", "accentColor", "metalColor", "auraColor"];
export const ROTULOS_ABAS = { body: "Corpo", face: "Rosto", hair: "Cabelo", gear: "Equipamento", colors: "Cores & materiais" };
