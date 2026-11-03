# v31: missões e a Rede do Louco (esqueleto)
- Novo: `src/data/jogo/missoes.js` (5 da Rede, 2 de facção, 1 de clã), `src/rules/missoes.js`, modal de decisão (Matar/Poupar/Recrutar), aba Diário, preço por reputação (Cinco Cofres), pistas no mapa.
- `campanha.missoes` guarda o progresso dentro de `progresso.campanha` (save segue v4; saves antigos ganham `{}`).
- Sem mudança em raças, classes, ramificações, armas, armaduras, habilidades, inimigos, mundo, combate.
- Os testes antigos do navegador ganharam um passo que decide a missão quando o inimigo vencido é um alvo.
- Limites: dragões e Louco só como lore; 1 contrato de clã de 15; valores de reputação/Selo são propostas ajustáveis; sem teste em GPU real.
- Testes: `tests/missoes.mjs` (14), `tests/missoes-v31.mjs` (11).
