# Fonte da Almeida Histórica

O importador utiliza o HTML completo do eBook nº 62383 do Project Gutenberg:

- Obra: *A Biblia Sagrada, Contendo o Velho e o Novo Testamento*
- Tradutor: João Ferreira d’Almeida (1628–1691)
- Edição de origem: Edição Revista e Corrigida, Lisboa, 1911; primeira edição, 1900
- Página permanente: https://www.gutenberg.org/ebooks/62383
- Situação indicada pelo Project Gutenberg: domínio público nos Estados Unidos

O arquivo-fonte não fica duplicado no site. Baixe a opção HTML pela página permanente e execute:

```powershell
node scripts/importar-biblia-almeida.js --source="C:\\caminho\\62383-h.htm"
```

O script registra no manifesto e no relatório o SHA-256 do arquivo utilizado. A redistribuição brasileira foi avaliada pelos arts. 41 e 45 da Lei 9.610/1998, considerando a morte do tradutor em 1691 e a edição de 1911.
