# Clãs raciais (v30): o que está implementado

Fonte narrativa: [CLAS-RACIAIS.md](CLAS-RACIAIS.md) e [LORE.md](LORE.md). Esta página descreve **o que existe no código**.

## Regras implementadas
- **15 clãs** (3 por raça, aprovados): `src/data/jogo/clas.js`. Lógica em `src/rules/cla.js`.
- O herói **escolhe** o clã na criação, entre os 3 da **sua raça** (trocar de raça troca a lista e seleciona o primeiro; nunca fica clã de outra raça). O modo ADM não usa clã.
- **Um clã por herói.** Ao ser **expulso ou desertar** (`sairDoClan`) o clã é perdido **para sempre** (`heroi.clansPerdidos`), mesmo com reputação máxima.
- Depois de perder um, o herói só entra em **outro clã da raça** se tiver **reputação Amigável (≥ 25)** com a facção ligada a esse clã (`faccaoRelacionada`). Heróis de saves antigos (sem clã e sem perdas) podem escolher um na aba **Destino**.
- O clã **não altera atributos**.

## Benefícios implementados (descontos de loja)
| Clã | Efeito |
|---|---|
| Liga do Lacre (humano) | −10% nas poções |
| Oficina dos Sete Martelos (anão) | −10% nos aprimoramentos de arma e armadura |
| Mãos de Cobre (tiefling) | −5% em tudo |
O desconto é aplicado em `montarLoja` **depois** do sorteio do estoque (o sorteio não muda). `price` vira o preço final (é o que `comprar` cobra), `precoBase` guarda o original e a loja mostra o preço riscado e "clã −X%". Sem clã, ou com clã sem desconto, a loja é **idêntica** à da v29. A loja continua **só em acampamento**.
Os outros 12 clãs têm benefício **descrito mas ainda não implementado** (`efeito: null`; a ficha mostra "em breve"). O tratamento de ferimentos hoje é gratuito, então o benefício do Muro-do-Vale não tem o que descontar.

## Aceitação das facções (`src/rules/aceitacao.js`)
- **Racistas** rejeitam o herói cuja raça (ou a de um companheiro) está entre os alvos: Cruzada → orc e tiefling; Folha Eterna → humano. *Sangue Primeiro* ainda não tem alvos (a lore não define). Não há companheiros no jogo: o parâmetro existe para o futuro.
- **De história:** Vigília aceita se Selo ≥ Despertar; Culto aceita se Despertar > Selo (os contadores existem e ainda não sobem sozinhos). **Legião: aceita sempre (provisório).**
- **Raciais e mistas:** aceitam (atritos entre raciais: a definir).
- Quem a facção **não aceita nunca passa de Neutra**, mesmo com reputação alta (hostil continua hostil). A ficha mostra "Rejeita você" e o motivo.

## Save
Continua **v4** (sem migração): os campos novos do herói (`clan`, `clansPerdidos`) são opcionais. Heróis antigos ficam sem clã e sem bônus retroativo. Clã inválido (desconhecido ou de outra raça) é removido ao carregar, e um clã listado como perdido nunca é restaurado.

## Ainda não existe
Eventos de expulsão/deserção no jogo (só as funções), companheiros, benefícios dos outros 12 clãs, líderes e territórios, benefícios de reputação das facções, atritos entre raciais.
