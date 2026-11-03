# Orçamento de desempenho (base da v29)

## Medido na v28 (Chromium + SwiftShader, mundo exterior ao iniciar; contagem do próprio `MundoExterior.estatisticas()`)
| Perfil | Chunks | Draw calls | Triângulos | Luzes | Geometrias | Texturas |
|---|---|---|---|---|---|---|
| Desktop (1280×900) | 25 | 194 | ~184 mil | 4 | 68 | 19 |
| Celular (390×780, toque) | 9 | 86 | ~56 mil | 4 | 35 | 19 |
Heap JS ~29 MB. **Sem GPU real não há fps confiável** (4–9 fps em software): estes números são de carga, não de velocidade.
Os triângulos do herói, inimigos e post-processing não entram nesta tabela; devem ser medidos com os modelos finais.

## Teto proposto (a validar em aparelhos reais)
| Item | Desktop modesto | Celular |
|---|---|---|
| Triângulos por quadro (tudo) | ≤ 400 mil | ≤ 150 mil |
| Draw calls | ≤ 250 | ≤ 120 |
| Luzes dinâmicas | ≤ 4 | ≤ 2–4 |
| Herói (corpo + armadura + arma) | ≤ 20 mil tri | ≤ 12 mil tri (LOD) |
| Inimigo comum / chefe | ≤ 8 mil / ≤ 25 mil | ≤ 5 mil / ≤ 15 mil |
| Arma / peça de armadura | ≤ 3 mil / ≤ 2 mil cada | metade (LOD) |
| Textura | ≤ 1024² (herói até 2048²) | ≤ 512² (herói 1024²) |
| Inimigos ativos simultâneos | ≤ 12 | ≤ 6 |
| Cidade/vila ativa | ≤ 60 mil tri de construções, NPCs em LOD | ≤ 25 mil |

## Regras de produção
- Um material por kit; atlas de textura por conjunto de equipamento (menos draw calls).
- Peças modulares trocáveis (ver GUIA-MODELOS.md) compartilham geometria entre personagens.
- Todo modelo novo passa por um teste que lê triângulos/texturas do GLB e falha acima do teto (a criar).
- Cidades usam o mesmo streaming por chunk do mundo; interiores de casas são espaços como as dungeons (descarrega o exterior).
