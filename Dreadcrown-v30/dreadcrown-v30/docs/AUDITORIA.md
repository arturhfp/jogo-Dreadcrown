# Dreadcrown — Auditoria (Fase A) e proposta (Fase B)

> Estado: **aguardando sua aprovação** das decisões da seção 5. Nada foi removido nem substituído.
> Metodologia: leitura do projeto real + execução do jogo no Chromium (sem WebGL, via fallback 2D) e com WebGL nos testes 3D.
> O que **não** pude verificar está marcado como *incerto*.

## 1. Inventário

| Item | Situação |
|---|---|
| Núcleo do jogo | React 19 + three.js, **bundle minificado (1,5 MB), sem fonte atual** (`src/vendor/game-bundle.js`) |
| Projeto Replit enviado | pnpm + Vite + React/TS, **versão de 17/09** (`App.tsx` 573 linhas, `game-data.ts` 421): ~200 textos vs ~2.400 do jogo atual; **não é a base** |
| Camada 3D e interface | 18 módulos ES + 5 scripts de interface + 13 CSS (já modularizados) |
| Recursos | 1 modelo GLB (Orc, CC-BY), 160 retratos JPG; **0 arquivos de áudio** |
| Back-end | nenhum (sem WebSocket/XHR; `fetch` do bundle é de bibliotecas). O topo da tela mostra "Servidor local · sincronizado": *incerto* se é só rótulo |
| Testes | 12 unitários + 39 verificações de navegador (do motor 3D). Nenhum para regras do jogo |

## 2. Estados dos sistemas (escala 1–6 do pedido)

| Sistema | Estado | Evidência / observação |
|---|---|---|
| Criação de personagem (nome, raça, classe, ramo, aparência) | **2** Implementado, precisa de testes | Verificado em execução: botão só habilita com nome; 5 raças × 6 classes × 5 ramos |
| Combate por turnos — ataque básico | **2** | Observado: dano 24–28, custo de stamina, ganho de Suprema, contra-ataque do inimigo (3), vitória em 2 golpes, +17 moedas |
| Vida/Mana/Stamina/Suprema | **2** | Valores e barras atualizam; fórmulas internas *não auditáveis* (minificado) |
| Habilidades (4 slots por raridade, bloqueio por nível 1/5/7/9) | **3** Parcial | **Nomes são oficiais e completos (≈2.400)**; dano/custo/efeito vêm de **modelos genéricos** por raridade/estilo. Se cada efeito descrito (atordoar, roubo de vida…) tem comportamento real: *incerto, não verificado* |
| Esquiva / Ultimate | **2** | Existem na interface; não executei o ciclo completo |
| Inimigos (15) | **3** | Nomes/temas existem; comportamento/IA além de "ataca em turno": *incerto* |
| Pós-vitória: acampamento (Descansar, Lootear, Tratar ferimentos) | **2** | Observado; avança sozinho para o próximo encontro (script `avanco-automatico.js`) |
| Inventário (poções, moedas), equipamentos (4 espaços, bônus de conjunto) | **2** | Mochila inicial: 2 poções de cura, 2 de mana, 25 moedas; peças "Vazio — encontre no saque" |
| Loja ("Loja do Abismo", mercador errante) | **2** | Presente no bundle; não percorri o fluxo de compra |
| Progressão (nível, moedas, encontros por ameaça FRACA/MÉDIA/FORTE) | **2** | Texto e gates observados; curva de balanceamento *não avaliada* |
| Modo ADM ("testar chefe final") | **2** | Botão existe; é ferramenta de teste exposta ao jogador → candidato a ficar atrás de flag de desenvolvimento |
| **Salvamento / carregamento** | **5** Não implementado | Nenhum uso de localStorage/sessionStorage/IndexedDB/cookie |
| **Áudio** | **5** Não implementado (existe `AudioContext` em biblioteca, sem arquivos) | |
| Mundo / mapas / exploração em 3ª pessoa | **5** Planejado | Só existe arena de combate |
| Combate em tempo real / híbrido | **5** Planejado | Hoje é 100% por turnos |
| Motor 3D: Orc (esqueleto, IK, arco, tecido, sombras, bloom) | **2** | Testes automáticos passam; qualidade visual **abaixo** da referência pedida (ver §4) |
| 3D: demais 4 raças e 15 inimigos | **6** Candidato a substituição | Primitivas simples; precisam de modelos riggados |
| 3D: subclasses | **3** | Só mudam cor/tema |
| 3D: Tank | **3** | Sem armadura própria |
| Retratos / cenário / HUD | **2** | Funcionam; cenário 2D (SVG) por trás do 3D |
| Palco 2D de reserva (CSS) | **6** Candidato a remoção parcial | Só serve sem WebGL; manter como fallback acessível |
| Mancha amarela (relato) | **4** Inconsistente (não reproduzida) | |

## 3. Problemas e riscos

1. **Sem fonte do núcleo** → impossível auditar fórmulas de dano/IA, ou testar regras com testes unitários.
2. **Acoplamento por seletores CSS** entre as camadas de interface e o React (quebra silenciosa).
3. **Sem salvamento**: toda sessão recomeça.
4. **Habilidades** com nomes ricos e mecânica genérica: risco de "existir só nominalmente" (critério do seu próprio pedido).
5. **Desempenho**: bloom + sombras 2048 + MSAA custam em GPU modesta. **Não medi** (ambiente sem GPU); falta perfil real e níveis de qualidade (hipótese a medir).
6. **Rótulo "servidor local · sincronizado"** pode induzir a erro se não houver sincronização.

## 4. Recomendações (tabela de decisão)

| Recurso | Recomendação | Justificativa | Dependências afetadas | Risco |
|---|---|---|---|---|
| Núcleo do jogo (bundle) | **Reconstruir a partir do fonte atual** (se existir) ou **reescrever em módulos**, mantendo `OFFICIAL_SKILL_DATA` como dados | Sem fonte não há evolução sustentável | todo o jogo | Alto (se reescrever) |
| Dados (raças/classes/habilidades/itens) | **Extrair do bundle para JSON/módulos de dados** | Única fonte de verdade; testável | UI, combate | Médio |
| Habilidades | **Refatorar**: efeitos como dados + executor único; começar com um conjunto representativo (1 raça × 6 classes) e testar | Evita nomes sem comportamento | combate, UI, 3D | Médio |
| Combate | **Refatorar** em motor determinístico separado da UI (com semente de aleatoriedade) | Testes automáticos de dano/recursos | UI, 3D (eventos) | Médio |
| Salvamento | **Implementar** (localStorage com versão de formato + migração) | Ausente | estado do herói/inventário | Baixo |
| Áudio | **Implementar** depois do núcleo (Web Audio, sons sintetizados + arquivos) | Feedback de combate | combate, UI | Baixo |
| Modo ADM | **Manter**, esconder atrás de flag de desenvolvimento | Ferramenta útil de teste | UI | Baixo |
| 3D do Orc | **Manter e continuar polindo** | Único ativo riggado | — | Baixo |
| 3D das outras raças/inimigos | **Substituir por modelos GLB riggados** (você gera/obtém; eu integro com o mesmo pipeline) | Primitivas não atingem a referência | personagens.js | Médio |
| Palco 2D de reserva | **Manter como fallback** | Acessibilidade sem WebGL | CSS | Baixo |
| Mundo/exploração/tempo real | **Ideia futura** — só após núcleo+save+testes | Muda o conceito (ver §5) | arquitetura inteira | Alto |

**Sobre o nível visual (Elden Ring/BG3):** não é alcançável com geometria procedural. O caminho realista é modelos GLB esculpidos e riggados + animações (suas ferramentas de IA já geram GLB) + este motor (IK, tecido, sombras, bloom). Também há trabalho próprio pendente: armas/capas das outras classes ainda são rígidas.

## 5. Decisões que dependem de você (Fase C)

1. **Fonte atual do jogo (v18.9+):** existe em outro projeto/checkpoint do Replit? É o que decide "reconstruir" vs "reescrever".
2. **Direção do combate:** manter **por turnos** (mais barato, bom para PC modesto) ou evoluir para **híbrido tempo real + tático** (muda o conceito; exige mundo 3D, câmera 3ª pessoa, colisões, IA)? Recomendo **turnos agora**, mundo/tempo real como fase posterior.
3. **"Abismo" no mundo do jogo** (Entrar no Abismo, Loja do Abismo, ~2.400 habilidades): manter como lore ou renomear?
4. **Ordem das próximas etapas** (sugestão): (1) salvamento + extração de dados + testes de regras → (2) motor de combate determinístico → (3) 3 classes completas com habilidades funcionais → (4) áudio → (5) demais classes → (6) mundo/exploração.

## 6. Arquitetura proposta (a aprovar)

```
src/
  core/        inicialização, configuração, barramento de eventos
  data/        raças, classes, subclasses, habilidades, itens, inimigos (JSON/módulos + validação)
  state/       estado único do jogo + salvamento versionado (migrações)
  rules/       dano, recursos, efeitos de habilidade, IA de inimigos (puro, determinístico, testável)
  ui/          telas, HUD, menus (React quando houver fonte; camada atual até lá)
  3d/          cena, câmera, luz, modelos, animações, efeitos  ← já feito
  audio/       efeitos e música
  world/       mapas/encontros (fase futura)
tests/         unitários (rules/state/data) + integração (navegador)
```
Princípios: a UI só **lê estado e emite ações**; o 3D só **reage a eventos de combate** (hoje faz isso observando o DOM — será trocado por eventos reais); regras sem dependência de DOM/three.js.

## 7. Critérios de aceitação por etapa (resumo)

Cada etapa só fecha com: inicialização sem erros; testes automáticos verdes (regras determinísticas com semente fixa); teste manual documentado do que é visual; sem regressão nos sistemas preservados.
