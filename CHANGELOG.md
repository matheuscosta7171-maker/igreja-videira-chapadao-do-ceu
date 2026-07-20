# Changelog

## 2026-07-20 — Correção final de relatórios e administração

- causa do relatório ausente diagnosticada como migração não executada no Supabase remoto (`PGRST205`);
- consulta de perfil corrigida de `is_active` para `active`;
- novo fluxo de relatório com cinco estados, duplicidade protegida, histórico, filtros, busca, revisão, observação interna, CSV e gráficos reais;
- painel ampliado para usuários, vínculos, líderes, células, agenda, grupos, suprimentos e disponibilidade pastoral;
- dashboard conectado a métricas reais e estado de configuração pendente;
- RLS reforçada, atribuição de papéis por RPC segura e auditoria com valores anteriores/novos;
- adicionados `EXECUTAR-NO-SUPABASE.sql`, `CRIAR-PRIMEIRO-SUPERADMIN.sql` e diagnóstico operacional.

## 2026-07-20 — Sistema de gestão

- autenticação ampliada para superadmin, admin, pastor, líder, membro e visitante;
- migração segura com RLS, perfis, células, relatórios, pedidos, visitas, testemunhos, conteúdo, notificações e auditoria;
- painel responsivo de gestão, relatórios e moderação;
- formulários públicos com backend validado, antispam e privacidade;
- áreas Dízimos e Ofertas, Construção do Nosso Prédio e Onde Estamos, sem dados fictícios;
- Palavra renomeada visualmente para Suprimento da Célula, com histórico preservado;
- Edge Function para notificações oficiais preparada, desativada sem credenciais;
- PWA e cache revisados para não armazenar respostas privadas;
- Bíblia local, Agenda, Grupos, Endereços, Discipuladores, Liderança e 21 Dias preservados.
