// Mundo de Dreadcrown (v28): UM mundo exterior contínuo com seis territórios que compartilham a mesma geografia.
// Dado puro e editável. COORDENADAS GLOBAIS: x para a direita, z para baixo (mesma orientação do minimapa e do mapa-múndi); unidade ≈ 1 metro.
// Cada território tem um centro (`centro`) e um raio de influência (`raio`). O terreno, o clima e os adereços de qualquer ponto são uma
// MISTURA dos territórios próximos (ver rules/geografia.js): não existem fronteiras duras nem portais entre territórios.
//
// O que foi preservado da v27 (por território): nome, tier, semente do terreno, relevo, vitoriasMin (agora só "recomendado", não bloqueia),
// áreas/inimigos, quantidade, aparência (céu, névoa, cores do chão, adereços, luz) e o chefe da Fenda Infernal.
// O que mudou: `tamanho`/`mapa`/`portais`/`loja` saíram; entraram `centro`, `raio` e coordenadas globais de acampamento e início.
// Para reaproveitar o terreno da v27, cada território continua usando a sua semente nas coordenadas RELATIVAS ao seu centro.
//
// ESCALA: o centro de cada território foi derivado da posição que ele tinha no mapa-múndi antigo (0..100) × 5, mantendo a mesma
// ordem geográfica e a mesma progressão de dificuldade (Vale → Terras Mortas/Cavernas → Picos → Fortaleza → Fenda).
const E = 5;
const c = (mx, mz) => [mx * E, mz * E];
const somar = (centro, local) => [centro[0] + local[0], centro[1] + local[1]];

const V = c(18, 70), M = c(40, 78), C = c(20, 40), P = c(58, 48), F = c(78, 30), X = c(90, 12);

export const REGIOES = {
  vale: {
    nome: 'Vale Quebrado', tier: 'weak', semente: 1101, relevo: 3.2, vitoriasMin: 0, centro: V, raio: 94,
    areas: ['Estrada Quebrada', 'Pântano Raso', 'Bosque Frio'], quantidade: 6,
    visual: { ceu: '#8fb0c9', nevoa: '#a9bccb', nevoaDist: [30, 120], chao: ['#3f5a2c', '#587a3a', '#6b6a4c'], props: ['pinheiro', 'pedra', 'arbusto'], luz: '#fff2d6', agua: null },
    acampamento: somar(V, [-8, 6]), inicio: somar(V, [14, -6])
  },
  mortas: {
    nome: 'Terras Mortas', tier: 'weak', semente: 2202, relevo: 2.4, vitoriasMin: 0, centro: M, raio: 94,
    areas: ['Cemitério Antigo', 'Caverna Baixa'], quantidade: 6,
    visual: { ceu: '#5d6676', nevoa: '#6b7280', nevoaDist: [18, 90], chao: ['#3b3d3a', '#4b4a45', '#575149'], props: ['arvore_morta', 'lapide', 'pedra'], luz: '#c9d3ff', agua: null },
    acampamento: somar(M, [6, -8])
  },
  cavernas: {
    nome: 'Cavernas Profundas', tier: 'medium', semente: 3303, relevo: 4.5, vitoriasMin: 5, centro: C, raio: 86,
    areas: ['Cavernas Negras', 'Catacumbas', 'Salão do Tesouro'], quantidade: 7,
    visual: { ceu: '#14121c', nevoa: '#1b1826', nevoaDist: [10, 60], chao: ['#2a2733', '#38323f', '#443a47'], props: ['cristal', 'pedra', 'estalagmite'], luz: '#9c8cff', agua: null },
    acampamento: somar(C, [8, 8])
  },
  picos: {
    nome: 'Picos Ventosos', tier: 'medium', semente: 4404, relevo: 9, vitoriasMin: 5, centro: P, raio: 100,
    areas: ['Picos Ventosos', 'Passo Rochoso'], quantidade: 6,
    visual: { ceu: '#a9c4e6', nevoa: '#c6d6ea', nevoaDist: [40, 160], chao: ['#6d6f73', '#8a8c8e', '#a2a39f'], props: ['pedra', 'pinheiro', 'pedra_grande'], luz: '#fff8ee', agua: null },
    acampamento: somar(P, [-6, -6])
  },
  fortaleza: {
    nome: 'Fortaleza Rubra', tier: 'strong', semente: 5505, relevo: 3.6, vitoriasMin: 12, centro: F, raio: 89,
    areas: ['Fortaleza Rubra', 'Templo Partido', 'Ruínas Profundas'], quantidade: 6,
    visual: { ceu: '#6b2f2a', nevoa: '#7a3b33', nevoaDist: [16, 90], chao: ['#4a3a34', '#5d463d', '#6e5144'], props: ['pilar', 'pedra', 'arvore_morta'], luz: '#ffb98a', agua: null },
    acampamento: somar(F, [0, 8])
  },
  fenda: {
    nome: 'Fenda Infernal', tier: 'strong', semente: 6606, relevo: 5.5, vitoriasMin: 12, centro: X, raio: 81,
    areas: ['Portão Negro'], quantidade: 4, chefe: { area: 'Fenda Infernal', pos: somar(X, [0, 32]) },
    visual: { ceu: '#2a0a0a', nevoa: '#3a0f0c', nevoaDist: [10, 70], chao: ['#241313', '#331a16', '#4a2218'], props: ['pilar', 'cristal_rubro', 'pedra'], luz: '#ff7a3d', agua: null },
    acampamento: somar(X, [-6, -10])
  }
};
export const REGIAO_INICIAL = 'vale';

// Estradas: cada par liga os ACAMPAMENTOS de dois territórios vizinhos (a mesma adjacência que os portais antigos tinham).
// A forma exata (curvas suaves) é gerada de modo determinístico em rules/geografia.js.
export const ESTRADAS = [['vale', 'mortas'], ['vale', 'cavernas'], ['mortas', 'picos'], ['cavernas', 'picos'], ['picos', 'fortaleza'], ['fortaleza', 'fenda']];

// Marcos (construções exploráveis só para ver e descobrir; sem interação ainda). Posição = centro do território + deslocamento local.
// Nomes reaproveitam os nomes de ÁREAS que já existem nos dados dos inimigos (nenhuma história nova foi inventada).
// tipo: 'ruinas' | 'fortaleza' | 'portao'. `rumo` em radianos (direção da frente).
const marco = (reg, id, rotulo, tipo, local, rumo) => ({ id, regiao: reg, rotulo, tipo, pos: somar(REGIOES[reg].centro, local), rumo });
export const MARCOS = [
  marco('vale', 'marco:estrada-quebrada', 'Estrada Quebrada', 'ruinas', [24, -30], 0.6),
  marco('mortas', 'marco:cemiterio-antigo', 'Cemitério Antigo', 'ruinas', [-30, 26], 2.2),
  marco('picos', 'marco:passo-rochoso', 'Passo Rochoso', 'ruinas', [-38, 12], 1.0),
  marco('fortaleza', 'marco:fortaleza-rubra', 'Fortaleza Rubra', 'fortaleza', [-34, -36], 0.9),
  marco('fenda', 'marco:portao-negro', 'Portão Negro', 'portao', [-8, 46], -Math.PI / 2)
];

// Parâmetros de simulação do mundo (ajuste livremente).
export const PARAMETROS_MUNDO = {
  velocidade: 4.2, velocidadeFurtivo: 2.0, velocidadePatrulha: 1.4, velocidadePerseguicao: 3.6,
  visao: { weak: 10, medium: 12, strong: 14 }, anguloVisao: 70, tempoAlerta: 0.8, perderAlvo: 3,
  raioContato: 1.3, alcanceAtaque: 2.6, respawnSegundos: 150, raioPonto: 3.2,
  // v28 — mundo contínuo
  raioHeroi: 0.45,            // "corpo" do herói nas colisões com obstáculos
  inclinacaoMax: 1.1,         // gradiente máximo caminhável (≈ 48°); acima disso é parede/rocha
  raioSimulacao: 80,          // inimigos além desta distância do herói ficam adormecidos (voltam para casa) — controla o custo
  raioDescoberta: 26,         // distância para "descobrir" acampamentos, entradas e marcos
  raioNevoa: 30,              // raio revelado no mapa-múndi ao redor do herói
  celulaMapa: 16,             // tamanho (em unidades do mundo) de cada célula explorada do mapa
  vasculharCampSegundos: 150, // "Lootear" em um acampamento só rende de novo depois deste tempo de mundo (antes era infinito: farm de moedas)
  respawnDungeonSegundos: 300 // inimigos comuns de uma dungeon só voltam se o jogador sair e voltar depois deste tempo
};
