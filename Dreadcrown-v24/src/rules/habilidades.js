// Regras de habilidades: gera as 4 habilidades de uma ramificação/raridade/raça/classe.
// Porta fiel da função E1 do bundle original (equivalência verificada em tests/regras.mjs).
// Não depende de DOM, React ou three.js.
import { RAMIFICACOES } from '../data/jogo/ramificacoes.js';
import { NOMES_OFICIAIS, RARIDADES } from '../data/jogo/habilidades-oficiais.js';
import * as M from '../data/jogo/habilidades-modelos.js';
import { aplicarGlossario } from '../data/glossario.js';

const normalizar = x => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const MAPA_RARIDADE = { comum: 'common', common: 'common', raro: 'rare', rare: 'rare', epico: 'epic', epic: 'epic', lendario: 'legendary', legendary: 'legendary' };

// Índice pré-calculado: evita varrer 600 chaves a cada consulta.
const INDICE = new Map();
for (const k of Object.keys(NOMES_OFICIAIS)) {
  const [r, c, b, rar] = k.split('|');
  const ch = `${normalizar(r)}|${normalizar(c)}|${normalizar(b)}|${rar}`;
  if (!INDICE.has(ch)) INDICE.set(ch, k); // como o original: vale a primeira ocorrência
}
export function chaveOficial(ramificacao, raridade, raca, classe) {
  const rar = normalizar(raridade);
  return INDICE.get(`${normalizar(raca)}|${normalizar(classe)}|${normalizar(ramificacao)}|${MAPA_RARIDADE[rar] || rar}`);
}

export function gerarHabilidades(ramificacao, raridade, raca = 'humano', classe = 'tanke') {
  const chave = chaveOficial(ramificacao, raridade, raca, classe);
  const idDe = n => `${ramificacao}-${raridade}-${raca}-${classe}-${n}`;
  let lista;
  if (chave) {
    const ri = RARIDADES.indexOf(raridade);
    const dano = M.DANO_BASE[raridade] || 22, custo = M.CUSTO_BASE[raridade] || 7;
    const recurso = ['mago', 'clerigo', 'paladino'].includes(classe) ? 'mana' : 'stam';
    lista = NOMES_OFICIAIS[chave].map((nome, index) => ({
      id: idDe(index), name: nome, rarity: raridade, index,
      damage: Math.round(dano + index * 12 + (classe === 'mago' ? 15 : classe === 'assassino' ? 12 : 0) + (raca === 'orc' ? 8 : 0)),
      cost: custo + index * 2,
      description: `${ramificacao} • ${nome}. Habilidade oficial de ${raca} ${classe}.`,
      effect: `${nome}: efeito baseado na especialização ${ramificacao} e na raça ${raca}.`,
      resource: recurso
    }));
    void ri;
  } else {
    const estiloR = M.ESTILO_RACIAL[raca] || M.ESTILO_RACIAL_PADRAO;
    const estiloC = M.ESTILO_CLASSE[classe] || M.ESTILO_CLASSE_PADRAO;
    const dadosR = RAMIFICACOES[ramificacao] || M.RAMIFICACAO_PADRAO;
    const tema = dadosR.theme || 'physical';
    const conjunto = M.CONJUNTO_FEITICOS[tema] || dadosR.skills || M.CONJUNTO_FEITICOS.physical;
    const variantes = M.VARIANTES_RACIAIS[raca] || M.VARIANTES_PADRAO;
    const elemento = M.ELEMENTO_MAGO[ramificacao];
    const ehMago = elemento && classe === 'mago';
    const nomes = (ehMago ? (raca === 'orc' && elemento === 'fire' ? M.FOGO_RACIAL.orc : conjunto) : conjunto).slice();
    const ri = RARIDADES.indexOf(raridade);
    const rotulos = nomes.map((base, n) => {
      let r = base;
      if (ri > 0) r += ` ${M.TITULOS_RARIDADE[raridade][n]}`;
      if (ri === 0) r = `${base} ${variantes[n]}`;
      if (ehMago && raca !== 'orc' && n === 3) r = M.FINAL_MAGO[elemento];
      return r;
    });
    lista = rotulos.map((nome, n) => {
      const damage = Math.round((M.DANO_BASE[raridade] || 22) + n * 12 + ri * 18 * estiloC.escala + (raca === 'orc' ? 8 : 0));
      const cost = Math.round((M.CUSTO_BASE[raridade] || 7) + n * 2 + (classe === 'mago' || classe === 'clerigo' || classe === 'paladino' ? 0 : ri * 2));
      const efeito = (M.EFEITO_POR_TEMA[tema] || M.EFEITO_POR_TEMA.physical)[n];
      return {
        id: idDe(n), name: nome, rarity: raridade, index: n, damage, cost,
        description: `${estiloR.papel} • ${ramificacao}. ${nome} causa ${damage} de dano e usa ${estiloC.recurso === 'mana' ? 'Mana' : 'Stamina'}.`,
        effect: `${efeito} ${estiloR.efeito} • ${M.EXTRA_RACIAL[raca]}.`,
        resource: estiloC.recurso
      };
    });
  }
  // Glossário de renomeação (Abismo → Dreadcrown) aplicado só aos textos exibidos.
  return lista.map(h => ({ ...h, name: aplicarGlossario(h.name), description: aplicarGlossario(h.description), effect: aplicarGlossario(h.effect) }));
}
