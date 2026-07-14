# Integração oficial da Bíblia

A interface usa a Edge Function local `supabase/functions/bible-api/index.ts`. Nenhuma chave secreta é enviada ao navegador.

## Provedor

A integração utiliza exclusivamente a API.Bible: `https://rest.api.bible/v1`, com a chave enviada pela Edge Function no cabeçalho `api-key`.

A Edge Function normaliza traduções, livros, capítulos, versículos, passagens e pesquisa para que o frontend não dependa diretamente do formato externo.

## Secrets

O arquivo `.env.example` contém apenas nomes:

```text
API_BIBLE_KEY=
```

No projeto Supabase, cadastre a chave como secret:

```sh
supabase secrets set API_BIBLE_KEY="COLE_AQUI_SUA_NOVA_CHAVE"
```

Nunca coloque essas chaves em `index.html`, `bible.js`, `bible-integration.js`, GitHub Pages ou outro arquivo público.

## Implantação

No terminal, dentro da pasta do projeto:

```sh
supabase login
supabase link --project-ref lzytpdkqdiamlikvvcuu
supabase secrets set API_BIBLE_KEY="COLE_AQUI_SUA_NOVA_CHAVE"
supabase functions deploy bible-api --no-verify-jwt
```

## Testes após a publicação

Primeiro consulte as traduções liberadas para sua chave e copie o `id` da tradução em português desejada:

```powershell
curl.exe "https://lzytpdkqdiamlikvvcuu.supabase.co/functions/v1/bible-api?action=bibles"
$BIBLE_ID="COLE_AQUI_O_ID_RETORNADO"
```

João 4:

```powershell
curl.exe "https://lzytpdkqdiamlikvvcuu.supabase.co/functions/v1/bible-api?action=chapter&bibleId=$BIBLE_ID&bookId=JHN&chapterId=JHN.4"
```

Salmos 23:

```powershell
curl.exe "https://lzytpdkqdiamlikvvcuu.supabase.co/functions/v1/bible-api?action=chapter&bibleId=$BIBLE_ID&bookId=PSA&chapterId=PSA.23"
```

João 3:16 como passagem:

```powershell
curl.exe "https://lzytpdkqdiamlikvvcuu.supabase.co/functions/v1/bible-api?action=passage&bibleId=$BIBLE_ID&reference=JHN.3.16"
```

João 3:16 pela pesquisa oficial:

```powershell
curl.exe "https://lzytpdkqdiamlikvvcuu.supabase.co/functions/v1/bible-api?action=search&bibleId=$BIBLE_ID&query=JHN.3.16"
```

A função é pública somente para leitura, mas aceita exclusivamente as ações `bibles`, `books`, `chapters`, `chapter`, `verses`, `verse`, `passage` e `search`. Ela valida identificadores, bloqueia URLs arbitrárias, limita solicitações, aplica timeout e preserva campos de copyright e atribuição retornados pelo provedor.

As requisições de conteúdo usam `fums-version=3`. A função devolve apenas o `fumsToken` recebido, e o frontend registra a visualização com o rastreador oficial `https://pkg.api.bible/fumsV3.min.js`. A chave da API nunca é devolvida.

## Licenças e traduções

O seletor mostra somente traduções em português retornadas para a chave cadastrada. NVI, A Mensagem e ARA só aparecerão se estiverem realmente liberadas para essa chave. Confirme no contrato do provedor as condições de exibição, cache, compartilhamento e atribuição.

Sem uma função implantada e um secret válido, a interface permanece no estado “Integração oficial pendente” e não exibe textos fictícios.
