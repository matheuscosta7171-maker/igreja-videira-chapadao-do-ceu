# Administração — Igreja Videira

## Acesso

Use **Área restrita**, no rodapé, e informe o e-mail cadastrado. O Supabase envia um link de acesso sem senha. A opção **Administração** só aparece para `superadmin`, `admin`, `pastor` e `leader`; cada perfil vê apenas o permitido pelas políticas RLS.

## Conteúdo e cadastros

- **Conteúdo público:** dados de contribuição, endereço, construção e eventos. Um item só aparece ao público quando **Publicar** estiver marcado.
- **Usuários e células:** cadastro de células e líderes públicos. Apenas o superadministrador atribui perfis elevados.
- **Cuidado pastoral:** moderação de pedidos de oração, visitas e testemunhos. Nada é publicado automaticamente.
- **Suprimento da Célula e 21 Dias:** continuam usando os formulários de arquivo existentes, agora protegidos pelos papéis administrativos.
- **Agenda, grupos, horários e página inicial:** as estruturas antigas foram preservadas; novos registros do banco podem ser geridos no painel.

Antes de publicar PIX, endereço, links, imagens ou projeto, confira se os dados são oficiais. Prefira arquivar/despublicar a apagar definitivamente.

## Primeiro superadministrador

Após o primeiro login, execute no SQL Editor, trocando pelo e-mail real:

```sql
insert into public.user_roles(user_id,role,assigned_by)
select id,'superadmin',id from auth.users where lower(email)=lower('SEU_EMAIL_REAL')
on conflict(user_id,role) do nothing;
```

Saia e entre novamente. Em **Usuários e células → Permissões**, atribua os demais perfis.
