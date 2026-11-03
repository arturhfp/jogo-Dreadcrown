// Identidade mecânica de cada classe (passivas). Dado puro: ajuste os números livremente.
// A lógica que lê estes campos está em src/rules/classes.js.
//   reducaoRecebida   fração do dano recebido que é ignorada
//   reducaoComEscudo  idem, só enquanto houver escudo
//   escudoPorHabilidade {base, mag, arm}  escudo ganho ao usar habilidade
//   penetracao        fração da armadura do inimigo ignorada ({magia, basico, habilidade})
//   manaTurno / regenPct   recuperação ao fim de cada turno (Mana fixa / % da Vida máxima)
//   bonusCura         bônus nas curas do próprio herói
//   crit {chance, dex, mult}  crítico (chance base + dex*dex); nunca consome sorteio se a classe não tem crítico
//   contraIncapacitado / vidaCheia   bônus de dano contra alvo incapacitado / com vida cheia
//   bonusD20 / marcarChance  ataque básico: bônus no D20 e chance de marcar o alvo
export const KIT_CLASSES = {
  tanke: { nome: 'Bastião', descricao: 'Ignora 15% de todo dano recebido; habilidades dão Escudo igual a 25% da ARM.', reducaoRecebida: 0.15, escudoPorHabilidade: { arm: 0.25 } },
  mago: { nome: 'Fluxo Arcano', descricao: 'Magias ignoram 25% da armadura; +3 Mana por turno; crítico arcano de 10% (x1.5).', penetracao: { magia: 0.25 }, manaTurno: 3, crit: { chance: 0.10, dex: 0, mult: 1.5 } },
  paladino: { nome: 'Juramento Radiante', descricao: 'Habilidades concedem Escudo (4 + Magia/2); com Escudo ativo, recebe 20% menos dano.', escudoPorHabilidade: { base: 4, mag: 0.5 }, reducaoComEscudo: 0.2 },
  clerigo: { nome: 'Graça Sagrada', descricao: 'Regenera 4% da Vida máxima por turno; curas do herói +25%.', regenPct: 0.04, bonusCura: 0.25 },
  assassino: { nome: 'Golpe Fatal', descricao: 'Crítico de 20% (+1% por Destreza) causa x1.7; +30% contra incapacitados; +25% contra alvo com vida cheia.', crit: { chance: 0.20, dex: 0.01, mult: 1.7 }, contraIncapacitado: 0.3, vidaCheia: 0.25 },
  arqueiro: { nome: 'Olho de Águia', descricao: 'Ataque básico com +3 no D20; ataques ignoram 15% da armadura; acertos básicos marcam o alvo (30%).', penetracao: { basico: 0.15, habilidade: 0.15 }, bonusD20: 3, marcarChance: 0.3 }
};
