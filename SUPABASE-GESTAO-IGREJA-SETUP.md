# Configuração do Supabase — Gestão da Igreja

## 1. Banco e RLS

No SQL Editor do projeto, execute uma vez:

`supabase/migrations/20260720120000_sistema_gestao_igreja.sql`

A migração é idempotente, preserva tabelas e arquivos anteriores e cria perfis, papéis, células, relatórios, cuidado pastoral, conteúdo, notificações e auditoria. Depois, faça o primeiro login e atribua o `superadmin` com o comando explicado em `README-ADMIN.md`.

## 2. Edge Functions

```powershell
supabase login
supabase link --project-ref lzytpdkqdiamlikvvcuu
supabase functions deploy public-submissions --no-verify-jwt
supabase functions deploy send-notification
```

`public-submissions` valida, limita e grava formulários públicos usando a chave pública fornecida automaticamente pelo Supabase. `send-notification` exige sessão e perfil autorizado.

## 3. Auth

Em Authentication → URL Configuration, mantenha a URL do GitHub Pages como Site URL e Redirect URL. O login usa magic link; não há senha no frontend.

## 4. Storage

O bucket `church-public` aceita apenas JPEG, PNG, WebP e PDF, até 15 MB. Os buckets existentes `palavras` e `jejum` são preservados. Upload exige admin ou superadmin.

## 5. Teste de RLS

Valide com contas distintas: visitante não lista pedidos; membro vê apenas os próprios; líder vê somente sua célula; pastor/admin veem cuidado pastoral; somente superadmin lê auditoria e atribui papéis.
