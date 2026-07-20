import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const allowedOrigins = new Set([
  "https://matheuscosta7171-maker.github.io",
  "http://localhost:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
]);
const attempts = new Map<string, number[]>();

function cors(origin: string | null) {
  const accepted = origin && allowedOrigins.has(origin) ? origin : "https://matheuscosta7171-maker.github.io";
  return { "Access-Control-Allow-Origin": accepted, "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" };
}
function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json; charset=utf-8" } });
}
function text(value: unknown, max: number, required = false) {
  const clean = typeof value === "string" ? value.trim().replace(/[\u0000-\u001f\u007f]/g, " ") : "";
  if ((required && !clean) || clean.length > max) throw new Error("invalid");
  return clean || null;
}
function bool(value: unknown) { return value === true; }
function date(value: unknown) {
  if (!value) return null;
  const clean = text(value, 32, true)!;
  if (Number.isNaN(Date.parse(clean))) throw new Error("invalid");
  return clean;
}
async function authenticatedUser(req: Request) {
  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const result = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON_KEY, authorization } });
  if (!result.ok) return null;
  return (await result.json()).id as string;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405, origin);
  if (origin && !allowedOrigins.has(origin)) return json({ error: "Origem não autorizada." }, 403, origin);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter((time) => now - time < 10 * 60_000);
  if (recent.length >= 5) return json({ error: "Muitos envios. Aguarde alguns minutos." }, 429, origin);
  recent.push(now); attempts.set(ip, recent);

  try {
    const body = await req.json();
    if (body.website) return json({ ok: true, message: "Recebido." }, 202, origin);
    const submitter_id = await authenticatedUser(req);
    let table = ""; let payload: Record<string, unknown> = { submitter_id };
    if (body.kind === "prayer") {
      table = "prayer_requests";
      const anonymous = bool(body.is_anonymous);
      payload = { ...payload, name: text(body.name, 120, !anonymous) || "Anônimo", contact: text(body.contact, 160), request_text: text(body.request_text, 3000, true), anonymous, contact_allowed: bool(body.contact_consent) };
    } else if (body.kind === "visit") {
      table = "pastoral_visits";
      const typeMap: Record<string, string> = { "visita pastoral": "pastoral_visit", "aconselhamento": "counseling", "oração": "prayer", "visita hospitalar": "hospital", "visita familiar": "family", "outro": "other" };
      const requestedType = text(body.appointment_type, 40, true)!;
      if (!typeMap[requestedType]) throw new Error("invalid");
      payload = { ...payload, name: text(body.name, 120, true), phone: text(body.phone, 30, true), email: text(body.email, 160), visit_type: typeMap[requestedType], reason_summary: text(body.reason, 500, true), desired_date: date(body.desired_date), desired_time: text(body.desired_time, 10, true), address_text: text(body.address, 500), observations: text(body.notes, 1500), contact_consent: bool(body.contact_consent) };
      if (!payload.contact_consent) throw new Error("consent");
    } else if (body.kind === "testimony") {
      table = "testimonies";
      payload = { ...payload, name: text(body.name, 120, true), title: text(body.title, 160, true), testimony_text: text(body.testimony_text, 5000, true), event_date: date(body.event_date), publication_authorized: bool(body.publication_consent), show_name: bool(body.show_name), contact: text(body.contact, 160) };
    } else return json({ error: "Tipo de envio inválido." }, 400, origin);
    const authorization = req.headers.get("authorization") || `Bearer ${ANON_KEY}`;
    const result = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: "POST", headers: { apikey: ANON_KEY, authorization, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(payload) });
    if (!result.ok) throw new Error(`database:${result.status}`);
    return json({ ok: true, message: "Recebemos sua solicitação com segurança." }, 201, origin);
  } catch (error) {
    if (error instanceof Error && ["invalid", "consent"].includes(error.message)) return json({ error: error.message === "consent" ? "Autorize o contato para solicitar a visita." : "Confira os campos informados." }, 400, origin);
    console.error("public-submission", error instanceof Error ? error.message : "unknown");
    return json({ error: "Não foi possível concluir agora. Tente novamente." }, 500, origin);
  }
});
