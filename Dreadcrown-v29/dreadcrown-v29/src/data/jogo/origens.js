// Origens sorteáveis na criação do personagem (docs/LORE.md, seção 8).
// `bonus` usa SÓ atributos já existentes (hp, mana, stam, pow, mag, dex, arm) e é somado em rules/heroi.js (criarHeroi/recalcular).
// `reputacao`: reputação inicial com facções (efeito de história, não de combate). `linhagem`: primeiro sinal da linhagem da coroa.
// `peso`: chance relativa no sorteio (todos iguais por padrão; mude aqui para tornar uma origem rara).
export const ORIGENS = [
  { id: 'aldeia-queimada', nome: 'Sobrevivente da aldeia queimada', historia: 'Sua aldeia foi atacada por fanáticos.', bonus: { hp: 6, arm: 1 }, reputacao: { vigilia: 1, 'cruzada-da-pureza': -1 }, peso: 1 },
  { id: 'orfao-do-culto', nome: 'Órfão do Culto', historia: 'Criado entre cultistas, você fugiu.', bonus: { mag: 1, mana: 4 }, reputacao: { culto: -1, andarilhos: 1 }, peso: 1 },
  { id: 'ex-legionario', nome: 'Ex-soldado da Legião', historia: 'Você desertou da Fortaleza Rubra.', bonus: { pow: 1, arm: 1 }, reputacao: { legiao: -1, concordia: 1 }, peso: 1 },
  { id: 'aprendiz-das-forjas', nome: 'Aprendiz das forjas', historia: 'Cresceu entre as forjas dos anões.', bonus: { arm: 2 }, reputacao: { 'pedra-funda': 1 }, peso: 1 },
  { id: 'pupilo-do-arquivo', nome: 'Pupilo do arquivo', historia: 'Estudou os registros élficos.', bonus: { mag: 1, dex: 1 }, reputacao: { 'concilio-prata': 1 }, peso: 1 },
  { id: 'sangue-de-cla', nome: 'Sangue de clã', historia: 'Filho dos clãs de juramento.', bonus: { pow: 1, stam: 4 }, reputacao: { 'hordas-cinzentas': 1 }, peso: 1 },
  { id: 'marcado-pela-brasa', nome: 'Marcado pela brasa', historia: 'Perseguido pela herança infernal.', bonus: { mag: 1, dex: 1 }, reputacao: { 'filhos-da-brasa': 1, 'cruzada-da-pureza': -1 }, peso: 1 },
  { id: 'filho-de-caravana', nome: 'Filho de caravana', historia: 'Cresceu na estrada.', bonus: { stam: 4, dex: 1 }, reputacao: { 'cinco-cofres': 1 }, peso: 1 },
  { id: 'tocado-pela-morte', nome: 'Tocado pela morte', historia: 'Voltou de um quase-fim.', bonus: { hp: 4, mana: 4 }, reputacao: { cinzas: 1, vigilia: -1 }, peso: 1 },
  { id: 'herdeiro-sem-nome', nome: 'Herdeiro sem nome', historia: 'Não conhece a própria origem; sinais da linhagem aparecem em sonhos.', bonus: { mana: 2, mag: 1 }, reputacao: {}, linhagem: 'pista', peso: 1 }
];
export const ATRIBUTOS_ORIGEM = ['hp', 'mana', 'stam', 'pow', 'mag', 'dex', 'arm'];
export const origemPorId = id => ORIGENS.find(o => o.id === id) ?? null;
export const textoBonus = o => o ? Object.entries(o.bonus).map(([k, v]) => `+${v} ${({ hp: 'Vida', mana: 'Mana', stam: 'Stamina', pow: 'Poder', mag: 'Magia', dex: 'Destreza', arm: 'ARM' })[k]}`).join(', ') : '';
