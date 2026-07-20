# Diagnóstico — Relatório da Célula

## Causa confirmada

Em 20/07/2026, consultas diretas à API REST do projeto Supabase retornaram `404 / PGRST205` para `profiles`, `user_roles`, `cells`, `leader_cells`, `cell_reports`, `prayer_requests`, `pastoral_visits`, `testimonies` e `audit_logs`. Isso confirma que a migração de gestão não foi executada no banco remoto. Sem `profiles` e `user_roles`, a autenticação não consegue descobrir o perfil; sem perfil privado o menu **Relatório da Célula** permanece oculto por segurança.

Também foi corrigida uma incompatibilidade no frontend: o código consultava `profiles.is_active`, enquanto a migração usa `profiles.active`. O módulo antigo de relatórios ainda concorria pelo mesmo formulário do módulo novo; essa concorrência foi desativada.

## Correção preparada

- `EXECUTAR-NO-SUPABASE.sql`: migração única, aditiva, idempotente e sem secrets.
- `report-management.js`: relatório completo, status, filtros, histórico, CSV, indicadores e gráficos reais.
- `admin-controls.js`: cadastros administrativos, vínculos, conteúdos, grupos e agenda pastoral.
- Estado de configuração pendente sem carregamento infinito ou erro técnico para o público.

## Tabelas principais

`profiles`, `user_roles`, `cells`, `leader_cells`, `cell_reports`, `prayer_requests`, `pastoral_visits`, `pastor_availability`, `testimonies`, `notifications`, `church_schedule`, `church_groups`, `content_pages` e `audit_logs`.

## RLS relevante

- Público: não lista relatórios, vínculos, auditoria ou dados pastorais privados.
- Líder: lê a própria vinculação e somente relatórios das células vinculadas; insere como si próprio; edita apenas `draft` e `returned`.
- Pastor/admin/superadmin: leem todos os relatórios.
- Admin/superadmin: gerenciam cadastros e conteúdo.
- Somente superadmin: lê auditoria e atribui/remover perfil `superadmin`.
- A restrição única `(cell_id, meeting_date)` impede relatório duplicado.

## Como vincular e testar

1. Crie o usuário em **Authentication > Users** e aguarde o primeiro login.
2. Entre como superadmin e abra **Administração > Usuários e células**.
3. Atribua o perfil `leader`.
4. Cadastre ou selecione a célula e salve o vínculo em **Vincular líder à célula**.
5. Entre com a conta do líder. O item **Relatório da Célula** aparece no menu.
6. Salve um rascunho, envie, devolva usando uma conta administrativa e confirme que o líder volta a editar.

## Passos manuais restantes

O CLI não possui sessão autenticada neste computador. Execute `EXECUTAR-NO-SUPABASE.sql` no SQL Editor e depois `CRIAR-PRIMEIRO-SUPERADMIN.sql` com o UUID real. As Edge Functions também precisam ser publicadas conforme `SUPABASE-GESTAO-IGREJA-SETUP.md`.
