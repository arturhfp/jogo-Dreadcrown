// Extrator ÚNICO (uso histórico): executa o trecho de dados do bundle minificado
// (tools/migracao/trecho_original_bundle.js) numa VM e grava módulos de dados legíveis.
// Depois de gerados, os arquivos em src/data/jogo/ são a fonte da verdade e podem ser editados à mão.
import fs from 'fs'; import vm from 'vm'; import path from 'path'; import { fileURLToPath } from 'url';
const aqui = path.dirname(fileURLToPath(import.meta.url));
const saida = path.resolve(aqui, '../../src/data/jogo');
const src = fs.readFileSync(path.join(aqui, 'trecho_original_bundle.js'), 'utf8');
const nomes = 'S1 M1 XM e0 Fx Fh ABG1 GDD_ARMOR_SETS GDD_RARITIES GDD_SLOTS ip DA PS GG OFFICIAL_SKILL_DATA'.split(' ');
const ctx = { console, Math, JSON, String, Object, Array, Number }; vm.createContext(ctx);
vm.runInContext(src + ';globalThis.__x={' + nomes.join(',') + '}', ctx);
const x = JSON.parse(JSON.stringify(ctx.__x));
const arr = a => '[\n' + a.map(o => '  ' + JSON.stringify(o)).join(',\n') + '\n]';
const obj = o => '{\n' + Object.entries(o).map(([k, v]) => '  ' + JSON.stringify(k) + ': ' + JSON.stringify(v)).join(',\n') + '\n}';
const cab = t => `// ${t}\n// Dados extraídos do bundle original; agora são a fonte da verdade (editável).\n\n`;
const w = (f, t, body) => fs.writeFileSync(path.join(saida, f), cab(t) + body + '\n');
w('racas.js', 'Raças jogáveis: atributos base, passiva e opções de aparência.', `export const RACAS = ${arr(x.S1)};\n`);
w('classes.js', 'Classes: atributos base, ramificações (subclasses) e arma assinatura.', `export const CLASSES = ${arr(x.M1)};\n`);
w('ramificacoes.js', 'Ramificações (subclasses): tema elemental, descrição e habilidades-base.', `export const RAMIFICACOES = ${obj(x.XM)};\n`);
w('armas.js', 'Armas/escudos/focos por classe.', `export const ARMAS = ${arr(x.e0)};\n`);
w('armaduras-base.js', 'Armaduras base (por grupo de classes).', `export const ARMADURAS_BASE = ${arr(x.Fx)};\n`);
w('inimigos.js', 'Inimigos do jogo (stats, recompensa, tier e tema).', `export const INIMIGOS = ${arr(x.Fh)};\n`);
const base = x.ABG1.filter(i => !i.id.startsWith('gdd-'));
w('equipamentos-base.js', 'Equipamentos de classe escritos à mão (os conjuntos gdd- são gerados em rules/equipamentos.js).', `export const EQUIPAMENTOS_BASE = ${arr(base)};\n`);
w('conjuntos.js', 'Conjuntos de armadura, raridades e slots.', `export const CONJUNTOS = ${arr(x.GDD_ARMOR_SETS)};\nexport const RARIDADES_EQUIP = ${arr(x.GDD_RARITIES)};\nexport const SLOTS = ${arr(x.GDD_SLOTS)};\n`);
w('habilidades-oficiais.js', 'Nomes oficiais das habilidades: chave "raça|classe|ramificação|raridade" → 4 nomes.', `export const NOMES_OFICIAIS = ${obj(x.OFFICIAL_SKILL_DATA)};\nexport const RARIDADES = ${JSON.stringify(x.ip)};\nexport const ROTULO_RARIDADE = ${JSON.stringify(x.DA)};\nexport const NIVEL_DESBLOQUEIO = ${JSON.stringify(x.PS)};\nexport const NOMES_GENERICOS = ${JSON.stringify(x.GG)};\n`);
fs.writeFileSync(path.join(aqui, 'referencia_E1.json'), JSON.stringify(Object.fromEntries(Object.keys(x.OFFICIAL_SKILL_DATA).map(k => [k, 1]))));
console.log('ok', base.length, 'base;', x.ABG1.length, 'total');
