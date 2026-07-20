# Notificações oficiais por WhatsApp

Notificações internas já funcionam. O envio externo permanece desativado até configurar a WhatsApp Cloud API da Meta e templates aprovados.

```powershell
supabase secrets set WHATSAPP_ACCESS_TOKEN="COLE_O_TOKEN_OFICIAL"
supabase secrets set WHATSAPP_PHONE_NUMBER_ID="COLE_O_ID"
supabase secrets set WHATSAPP_BUSINESS_ACCOUNT_ID="COLE_O_ID"
supabase secrets set WHATSAPP_TEMPLATE_VISITA_SOLICITADA="NOME_DO_TEMPLATE"
supabase secrets set WHATSAPP_TEMPLATE_VISITA_CONFIRMADA="NOME_DO_TEMPLATE"
supabase functions deploy send-notification
```

A função só aceita usuário autenticado com papel `superadmin`, `admin` ou `pastor`, destinatário válido, template permitido, `send: true` e consentimento explícito. Não usa WhatsApp Web, Selenium ou integração não oficial. Teste em ambiente controlado antes de habilitar produção.
