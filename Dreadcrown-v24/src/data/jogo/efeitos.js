// Efeitos MECÂNICOS das habilidades (antes eram só texto). Por tema e posição (0..3) da habilidade.
// Operações suportadas (ver rules/efeitos.js):
//   {op:'status', id, turnos, forca?}  aplica status ao inimigo (chance opcional: chance 0..1)
//   {op:'dano_extra', pct}             dano adicional imediato (% do dano da habilidade)
//   {op:'curar', pct}                  cura o herói (% do dano causado)
//   {op:'curar_max', pct}              cura o herói (% da vida máxima)
//   {op:'escudo', valor}               escudo ao herói
//   {op:'evasao', valor}               evasão (%) ao herói
//   {op:'ult', valor}                  energia de Suprema
// Status do inimigo: queimar, sangrar, envenenar (dano por turno), congelar/atordoar/prender (perde o turno),
// lentidao (-25% dano), quebrar_defesa (-armadura), marcar (+15% dano recebido), corromper (-cura/+dano contínuo).
export const EFEITOS_POR_TEMA = {
  fire: [
    [{ op: 'status', id: 'queimar', turnos: 1, forca: 0.2 }],
    [{ op: 'dano_extra', pct: 0.15 }, { op: 'status', id: 'queimar', turnos: 1, forca: 0.2 }],
    [{ op: 'status', id: 'quebrar_defesa', turnos: 2, forca: 0.2 }],
    [{ op: 'status', id: 'queimar', turnos: 3, forca: 0.3 }, { op: 'ult', valor: 20 }]
  ],
  ice: [
    [{ op: 'status', id: 'lentidao', turnos: 2 }],
    [{ op: 'status', id: 'congelar', turnos: 1, chance: 0.35 }, { op: 'status', id: 'lentidao', turnos: 1 }],
    [{ op: 'status', id: 'congelar', turnos: 1 }],
    [{ op: 'status', id: 'congelar', turnos: 1, chance: 0.75 }, { op: 'status', id: 'lentidao', turnos: 2 }, { op: 'ult', valor: 20 }]
  ],
  lightning: [
    [],
    [{ op: 'dano_extra', pct: 0.2 }],
    [{ op: 'evasao', valor: 20 }],
    [{ op: 'status', id: 'atordoar', turnos: 1, chance: 0.5 }, { op: 'ult', valor: 20 }]
  ],
  astral: [
    [{ op: 'status', id: 'marcar', turnos: 3 }],
    [{ op: 'status', id: 'lentidao', turnos: 1 }, { op: 'status', id: 'marcar', turnos: 2 }],
    [{ op: 'status', id: 'prender', turnos: 1, chance: 0.5 }, { op: 'status', id: 'marcar', turnos: 3 }],
    [{ op: 'dano_extra', pct: 0.3 }, { op: 'ult', valor: 20 }]
  ],
  dark: [
    [{ op: 'status', id: 'corromper', turnos: 2, forca: 0.15 }],
    [{ op: 'curar', pct: 0.3 }],
    [{ op: 'status', id: 'corromper', turnos: 3, forca: 0.2 }, { op: 'dano_extra', pct: 0.1 }],
    [{ op: 'curar', pct: 0.5 }, { op: 'ult', valor: 20 }]
  ],
  holy: [
    [{ op: 'escudo', valor: 12 }],
    [{ op: 'curar_max', pct: 0.1 }],
    [{ op: 'curar_max', pct: 0.08 }, { op: 'limpar_negativos' }],
    [{ op: 'curar_max', pct: 0.25 }, { op: 'ult', valor: 20 }]
  ],
  physical: [
    [{ op: 'status', id: 'atordoar', turnos: 1, chance: 0.2 }],
    [{ op: 'status', id: 'quebrar_defesa', turnos: 2, forca: 0.25 }],
    [{ op: 'status', id: 'atordoar', turnos: 1, chance: 0.6 }],
    [{ op: 'dano_extra', pct: 0.25 }, { op: 'ult', valor: 20 }]
  ],
  nature: [
    [{ op: 'status', id: 'prender', turnos: 1, chance: 0.5 }],
    [{ op: 'status', id: 'sangrar', turnos: 2, forca: 0.2 }],
    [{ op: 'status', id: 'lentidao', turnos: 2 }, { op: 'dano_extra', pct: 0.1 }],
    [{ op: 'curar_max', pct: 0.1 }, { op: 'status', id: 'sangrar', turnos: 3, forca: 0.25 }, { op: 'ult', valor: 20 }]
  ],
  poison: [
    [{ op: 'status', id: 'envenenar', turnos: 3, forca: 0.15 }],
    [{ op: 'status', id: 'envenenar', turnos: 4, forca: 0.2 }],
    [{ op: 'status', id: 'envenenar', turnos: 3, forca: 0.15 }, { op: 'status', id: 'corromper', turnos: 2, forca: 0.1 }],
    [{ op: 'status', id: 'envenenar', turnos: 5, forca: 0.3 }, { op: 'ult', valor: 20 }]
  ],
  shadow: [
    [{ op: 'evasao', valor: 25 }],
    [{ op: 'dano_extra', pct: 0.25 }],
    [{ op: 'dano_extra', pct: 0.4 }],
    [{ op: 'dano_extra', pct: 0.5 }, { op: 'ult', valor: 20 }]
  ],
  blood: [
    [{ op: 'status', id: 'sangrar', turnos: 3, forca: 0.2 }],
    [{ op: 'curar', pct: 0.25 }],
    [{ op: 'dano_extra', pct: 0.3, quando: 'vida_baixa' }],
    [{ op: 'status', id: 'sangrar', turnos: 3, forca: 0.3 }, { op: 'curar', pct: 0.3 }, { op: 'ult', valor: 20 }]
  ],
  ghost: [
    [{ op: 'dano_extra', pct: 0.15 }],
    [{ op: 'evasao', valor: 25 }],
    [{ op: 'dano_extra', pct: 0.35 }],
    [{ op: 'dano_extra', pct: 0.4 }, { op: 'ult', valor: 20 }]
  ],
  elemental: [
    [{ op: 'status', id: 'queimar', turnos: 1, forca: 0.15 }],
    [{ op: 'dano_extra', pct: 0.2 }],
    [{ op: 'status', id: 'lentidao', turnos: 1 }, { op: 'status', id: 'queimar', turnos: 1, forca: 0.15 }],
    [{ op: 'dano_extra', pct: 0.4 }, { op: 'ult', valor: 20 }]
  ]
};
