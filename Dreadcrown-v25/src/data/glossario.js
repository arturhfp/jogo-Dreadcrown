// Glossário de renomeação do mundo do jogo. EDITE AQUI para mudar termos em todo o jogo.
// Regras aplicadas em ordem; cada uma é [expressão, substituição].
// Mantemos "Abissal/Abissais" (adjetivo de lore) e identificadores internos (ids, classes CSS).
export const REGRAS_GLOSSARIO = [
  [/\bdo Abismo\b/g, 'de Dreadcrown'],
  [/\bda Abismo\b/g, 'de Dreadcrown'],
  [/\bAbismo\b/g, 'Dreadcrown']
];
export function aplicarGlossario(texto) {
  if (typeof texto !== 'string') return texto;
  let t = texto;
  for (const [re, sub] of REGRAS_GLOSSARIO) t = t.replace(re, sub);
  return t;
}
