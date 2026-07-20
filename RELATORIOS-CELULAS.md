# Relatórios de Células

## Regras

- Presença = membros + frequentadores assíduos + visitantes.
- Oferta total = PIX + dinheiro.
- Números não podem ser negativos e observações têm limite.
- Uma célula possui no máximo um relatório por data.
- Estados: `draft`, `submitted`, `reviewed`, `returned`.
- Líder edita somente rascunho ou devolvido da própria célula. Pastor/admin podem revisar e devolver.

## Gráficos

O painel usa barras CSS leves, filtradas por mês, sem biblioteca externa. O banco decide quais linhas o usuário pode ler. Ofertas não são expostas na área pública nem entre líderes.

## Cadastro

O administrador cria a célula, garante que o líder tenha perfil `leader` e cria o vínculo em `leader_cells`. Esse vínculo é a fonte de verdade; o líder não escolhe a identidade de outro líder.
