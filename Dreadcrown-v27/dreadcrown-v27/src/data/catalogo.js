/* =====================================================================
   Catálogo de dados visuais e de ações
   ---------------------------------------------------------------------
   RESPONSABILIDADE: Tabelas de dados que ligam o jogo ao motor 3D: inimigos, subclasses (BRANCHES), temas elementais (BRTHEME), cores por raça/classe/subclasse, qual animação cada habilidade usa (HERO_ACT) e tempos de puxada do arco.
   RELAÇÃO COM OUTROS MÓDULOS: Só usa util.js. É lido por personagens, efeitos, combate3d e pela ponte com a interface.
   API PÚBLICA: ENEMIES, BRANCHES, BRTHEME, RACE, CLASSCOL, BRCOL, themeOf(classe, ramo), RACES/CLS (detecção por texto), HERO_ACT, ENEMY_ACT, MELEE_CLS, ARCH_LEAD, HERO_ARCH.
   REGRAS / CUIDADOS: Os NOMES de subclasses precisam ser idênticos aos do jogo (são usados para descobrir o tema/cor); se mudar um nome no jogo, mude aqui. Para ajustar qual animação uma habilidade usa, edite HERO_ACT.
   ===================================================================== */


const ENEMIES = [{"name": "Goblin Saqueador", "kind": "goblin", "tier": "weak", "theme": "nature", "type": "Comum"}, {"name": "Slime Azul", "kind": "slime", "tier": "weak", "theme": "ice", "type": "Comum"}, {"name": "Lobo Cinzento", "kind": "wolf", "tier": "weak", "theme": "nature", "type": "Comum"}, {"name": "Esqueleto Errante", "kind": "skeleton", "tier": "weak", "theme": "dark", "type": "Comum"}, {"name": "Morcego Gigante", "kind": "bat", "tier": "weak", "theme": "shadow", "type": "Comum"}, {"name": "Aranha do Vazio", "kind": "spider", "tier": "medium", "theme": "poison", "type": "Aberração"}, {"name": "Cultista Carmesim", "kind": "cultist", "tier": "medium", "theme": "dark", "type": "Feiticeiro"}, {"name": "Harpia Tempestuosa", "kind": "harpy", "tier": "medium", "theme": "lightning", "type": "Predador"}, {"name": "Mímico Ancestral", "kind": "mimic", "tier": "medium", "theme": "physical", "type": "Anomalia"}, {"name": "Ogro de Pedra", "kind": "ogre", "tier": "medium", "theme": "physical", "type": "Brutamontes"}, {"name": "Orc de Guerra", "kind": "orc", "tier": "strong", "theme": "physical", "type": "Elite"}, {"name": "Golem de Pedra", "kind": "stone", "tier": "strong", "theme": "physical", "type": "Guardião"}, {"name": "Basilisco Esmeralda", "kind": "basilisk", "tier": "strong", "theme": "nature", "type": "Elite"}, {"name": "Cavaleiro Abissal", "kind": "knight", "tier": "strong", "theme": "dark", "type": "Chefe menor"}, {"name": "Demônio de Chifres", "kind": "demon", "tier": "strong", "theme": "fire", "type": "Chefe final"}];
const BRTHEME = {"Colosso Pesado": "physical", "Guardião Arcano": "astral", "Berserker": "fire", "Cavaleiro de Espinhos": "nature", "Vanguarda de Cerco": "physical", "Piromante": "fire", "Criomante": "ice", "Eletromante": "lightning", "Necromante": "dark", "Mago Astral": "astral", "Juramento da Devoção": "holy", "Algoz Caído": "dark", "Draconiano": "fire", "Templário Solene": "holy", "Inquisidor": "holy", "Sacerdote da Igreja": "holy", "Ocultista": "dark", "Bestial": "nature", "Monge de Batalha": "physical", "Oráculo": "holy", "Assassino das Sombras": "dark", "Mestre dos Venenos": "poison", "Ninja / Shinobi": "shadow", "Carrasco Sangrento": "blood", "Espadachim Fantasma": "ghost", "Atirador de Elite": "physical", "Caçador de Feras": "nature", "Arqueiro Elemental": "elemental", "Patrulheiro da Floresta": "nature", "Arqueiro Acrobático": "physical"};
const BRANCHES = {
  tanke: ['Colosso Pesado', 'Guardião Arcano', 'Berserker', 'Cavaleiro de Espinhos', 'Vanguarda de Cerco'],
  mago: ['Piromante', 'Criomante', 'Eletromante', 'Necromante', 'Mago Astral'],
  paladino: ['Juramento da Devoção', 'Algoz Caído', 'Draconiano', 'Templário Solene', 'Inquisidor'],
  clerigo: ['Sacerdote da Igreja', 'Ocultista', 'Bestial', 'Monge de Batalha', 'Oráculo'],
  assassino: ['Assassino das Sombras', 'Mestre dos Venenos', 'Ninja / Shinobi', 'Carrasco Sangrento', 'Espadachim Fantasma'],
  arqueiro: ['Atirador de Elite', 'Caçador de Feras', 'Arqueiro Elemental', 'Patrulheiro da Floresta', 'Arqueiro Acrobático']
};
const ARCH_LEAD = { draw: 1.25, snap: .27, triple: .2, rapid: .12, flipshot: .36, shoot: .35 };
const HERO_ARCH = { snap: 1, triple: 1, flipshot: 1, rapid: 1, draw: 1, shoot: 1 };

const RACE = {
  humano: { skin: '#e2b48f', s: 1, w: 1, ears: 0 }, elfo: { skin: '#ecd2b4', s: 1.07, w: .88, ears: 1 }, anao: { skin: '#d79a74', s: .78, w: 1.3, ears: 0, beard: '#a8501c' },
  tiefling: { skin: '#b4455f', s: 1.03, w: 1, ears: 1, horns: 1, tail: 1 }, orc: { skin: '#6c9a4c', s: 1.15, w: 1.25, ears: 0, tusks: 1 }
};
const CLASSCOL = { tanke: '#78a9d4', mago: '#7fd2e8', paladino: '#f4df95', clerigo: '#91e8d5', assassino: '#a56ce0', arqueiro: '#7bd69a' };
const BRCOL = {
  tanke: ['#c9a36b', '#6aa8ff', '#de6267', '#80d29d', '#e4b65f'], mago: ['#ef744c', '#76dbea', '#f2d26b', '#ad79e0', '#7aa7ff'], paladino: ['#f4df95', '#de4a4a', '#4aa3ff', '#b58cf0', '#6fe08a'],
  clerigo: ['#f4df95', '#a56ce0', '#80d29d', '#e0663c', '#5fc8ff'], assassino: ['#8a6ee0', '#8fe05a', '#5a8cff', '#e0434b', '#7fe0ff'], arqueiro: ['#f0a63c', '#6fc07a', '#4fa8ff', '#7fd06a', '#b27cf0']
};
function themeOf(cls, br) { const n = (BRANCHES[cls] || [])[br]; return (n && BRTHEME[n]) || ({ tanke: 'physical', mago: 'astral', paladino: 'holy', clerigo: 'holy', assassino: 'shadow', arqueiro: 'nature' })[cls] || 'physical'; }
const RACES = [[/Humano/i, 'humano'], [/Elfo/i, 'elfo'], [/An[ãa]o/i, 'anao'], [/Orc/i, 'orc'], [/Tiefling/i, 'tiefling']];
const CLS = [[/Tank/i, 'tanke'], [/Mago/i, 'mago'], [/Paladino/i, 'paladino'], [/Cl[ée]rigo/i, 'clerigo'], [/Assassino/i, 'assassino'], [/Arqueiro/i, 'arqueiro']];
const pickRe = (list, t) => { for (const [re, k] of list) if (re.test(t)) return k; return null; };

/* ---------- ações do herói ---------- */
const HERO_ACT = {
  tanke: { basic: 'chop', common: 'bash', rare: 'slam', epic: 'whirl', legendary: 'leap', ultimate: 'slam' },
  paladino: { basic: 'thrust', common: 'melee2', rare: 'smite', epic: 'charge', legendary: 'leap', ultimate: 'ascend' },
  assassino: { basic: 'stab2', common: 'dash', rare: 'backflip', epic: 'flurry', legendary: 'dash', ultimate: 'vanish' },
  mago: { basic: 'flick', common: 'conjure', rare: 'staffslam', epic: 'channel', legendary: 'channel', ultimate: 'ascend' },
  clerigo: { basic: 'bless', common: 'open', rare: 'pray', epic: 'channel', legendary: 'open', ultimate: 'ascend' },
  arqueiro: { basic: 'snap', common: 'triple', rare: 'flipshot', epic: 'rapid', legendary: 'flipshot', ultimate: 'draw' }
};
const MELEE_CLS = { tanke: 1, paladino: 1, assassino: 1 };
const ENEMY_ACT = { slime: 'leap', bat: 'leap', harpy: 'leap', mimic: 'leap', cultist: 'cast', demon: 'melee2', knight: 'melee2', spider: 'leap', wolf: 'leap', basilisk: 'leap' };

export { ARCH_LEAD, BRANCHES, BRCOL, CLASSCOL, CLS, ENEMIES, ENEMY_ACT, HERO_ACT, HERO_ARCH, MELEE_CLS, RACE, RACES, pickRe, themeOf };
