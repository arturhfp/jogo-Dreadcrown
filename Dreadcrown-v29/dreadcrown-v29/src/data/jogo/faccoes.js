// As 14 facções do mundo (docs/LORE.md, seção 5). Dado puro: ajuste textos livremente.
//   categoria: 'racial' | 'racista' | 'mista' | 'selo-protege' | 'selo-destroi' | 'poder-do-louco'
//   racas: raças de origem ([] = mista).  alvos: raças perseguidas (só racistas; [] = ainda a definir no LORE).
//   posicaoSelo: 'manter' | 'destruir' | 'usar' | 'neutra' | 'dividida' | 'ambigua'
export const CATEGORIAS_FACCAO = ['racial', 'racista', 'mista', 'selo-protege', 'selo-destroi', 'poder-do-louco'];
export const POSICOES_SELO = ['manter', 'destruir', 'usar', 'neutra', 'dividida', 'ambigua'];

export const FACCOES = [
  // ---- uma por raça (5)
  { id: 'concordia', nome: 'Concórdia dos Reinos', categoria: 'racial', racas: ['humano'], alvos: [], posicaoSelo: 'manter', descricao: 'Cidades-estado aliadas por tratados; política, comércio e fé. Decidem em conselho e tendem a adiar o que custa caro.' },
  { id: 'concilio-prata', nome: 'Concílio Prata', categoria: 'racial', racas: ['elfo'], alvos: [], posicaoSelo: 'manter', descricao: 'Arquivistas longevos que guardam o saber dos selantes e só o entregam a quem julgam digno.' },
  { id: 'pedra-funda', nome: 'Clã Pedra-Funda', categoria: 'racial', racas: ['anao'], alvos: [], posicaoSelo: 'manter', descricao: 'Forjadores das âncoras do selo. Vivem por contrato e honra; aceitam ajuda de quem prova valor.' },
  { id: 'hordas-cinzentas', nome: 'Hordas Cinzentas', categoria: 'racial', racas: ['orc'], alvos: [], posicaoSelo: 'dividida', descricao: 'Clãs de juramento e prova em combate. Juraram vingança contra os que os perseguem; parte quer proteger os seus, parte cobiça poder.' },
  { id: 'filhos-da-brasa', nome: 'Filhos da Brasa', categoria: 'racial', racas: ['tiefling'], alvos: [], posicaoSelo: 'dividida', descricao: 'Comunidade perseguida de sangue infernal. Uma ala só quer sobreviver; outra vê no sangue uma ponte para o poder do Louco.' },
  // ---- racistas (3), cada uma com alvos diferentes
  { id: 'cruzada-da-pureza', nome: 'Cruzada da Pureza', categoria: 'racista', racas: ['humano'], alvos: ['tiefling', 'orc'], posicaoSelo: 'manter', descricao: 'Culpam tieflings e orcs pelo enfraquecimento do selo; perseguem e queimam aldeias.' },
  { id: 'folha-eterna', nome: 'Círculo da Folha Eterna', categoria: 'racista', racas: ['elfo'], alvos: ['humano'], posicaoSelo: 'neutra', descricao: 'Isolacionistas que desprezam humanos e mestiços ("vida curta, mente curta"); fecham florestas e matam intrusos.' },
  { id: 'sangue-primeiro', nome: 'Sangue Primeiro', categoria: 'racista', racas: ['orc', 'tiefling'], alvos: [], posicaoSelo: 'usar', descricao: 'Defendem que os "povos fracos" devem ser dominados; controlam estradas e cobram tributo à força. Quais povos considera fracos: a definir.' },
  // ---- mistas (3)
  { id: 'cinco-cofres', nome: 'Guilda dos Cinco Cofres', categoria: 'mista', racas: [], alvos: [], posicaoSelo: 'neutra', descricao: 'Mercadores de várias raças que operam acampamentos e rotas; neutros por lucro.' },
  { id: 'cinzas', nome: 'Ordem das Cinzas', categoria: 'mista', racas: [], alvos: [], posicaoSelo: 'ambigua', descricao: 'Necromantes e eruditos das Terras Mortas; estudam a morte e o selo como poder; aliam-se por conveniência.' },
  { id: 'andarilhos', nome: 'Companhia dos Andarilhos', categoria: 'mista', racas: [], alvos: [], posicaoSelo: 'neutra', descricao: 'Mercenários, caçadores e refugiados de qualquer raça; contratos pelo caminho; leais ao grupo antes de qualquer causa.' },
  // ---- selo e Louco (3)
  { id: 'vigilia', nome: 'Vigília do Selo', categoria: 'selo-protege', racas: [], alvos: [], posicaoSelo: 'manter', descricao: 'Ordem que protege e cuida do selo: "nada vale mais que o selo", mesmo por meios cruéis.' },
  { id: 'culto', nome: 'Culto do Rei Desperto', categoria: 'selo-destroi', racas: [], alvos: [], posicaoSelo: 'destruir', descricao: 'Quer destruir o selo e libertar o Louco; recruta feridos e desesperados. Os comuns são vítimas; os líderes, fanáticos.' },
  { id: 'legiao', nome: 'Legião Rubra', categoria: 'poder-do-louco', racas: [], alvos: [], posicaoSelo: 'usar', descricao: 'Restos de um exército na Fortaleza Rubra; querem tomar o poder do Louco para si, como arma ou ocupando o lugar dele.' }
];
export const faccaoPorId = id => FACCOES.find(f => f.id === id) ?? null;
