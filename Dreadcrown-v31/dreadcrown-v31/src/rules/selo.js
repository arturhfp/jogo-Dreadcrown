// Estado do Selo (v29): Firme → Rachado → Partido → Aberto. Nesta versão NENHUM evento do jogo muda o selo automaticamente;
// as funções abaixo são os ganchos para missões e escolhas futuras.
export const ESTADOS_SELO = ['firme', 'rachado', 'partido', 'aberto'];
export const ROTULO_SELO = { firme: 'Firme', rachado: 'Rachado', partido: 'Partido', aberto: 'Aberto' };
export const seloValido = s => ESTADOS_SELO.includes(s);
/** Move o selo `passos` posições (positivo = enfraquece, negativo = restaura), sem sair dos limites. Estado inválido devolve ok:false. */
export function moverSelo(selo, passos = 1) {
  if (!seloValido(selo) || !Number.isInteger(passos)) return { ok: false, selo };
  const i = Math.max(0, Math.min(ESTADOS_SELO.length - 1, ESTADOS_SELO.indexOf(selo) + passos));
  return { ok: true, selo: ESTADOS_SELO[i], mudou: ESTADOS_SELO[i] !== selo };
}
export const enfraquecerSelo = (s, n = 1) => moverSelo(s, Math.abs(n));
export const restaurarSelo = (s, n = 1) => moverSelo(s, -Math.abs(n));
