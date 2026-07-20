# Configuração do Supabase — Gestão da Igreja

## 1. Banco e RLS

No painel do projeto, abra **SQL Editor > New query**, copie **somente** o conteúdo de `EXECUTAR-GESTAO-NO-SUPABASE.sql` e clique em **Run**.

Esse arquivo é autônomo e idempotente. Ele cria ou complementa perfis, papéis, células, vínculos de líderes, relatórios semanais, cuidado pastoral, conteúdo administrativo, dízimos e ofertas, construção, endereço, notificações e auditoria. Ele preserva tabelas e dados existentes, não cria usuários fictícios e não promove ninguém automaticamente a superadministrador.

O arquivo de gestão não depende de arquivos SQL anteriores nem de módulos independentes. Para esta etapa, **não execute `EXECUTAR-NO-SUPABASE.sql`**, pois ele reúne configurações antigas que não pertencem ao escopo atual.

Depois que o SQL de gestão terminar com sucesso, use `CRIAR-PRIMEIRO-SUPERADMIN.sql` somente quando você decidir atribuir o primeiro acesso administrativo a um usuário real já cadastrado em **Authentication > Users**.

## 2. Edge Functions

```powershell
supabase login
supabase link --project-ref lzytpdkqdiamlikvvcuu
supabase functions deploy public-submissions --no-verify-jwt
supabase functions deploy send-notification
```

`public-submissions` valida, limita e grava formulários públicos usando a chave pública fornecida automaticamente pelo Supabase. `send-notification` exige sessão e perfil autorizado.

O CLI não estava autenticado durante esta entrega; por isso estes comandos e o SQL acima são os únicos passos manuais restantes no Supabase.

## 3. Auth

Em Authentication → URL Configuration, mantenha a URL do GitHub Pages como Site URL e Redirect URL. O login usa magic link; não há senha no frontend.

## 4. Storage

O bucket `church-public` aceita apenas JPEG, PNG, WebP e PDF, até 15 MB. Outros buckets existentes permanecem inalterados. Upload exige admin ou superadmin.

## 5. Teste de RLS

Valide com contas distintas: visitante não lista pedidos; membro vê apenas os próprios; líder vê somente sua célula; pastor/admin veem cuidado pastoral; somente superadmin lê auditoria e atribui papéis.
