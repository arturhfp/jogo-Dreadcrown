// Conjuntos de armadura, raridades e slots.
// Dados extraídos do bundle original; agora são a fonte da verdade (editável).

export const CONJUNTOS = [
  {"classId":"mago","id":"mage-archmage","name":"Conjunto do Arquimago","effect":"Aumenta dano mágico e crítico de magia, mas reduz Vida máxima."},
  {"classId":"mago","id":"mage-mana-weaver","name":"Conjunto do Tecelão de Mana","effect":"Aumenta Mana máxima e regeneração passiva de Mana."},
  {"classId":"mago","id":"mage-battle-mage","name":"Conjunto do Mago de Batalha","effect":"Aumenta Vida e Defesa Física; facilita conjuração a curta distância."},
  {"classId":"tanke","id":"tank-wall","name":"Conjunto da Muralha","effect":"Aumenta Vida máxima e armadura física; regenera Vida fora de combate."},
  {"classId":"tanke","id":"tank-arcane-vanguard","name":"Conjunto do Vanguarda Arcano","effect":"Resiste a dano mágico e efeitos negativos; recupera um pouco de Vida ao receber magia."},
  {"classId":"tanke","id":"tank-thorn-provoker","name":"Conjunto do Provocador Espinhoso","effect":"Reflete 15% do dano físico recebido e aumenta Ameaça."},
  {"classId":"paladino","id":"paladin-inquisitor","name":"Conjunto do Inquisidor","effect":"Aumenta dano físico e mágico; ataques corpo a corpo causam dano sagrado extra."},
  {"classId":"paladino","id":"paladin-devout-guardian","name":"Conjunto do Guardião Devoto","effect":"Aumenta Vida e bloqueio; bloqueios curam o Paladino."},
  {"classId":"paladino","id":"paladin-radiant-herald","name":"Conjunto do Arauto Radiante","effect":"Aumenta Mana e alcance/potência das auras de suporte."},
  {"classId":"clerigo","id":"cleric-sacred-healer","name":"Conjunto do Curandeiro Sagrado","effect":"Aumenta Mana; habilidades de cura restauram 30% a mais de Vida."},
  {"classId":"clerigo","id":"cleric-war-priest","name":"Conjunto do Sacerdote de Guerra","effect":"Aumenta Vida e dano físico; dano físico cura o aliado mais ferido."},
  {"classId":"clerigo","id":"cleric-exorcist","name":"Conjunto do Exorcista","effect":"Aumenta dano mágico sagrado e reduz custo de Mana ofensivo."},
  {"classId":"assassino","id":"assassin-shadow-executioner","name":"Conjunto do Carrasco das Sombras","effect":"Aumenta dano físico e crítico; primeiro ataque furtivo ignora 50% da armadura."},
  {"classId":"assassino","id":"assassin-venom-blade","name":"Conjunto da Lâmina Peçonhenta","effect":"Adagas aplicam veneno/sombras e drenam Vida ao longo do tempo."},
  {"classId":"assassino","id":"assassin-agile-wraith","name":"Conjunto do Espectro Ágil","effect":"Aumenta movimento e esquiva; reduz recarga de invisibilidade."},
  {"classId":"arqueiro","id":"archer-sniper","name":"Conjunto do Franco-Atirador","effect":"Aumenta dano físico à distância e dano de flechas conforme a distância."},
  {"classId":"arqueiro","id":"archer-arcane","name":"Conjunto do Arqueiro Arcano","effect":"Converte ataques em projéteis mágicos com explosões elementais."},
  {"classId":"arqueiro","id":"archer-wild-ranger","name":"Conjunto do Patrulheiro Selvagem","effect":"Aumenta Vida e velocidade de ataque; permite atirar em movimento."}
];
export const RARIDADES_EQUIP = [
  {"id":"common","name":"Comum","mult":1,"price":45},
  {"id":"uncommon","name":"Incomum","mult":1.25,"price":85},
  {"id":"rare","name":"Raro","mult":1.6,"price":145},
  {"id":"epic","name":"Épico","mult":2.15,"price":260},
  {"id":"legendary","name":"Lendário","mult":3,"price":430},
  {"id":"mythic","name":"Mítico","mult":4.3,"price":760},
  {"id":"unique","name":"Único","mult":6,"price":1200}
];
export const SLOTS = [
  {"id":"helmet","label":"Elmo","def":2,"hp":5,"mana":2},
  {"id":"chest","label":"Armadura","def":5,"hp":14,"mana":4},
  {"id":"boots","label":"Botas","def":2,"hp":7,"mana":2},
  {"id":"accessory","label":"Relíquia","def":1,"hp":4,"mana":6}
];

