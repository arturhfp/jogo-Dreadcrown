// Inimigos do jogo (stats, recompensa, tier e tema).
// Dados extraídos do bundle original; agora são a fonte da verdade (editável).

export const INIMIGOS = [
  {"name":"Goblin Saqueador","type":"Comum","area":"Estrada Quebrada","kind":"goblin","hp":48,"dmg":6,"armor":0,"reward":[10,18],"lore":"Pequeno, oportunista e pouco resistente.","tier":"weak","theme":"nature"},
  {"name":"Slime Azul","type":"Comum","area":"Pântano Raso","kind":"slime","hp":56,"dmg":5,"armor":0,"reward":[9,17],"lore":"Lento, mas difícil de acertar com golpes fracos.","tier":"weak","theme":"ice"},
  {"name":"Lobo Cinzento","type":"Comum","area":"Bosque Frio","kind":"wolf","hp":52,"dmg":7,"armor":1,"reward":[11,19],"lore":"Rápido e agressivo, mas frágil.","tier":"weak","theme":"nature"},
  {"name":"Esqueleto Errante","type":"Comum","area":"Cemitério Antigo","kind":"skeleton","hp":60,"dmg":6,"armor":1,"reward":[12,20],"lore":"Um morto-vivo básico das ruínas.","tier":"weak","theme":"dark"},
  {"name":"Morcego Gigante","type":"Comum","area":"Caverna Baixa","kind":"bat","hp":44,"dmg":6,"armor":0,"reward":[10,17],"lore":"Ataca em rasantes rápidos.","tier":"weak","theme":"shadow"},
  {"name":"Aranha do Vazio","type":"Aberração","area":"Cavernas Negras","kind":"spider","hp":92,"dmg":9,"armor":2,"reward":[24,38],"lore":"Venenosa e perigosa.","tier":"medium","theme":"poison"},
  {"name":"Cultista Carmesim","type":"Feiticeiro","area":"Catacumbas","kind":"cultist","hp":86,"dmg":10,"armor":1,"reward":[26,40],"lore":"Usa rituais e magia sombria.","tier":"medium","theme":"dark"},
  {"name":"Harpia Tempestuosa","type":"Predador","area":"Picos Ventosos","kind":"harpy","hp":82,"dmg":9,"armor":1,"reward":[24,37],"lore":"Alta mobilidade e ataques rápidos.","tier":"medium","theme":"lightning"},
  {"name":"Mímico Ancestral","type":"Anomalia","area":"Salão do Tesouro","kind":"mimic","hp":108,"dmg":10,"armor":3,"reward":[30,45],"lore":"Resistente e imprevisível.","tier":"medium","theme":"physical"},
  {"name":"Ogro de Pedra","type":"Brutamontes","area":"Passo Rochoso","kind":"ogre","hp":118,"dmg":11,"armor":3,"reward":[32,48],"lore":"Lento, pesado e perigoso.","tier":"medium","theme":"physical"},
  {"name":"Orc de Guerra","type":"Elite","area":"Fortaleza Rubra","kind":"orc","hp":155,"dmg":12,"armor":4,"reward":[52,76],"lore":"Veterano de muitas batalhas.","tier":"strong","theme":"physical"},
  {"name":"Golem de Pedra","type":"Guardião","area":"Templo Partido","kind":"stone","hp":185,"dmg":13,"armor":6,"reward":[58,82],"lore":"Muita armadura e golpes devastadores.","tier":"strong","theme":"physical"},
  {"name":"Basilisco Esmeralda","type":"Elite","area":"Ruínas Profundas","kind":"basilisk","hp":172,"dmg":14,"armor":4,"reward":[60,88],"lore":"Olhar paralisante e escamas resistentes.","tier":"strong","theme":"nature"},
  {"name":"Cavaleiro Abissal","type":"Chefe menor","area":"Portão Negro","kind":"knight","hp":205,"dmg":14,"armor":7,"reward":[68,96],"lore":"Um guerreiro corrompido com armadura pesada.","tier":"strong","theme":"dark"},
  {"name":"Demônio de Chifres","type":"Chefe final","area":"Fenda Infernal","kind":"demon","hp":225,"dmg":15,"armor":5,"reward":[75,105],"lore":"A ameaça final, trazida pelo Modo ADM.","tier":"strong","theme":"fire"}
];

