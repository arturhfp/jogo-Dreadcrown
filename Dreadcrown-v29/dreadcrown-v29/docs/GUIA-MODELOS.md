# Guia de produção de modelos (personagens, inimigos, armas, armaduras)

Dados oficiais hoje: 5 raças (Humano, Elfo, Anão, Orc, Tiefling), 6 classes × 5 ramificações = **30 identidades**, mais inimigos por território.
Referência existente: `assets/modelos/orc.glb` (o Orc é a prioridade visual; manter o padrão dele de esqueleto/escala/encaixes).

## Estratégia modular (recomendada, evita gerar 150 modelos)
1. **Corpo por raça (5)**: mesmo esqueleto, proporções próprias (Anão baixo e largo, Orc grande, Elfo esguio, Tiefling com chifres/cauda, Humano base).
2. **Armadura por classe (6 kits-base)**, em peças: elmo, ombros, peitoral, braçais, cinto/saia, grevas/botas, capa.
3. **Variação por ramificação (5 por classe)**: troca de 2–3 peças-assinatura (elmo, ombros, capa) + arma + efeito/cor. Total: 6 bases + ~30 conjuntos de peças-assinatura.
4. **Arma por classe/ramificação**, cada uma com encaixe padronizado na mão e posição de projétil/efeito.
5. **Raridade muda só acabamento** (material, brilho, runas, partículas), **nunca a forma nem o bônus**: o bônus depende do item/conjunto, não da raridade do visual.

## Padrões técnicos (valem para todo GLB)
- glTF 2.0 binário (.glb), +Y para cima, escala em metros (humano ~1,8 m), origem nos pés.
- Esqueleto único compartilhado entre raças (ossos com os mesmos nomes do `orc.glb`); animações: parado, andar, correr, ataque básico, habilidade, dano, morte.
- Armas: origem na empunhadura; empties nomeados `ponto_efeito` (ponta/projétil) e, no arco, `corda_a`, `corda_b`.
- Armadura: já pesada no esqueleto do corpo (skin), ou rígida presa a um osso; capas/tecidos com ossos extras para a física de tecido existente.
- Teto de triângulos e texturas: ver ORCAMENTO-DESEMPENHO.md. Um LOD1 (~50%) para celular.
- Nomear materiais `corpo`, `metal`, `tecido`, `couro`, `emissivo` para o jogo trocar cor/raridade em tempo de execução.

## Ordem de produção sugerida
1. Orc + Colosso/Berserker (já é o padrão). 2. Um kit completo de outra raça/classe para validar a modularidade. 3. Demais corpos de raça.
4. Armaduras-base das 6 classes. 5. Peças-assinatura por ramificação. 6. Armas. 7. Inimigos por território (comuns, depois chefes).

## O que eu faço no código quando os GLBs chegarem
Carregador de kit (corpo + peças + arma por raça/classe/ramificação), troca de material por raridade, encaixes, LOD e o teste de orçamento.
