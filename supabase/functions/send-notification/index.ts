import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const allowedOrigins = new Set(["https://matheuscosta7171-maker.github.io", "http://localhost:5500", "http://127.0.0.1:5500"]);
const cors = (origin: string | null) => ({ "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "https://matheuscosta7171-maker.github.io", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin" });
const response = (body: unknown, status: number, origin: string | null) => new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json" } });

serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== "POST") return response({ error: "Método não permitido." }, 405, origin);
  if (origin && !allowedOrigins.has(origin)) return response({ error: "Origem não autorizada." }, 403, origin);
  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return response({ error: "Não autorizado." }, 401, origin);
  const userResult = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON_KEY, authorization } });
  if (!userResult.ok) return response({ error: "Sessão inválida." }, 401, origin);
  const user = await userResult.json();
  const roleResult = await fetch(`${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${encodeURIComponent(user.id)}&role=in.(superadmin,admin,pastor)&select=role`, { headers: { apikey: ANON_KEY, authorization } });
  const roles = roleResult.ok ? await roleResult.json() : [];
  if (!roles.length) return response({ error: "Sem permissão." }, 403, origin);

  const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  if (!token || !phoneId) return response({ ok: true, configured: false, message: "WhatsApp aguardando configuração." }, 200, origin);
  try {
    const body = await req.json();
    if (body.send !== true || body.consent !== true) return response({ error: "Envio não autorizado pelo destinatário." }, 400, origin);
    const templates: Record<string, string | undefined> = {
      visit_requested: Deno.env.get("WHATSAPP_TEMPLATE_VISITA_SOLICITADA"),
      visit_confirmed: Deno.env.get("WHATSAPP_TEMPLATE_VISITA_CONFIRMADA"),
    };
    const template = templates[body.event];
    const recipient = typeof body.recipient === "string" ? body.recipient.replace(/\D/g, "") : "";
    if (!template || !/^\d{10,15}$/.test(recipient)) return response({ error: "Template ou destinatário inválido." }, 400, origin);
    const graph = await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", to: recipient, type: "template", template: { name: template, language: { code: "pt_BR" } } }) });
    if (!graph.ok) throw new Error(`meta:${graph.status}`);
    return response({ ok: true, configured: true }, 200, origin);
  } catch (error) {
    console.error("notification", error instanceof Error ? error.message : "unknown");
    return response({ error: "Não foi possível enviar a notificação." }, 502, origin);
  }
});
