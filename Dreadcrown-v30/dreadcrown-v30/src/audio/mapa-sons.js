// Mapeamento puro: evento do combate → descrição do som. Sem WebAudio aqui (testável em Node).
// Edite este arquivo para trocar timbres; o sintetizador (sintetizador.js) interpreta as receitas.
const TEMA_NOTA = { fire: 196, ice: 523, lightning: 392, astral: 294, dark: 98, holy: 440, physical: 130, nature: 220, poison: 165, shadow: 110, blood: 147, ghost: 330, elemental: 262 };

export function somDoEvento(ev, contexto = {}) {
  switch (ev.tipo) {
    case 'dano':
      if (ev.alvo === 'heroi') return { id: 'dano_heroi', receita: 'impacto', grave: 90, dur: 0.22, vol: 0.5 };
      if (ev.fonte === 'basico') return { id: ev.critico ? 'critico' : 'golpe', receita: 'impacto', grave: ev.critico ? 160 : 120, dur: ev.critico ? 0.35 : 0.18, vol: ev.critico ? 0.7 : 0.45, brilho: ev.critico };
      if (ev.fonte === 'suprema') return { id: 'suprema', receita: 'explosao', grave: 60, dur: 0.9, vol: 0.8 };
      if (['queimar', 'sangrar', 'envenenar', 'corromper'].includes(ev.fonte)) return { id: 'dot', receita: 'tick', nota: 180, dur: 0.12, vol: 0.25 };
      return { id: 'habilidade', receita: 'magia', nota: TEMA_NOTA[contexto.tema] || 220, dur: 0.5, vol: 0.55 };
    case 'erro': return { id: 'erro', receita: 'ar', dur: 0.25, vol: 0.3 };
    case 'esquiva': return { id: 'esquiva', receita: 'ar', dur: 0.3, vol: 0.35 };
    case 'postura': return { id: 'postura', receita: 'subida', nota: 330, dur: 0.2, vol: 0.3 };
    case 'cura': case 'pocao': case 'descanso': case 'tratamento': return { id: 'cura', receita: 'arpejo', nota: 440, dur: 0.6, vol: 0.4 };
    case 'escudo': return { id: 'escudo', receita: 'metal', nota: 600, dur: 0.3, vol: 0.35 };
    case 'status': return { id: 'status', receita: 'subida', nota: TEMA_NOTA[contexto.tema] || 250, dur: 0.25, vol: 0.3 };
    case 'vitoria': return { id: 'vitoria', receita: 'fanfarra', nota: 392, dur: 1.2, vol: 0.5 };
    case 'nivel': return { id: 'nivel', receita: 'arpejo', nota: 523, dur: 1.0, vol: 0.5 };
    case 'derrota': return { id: 'derrota', receita: 'queda', nota: 220, dur: 1.6, vol: 0.55 };
    case 'moedas': case 'achado': case 'compra': return { id: 'moeda', receita: 'metal', nota: 880, dur: 0.18, vol: 0.3 };
    case 'recusado': case 'invalido': return { id: 'negado', receita: 'queda', nota: 150, dur: 0.18, vol: 0.3 };
    default: return null;
  }
}
// Música ambiente generativa por situação.
export const AMBIENTES = {
  menu:    { raiz: 110, escala: [0, 3, 7, 10], bpm: 50, brilho: 0.25 },
  batalha: { raiz: 82.4, escala: [0, 1, 5, 7], bpm: 96, brilho: 0.5 },
  chefe:   { raiz: 55, escala: [0, 1, 6, 7], bpm: 110, brilho: 0.7 },
  acampamento: { raiz: 130.8, escala: [0, 4, 7, 9], bpm: 60, brilho: 0.2 },
  exploracao: { raiz: 98, escala: [0, 2, 7, 9], bpm: 56, brilho: 0.3 },
  exploracao_perigo: { raiz: 73.4, escala: [0, 3, 5, 7], bpm: 72, brilho: 0.45 }
};
