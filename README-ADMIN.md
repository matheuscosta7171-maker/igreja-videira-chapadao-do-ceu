# Administração — Igreja Videira

## Acesso

Use **Área restrita**, no rodapé, e informe o e-mail cadastrado. O Supabase envia um link de acesso sem senha. A opção **Administração** só aparece para `superadmin`, `admin`, `pastor` e `leader`; cada perfil vê apenas o permitido pelas políticas RLS.

Se o painel mostrar **“O sistema administrativo ainda precisa ser ativado no Supabase”**, execute primeiro `EXECUTAR-NO-SUPABASE.sql` conforme `SUPABASE-GESTAO-IGREJA-SETUP.md`.

## Conteúdo e cadastros

- **Conteúdo público:** dados de contribuição, endereço, construção e eventos. Um item só aparece ao público quando **Publicar** estiver marcado.
- **Usuários e células:** edite usuários, ative/desative contas, atribua funções, cadastre células e líderes e crie/remova vínculos sem apagar o usuário. Admin pode administrar funções comuns; somente superadmin pode atribuir ou remover `superadmin`.
- **Cuidado pastoral:** moderação de pedidos de oração, visitas e testemunhos. Nada é publicado automaticamente.
- **Suprimento da Célula e 21 Dias:** continuam usando os formulários de arquivo existentes, agora protegidos pelos papéis administrativos.
- **Relatórios:** filtros por período, líder, célula e status; revisão/devolução/arquivamento, observação interna, gráficos reais e exportação CSV.
- **Agenda, grupos, horários e página inicial:** editar, publicar, arquivar e ordenar registros pelo painel.

Antes de publicar PIX, endereço, links, imagens ou projeto, confira se os dados são oficiais. Prefira arquivar/despublicar a apagar definitivamente.

## Primeiro superadministrador

1. Abra **Supabase > Authentication > Users** e copie o UUID do usuário correto.
2. Abra `CRIAR-PRIMEIRO-SUPERADMIN.sql`.
3. Substitua `COLOQUE_AQUI_O_ID_DO_USUARIO` pelo UUID copiado.
4. Cole o SQL no **SQL Editor**, execute, saia e entre novamente.

Não use e-mail fixo no código. Depois, em **Usuários e células → Permissões**, atribua os demais perfis.

## Cadastro de líder

1. O líder entra uma vez usando **Área restrita**, para que seu perfil seja criado.
2. Em **Usuários e células**, localize o usuário, defina o perfil `leader` e salve.
3. Cadastre a célula e use **Vincular líder à célula**.
4. Para a apresentação pública, cadastre também em **Líderes**, vinculando o usuário, WhatsApp, foto e situação.

O último acesso pertence ao `auth.users` e não é exposto ao navegador; consulte-o em **Authentication > Users**.
