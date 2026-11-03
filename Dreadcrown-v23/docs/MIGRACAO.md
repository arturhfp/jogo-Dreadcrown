# Registro da migração

## O que foi feito

1. **Backup:** o jogo original (v22/v23, HTML único) permanece intacto e nada foi sobrescrito; o projeto novo é uma pasta separada.
2. **Análise:** mapeamento das camadas, funcionalidades, riscos e problemas (ver `ARQUITETURA.md`).
3. **Motor 3D** (um arquivo único de 1.860 linhas dentro de uma função anônima) → **18 módulos ES** por responsabilidade.
   A divisão foi feita por ferramenta (análise sintática com *acorn*), que calculou imports/exports automaticamente e comprovou **ausência de ciclos**.
   O código das funções **não foi reescrito**: foi movido e ganhou cabeçalho documentando responsabilidade, relações, API pública e regras.
4. **Interface injetada** (5 scripts) e **CSS** (13 blocos) → arquivos próprios; **recursos** embutidos em base64 (modelo GLB, 160 retratos) → arquivos reais em `assets/`.
5. **Ponto de entrada** `index.html` simples; **build** que regenera o HTML único; servidor de desenvolvimento.
6. **Testes:** 12 unitários (dados/animações) e verificações de integração no Chromium (ver abaixo).
7. **Correções encontradas pelos testes durante a migração:** import ausente do passo de tempo do tecido; registro de `dress` removido pelo *tree-shaking*.

## O que NÃO foi feito (pendente)

- **Núcleo do jogo** (`src/vendor/game-bundle.js`): sem fonte atual, portanto **não modularizado**. Sistemas ainda dentro dele:
  combate/dano, habilidades e raridades, inventário/equipamentos/poções/loja, progressão, criação de personagem, telas e navegação.
- Salvamento/carregamento (não existe no jogo atual).
- Comparação de comportamento ponto a ponto com a v23 além dos testes automáticos e das capturas de tela do arqueiro.
- Testes das regras de combate/inventário (dependem do fonte).

## Como continuar quando o fonte atual estiver disponível

1. Colocar o projeto Replit mais recente (o que gerou a v18.9) numa pasta `jogo/` e confirmar que ele compila para um bundle equivalente
   (comparar os textos em português, como feito aqui; devem coincidir).
2. Separar em `jogo/src/{data,characters,combat,inventory,progression,ui}` conforme o plano do pedido original, mantendo `game-data.ts` como fonte única dos dados.
3. Gerar o bundle novo, substituir `src/vendor/game-bundle.js` e rodar `npm test`.
4. Se o fonte do Replit servir de base: o repositório enviado já tem `App.tsx` (573 linhas), `game-data.ts` e `character-model.tsx`, mas
   **faltam** as habilidades/armas/regras do jogo atual — não use-o como substituto.

## Troca do nome do jogo: "Crônicas do Abismo" → "Dreadcrown"

**Alterado** (nome do jogo): título da página (`<title>`, `document.title` dentro do bundle), marca no topo da tela (`.brand-title`),
metadados, `package.json`, README, comentários de cabeçalho, nome do arquivo gerado (`dist/Dreadcrown.html`) e nomes nos testes.

**Preservado de propósito:**
- classe CSS `.abismo-app` (e `abismo-app` no bundle): é um **identificador** usado pelo CSS do jogo; renomear exige mexer no bundle minificado e no CSS ao mesmo tempo, sem ganho para o jogador;
- termos do **mundo do jogo** que contêm "Abismo" e não são o nome do jogo: botão "Entrar no Abismo", "Loja do Abismo" e centenas de nomes de habilidades ("Coroa do Abismo", "Titã do Abismo"…). Não foram trocados porque fazem parte do conteúdo/lore;
  se você quiser que o "Abismo" do mundo também mude (ex.: "Entrar na Dreadcrown"), isso é decisão de conteúdo e precisa da sua aprovação;
- chaves de dados com nomes de subclasses/habilidades (usadas como identificadores internos).

**Verificação:** varredura de todo o projeto (exceto imagens/GLB): 0 ocorrências de "Crônicas"/"Cronicas"; teste de inicialização do `dist/Dreadcrown.html`
(título "Dreadcrown 3D — Arena v18.8", marca "DREADCROWN", sem erros no console). Não existe dado de salvamento, então não há compatibilidade de save a preservar.
