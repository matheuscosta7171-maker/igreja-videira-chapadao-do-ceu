# Implementação do Sistema de Gestão da Igreja Videira

## Auditoria inicial — 20/07/2026

- Aplicação estática em HTML, CSS e JavaScript puro, publicada pelo GitHub Pages.
- Roteamento atual por âncoras (`#inicio`, `#agenda`, `#biblia`, etc.).
- Supabase já configurado com chave pública, autenticação por link mágico, Storage e Edge Function.
- Tabelas existentes documentadas no repositório: `palavras` e `jejum_materiais`.
- Edge Function existente: `bible-api`.
- Bíblia Almeida Histórica local preservada em arquivos JSON por livro.
- Painel legado restrito a um e-mail e sem perfis persistidos no banco.
- PWA existente com manifesto, ícones e estratégia network-first.
- Nenhuma `service_role`, senha, token privado ou chave secreta foi encontrada versionada.
- A chave `sb_publishable_...` é pública e apropriada para o frontend; a segurança depende de RLS.

## Decisões técnicas

1. Manter o projeto estático e a publicação no GitHub Pages.
2. Usar Supabase Auth, Postgres, RLS, Storage e Edge Functions para toda operação sensível.
3. Substituir a autorização por e-mail no frontend por perfis e papéis persistidos, mantendo compatibilidade temporária com o administrador atual enquanto a migração não for aplicada.
4. Não colocar dados privados no service worker, localStorage ou URLs.
5. Usar CSS nativo para gráficos leves, evitando uma biblioteca adicional.
6. Usar exclusão lógica (`ativo`, `arquivado`, `published`) nas entidades gerenciáveis.
7. Receber formulários públicos pela Edge Function `public-submissions`, com validação, honeypot e limite de requisições.
8. Manter notificações internas funcionais por gatilhos do banco. WhatsApp externo permanece inativo até a configuração oficial da Meta.
9. Tratar dados ainda não fornecidos (PIX, endereço oficial e informações da construção) como configuração pendente no painel, sem publicar valores fictícios.

## Arquitetura

```text
GitHub Pages (interface pública e painel)
        |
        +-- Supabase Auth (sessões e perfis)
        +-- Supabase Postgres + RLS (dados públicos e privados)
        +-- Supabase Storage (mídia pública autorizada)
        +-- Edge Functions
              +-- public-submissions (oração, visita e testemunho)
              +-- send-notification (estrutura oficial de e-mail/WhatsApp)
              +-- bible-api (integração bíblica secundária existente)
```

## Perfis

- `superadmin`: acesso total, papéis e auditoria.
- `admin`: conteúdo, moderação, agenda, líderes, células e relatórios.
- `pastor`: visitas, oração e relatórios gerais.
- `leader`: própria célula e próprios relatórios.
- `member`: serviços comuns e acompanhamento das próprias solicitações.
- Visitantes não recebem papel e usam somente os formulários públicos autorizados.

## Fases executadas

- [x] Auditoria, verificação de secrets, sincronização e branch.
- [ ] Migração, RLS, funções e Storage.
- [ ] Interface pública e painel por perfil.
- [ ] Testes automatizados e manuais.
- [ ] Documentação operacional.
- [ ] Pull Request, merge e GitHub Pages.

## Limitações externas esperadas

- A migração depende de acesso administrativo ao projeto Supabase.
- WhatsApp Cloud API depende de conta Meta, tokens e templates oficiais aprovados.
- PIX, endereço oficial, horários pastorais e conteúdo da construção dependem de dados reais informados pela igreja.
