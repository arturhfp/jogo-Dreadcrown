# Combate atual (v27) — como funciona e o que precisa ser preservado

Documento descritivo. Nada aqui foi alterado em regras ou balanceamento na v27, exceto o que está em `CHANGELOG-v27.md`.

## Fluxo

1. **Exploração (tempo real)** — `src/world/cena.js` desenha; `src/rules/mundo.js` (`passoMundo`) decide movimento, percepção e IA dos inimigos
   (`patrulha → alerta → persegue`). Sem DOM nem three.js, determinístico.
2. **Entrada em combate** — `acoes.iniciarBatalhaDoMundo` (`ui/jogo/app.js`) cria o combate com `criarCombate({heroi, inimigo, semente, iniciativa})`.
   Iniciativa vem do mundo: `normal`, `emboscada` (ataque pelas costas: inimigo atordoado no 1º turno e +30% no 1º golpe) ou `avistado` (o inimigo ataca primeiro).
3. **Turnos** — `executarAcao(combate, acao)` em `src/rules/combate.js`. Ações: `basico`, `habilidade` (por raridade), `esquivar`, `suprema`. Poções **não** passam por `executarAcao`: são `usarPocao` (`rules/acampamento.js`), chamadas por `acoes.pocao`, sem consumir turno.
   Função pura: clona o estado, usa o RNG injetado (`core/rng.js`) e devolve `{ combate, eventos }`.
4. **Resposta do inimigo** — mesma chamada: status contínuos (`rules/efeitos.js`), perda de turno por atordoamento/congelamento, ataque (`ataqueInimigo`).
   Esquiva ativa opcional: o jogador aperta ESPAÇO no instante certo (`ui/jogo/defesa.js`) → `perfeita` reduz 65% do dano, `boa` 30%.
5. **Fim** — `fim: 'vitoria' | 'derrota'`. Vitória: moedas, nível por vitórias (`nivelPorVitorias`), Suprema +16, abre o acampamento
   (`rules/acampamento.js`: descansar, vasculhar, tratar ferimentos) e o inimigo some do mundo até o respawn. Derrota: modal com retomar/recriar (v27).
6. **Retorno** — a ação do acampamento fecha o modal e volta ao mundo; o progresso é salvo (`state/save.js`).

## Contrato entre as camadas (preservar)

- **Regras → UI/3D só por `eventos`** (`{tipo, alvo, valor, texto, tom}`). A UI e o palco 3D nunca calculam dano.
- Dano básico: `9 + pow + ⌊dex·0,45⌋ + bônus da arma + melhorias da arma + d6 − armadura efetiva·0,55`, vezes multiplicadores de equipamento e de status.
- Habilidades: nomes oficiais em `data/jogo/habilidades-oficiais.js`; números por modelo em `data/jogo/habilidades-modelos.js` + `rules/habilidades.js`;
  efeitos de status em `data/jogo/efeitos.js` + `rules/efeitos.js`. Os testes `tests/regras.mjs` comparam as 600 listas com o original.
- Passivas de classe: `data/jogo/classes-kit.js` + `rules/classes.js` (crítico, penetração, escudo, regeneração, marca).
- Determinismo: mesma semente + mesmas ações = mesmo resultado (testado em `combate.mjs`, `mundo.mjs`, `classes.mjs`). Quem sorteia usa `rng`; **nunca `Math.random`** nas regras.
- Estado do herói é **um único objeto** (`estado.heroi`) copiado para o combate e devolvido ao fim. Qualquer campo novo precisa entrar em
  `criarHeroi` e em `sanitizarHeroi` (`state/save.js`) para não quebrar saves antigos.

## Dependências para evoluir para combate mais dinâmico

O caminho seguro é **manter `executarAcao` como árbitro** e transformar o "turno" em janelas de tempo, sem criar um segundo cálculo de dano:

1. A cena do mundo já gera a iniciativa; o próximo passo natural é enviar à batalha ações com *carga* (tempo de preparação) que, ao concluir, chamam `executarAcao` com a mesma ação.
2. O inimigo passaria a agir por temporizador chamando o mesmo `ataqueInimigo`, mantendo `defesa` (esquiva ativa) como entrada.
3. Custos, recargas e status continuam em `rules/`; a animação 3D continua consumindo eventos (`3d/combate3d.js` + `ui/ponte.js`).
4. Antes de tudo: cobrir com testes de regressão (já existem 18+12+11 verificações de combate/classes/efeitos) e comparar saídas com a mesma semente.

**Não feito na v27 de propósito:** nenhum sistema de combate em tempo real foi implementado — o pedido era documentar e preparar, e criar um
sistema paralelo violaria "não manter duas implementações concorrentes".
