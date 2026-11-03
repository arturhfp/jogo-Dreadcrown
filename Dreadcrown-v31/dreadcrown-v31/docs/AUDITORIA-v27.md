# Dreadcrown — Auditoria da v26 e estado da v27

Metodologia: leitura do código, diff v26 → v27, execução dos testes em Node e no Chromium (WebGL por software/SwiftShader, ~2–7 fps).
**Não foi possível medir desempenho em GPU real nem testar em celular físico.**

## 1. Inconsistências entre documentação e código encontradas na v26
- `README`, `ARQUITETURA`, `MIGRACAO` e `AUDITORIA` diziam que o núcleo era um bundle React sem fonte e que não havia save/mundo/áudio. No código a v26 já tem regras, dados, save, mundo aberto e áudio em módulos. → README e docs atualizados na v27 (`MIGRACAO.md`/`ARQUITETURA.md`/`AUDITORIA.md` mantidos como registro histórico; o estado atual está em `README.md` e neste arquivo).
- `package.json` estava em 23.0.0 → 27.0.0.
- `npm test` não incluía os testes de `jogo.mjs`; agora `npm run test:navegador` inclui jogo, regressão v27 e motor 3D.
- `src/vendor/game-bundle.js` (1,5 MB) não é carregado pelo `index.html`; só por `index-legado.html`. Mantido (preservação), documentado como legado. Nenhum módulo de `src/` ficou sem referência (varredura feita).

## 2. Estado real dos sistemas (verificado por teste executado)
| Sistema | Estado | Evidência |
|---|---|---|
| Criação (nome, raça, classe, ramificação, aparência) → mundo | Funciona | `jogo.mjs` |
| Mundo 3ª pessoa, terreno por semente, inimigos, percepção, emboscada/avistado | Funciona | `mundo.mjs`, `jogo.mjs` |
| Portais/regiões, respawn | Funciona (lógica testada; troca visual de região só por teste de regras) | `mundo.mjs`, `estabilidade.mjs` |
| Entrada e saída de combate, vitória, recompensas, acampamento | Funciona | `jogo.mjs`, `regressao-v27.mjs` |
| Derrota → retomar/recriar | **Corrigido na v27** (estava quebrado) | `regressao-v27.mjs` |
| Habilidades, custos, status, passivas de classe | Funciona nos casos testados (6 classes × 5 ramos × 2 ações; efeitos principais) | `classes.mjs`, `efeitos.mjs`. **Os 2.400 nomes de habilidades não foram testados um a um** |
| Inventário, poções, equipamentos, bônus de conjunto, loja | Funciona; melhorias compradas agora têm efeito | `regras.mjs`, `combate.mjs`, `estabilidade.mjs` |
| Progressão por vitórias | Funciona; **curva de balanceamento não avaliada** | `combate.mjs` |
| Save/load, save inválido | Funciona; validação nova | `regras.mjs`, `regressao-v27.mjs` |
| Áudio | Sintetizado (sem arquivos); testado com contexto simulado, **não ouvido** | `audio.mjs` |
| Orc 3D (esqueleto, IK, arco, tecido) | Testes automáticos de rig/física; **correção visual de membros/arma não avaliada por olho humano** | `navegador.mjs` |
| Outras raças e inimigos 3D | Primitivas (limitação conhecida) | — |

## 3. Problemas encontrados e gravidade
Alta: derrota deixando o jogo travado (corrigido); save inválido aceito (corrigido).
Média: herói andando sozinho ao perder foco/toque cancelado (corrigido); melhorias compradas sem efeito (corrigido); cena do mundo órfã no ADM (corrigido); vazamento de texturas na GPU (corrigido).
Baixa: constante de respawn duplicada (corrigido); espera de teste incompatível com render por software (corrigido).

## 4. Pendências (não corrigidas na v27)
1. Desempenho em GPU real/celular sem medição; sem níveis de qualidade gráfica (bloom, sombras 2048, MSAA).
2. Combate ainda 100% por turnos; arquitetura documentada em `COMBATE.md`, nada implementado.
3. Descarregamento de regiões: a cena é recriada ao trocar de região (terreno e atores liberados), mas não há streaming nem pré-carga.
4. Dungeons/cidades/fortalezas: não existem; o formato de região em `data/jogo/mundo.js` é o ponto de partida.
5. Reaproveitamento de rigs: só o Orc tem esqueleto; nenhuma compatibilidade entre rigs foi testada nem prometida.
6. Habilidades usam modelos por raridade/estilo; nenhum balanceamento foi alterado.
7. Botão ADM visível ao jogador (ferramenta de teste).
8. Edição de arquivos minificados: nenhuma feita.

## 5. Plano de etapas seguinte (prioridade)
1. Medir desempenho em PC modesto/celular e criar níveis de qualidade (sem mudar a identidade visual).
2. Esconder o ADM atrás de flag de desenvolvimento (decisão sua).
3. Eventos reais do motor para o 3D (substituir observação do DOM em `ui/ponte.js`).
4. Protótipo de ação com carga/tempo sobre `executarAcao`, com testes de mesma semente.
5. Primeiro mapa de dungeon (salas/corredores/chefe/saída) reaproveitando `data/jogo/mundo.js` e `rules/mundo.js`.
6. Pipeline de modelos GLB riggados para outras raças.
