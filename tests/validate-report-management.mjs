import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (name) => readFile(path.join(root, name), "utf8");
const [report, admin, auth, migration, html, worker, superadmin, diagnosis] =
  await Promise.all([
    read("report-management.js"),
    read("admin-controls.js"),
    read("supabase-app.js"),
    read("supabase/migrations/20260720120000_sistema_gestao_igreja.sql"),
    read("index.html"),
    read("service-worker.js"),
    read("CRIAR-PRIMEIRO-SUPERADMIN.sql"),
    read("DIAGNOSTICO-RELATORIO-CELULA.md"),
  ]);

// Fluxo e cálculos do relatório.
for (const status of ["draft", "submitted", "reviewed", "returned", "archived"])
  assert.ok(report.includes(`${status}:`) || migration.includes(`'${status}'`), `Status ausente: ${status}`);
for (const field of [
  "members_count",
  "regular_attendees_count",
  "visitors_count",
  "offering_pix",
  "offering_cash",
  "salvation_appeals_count",
  "internal_notes",
]) assert.ok(report.includes(field), `Campo ausente: ${field}`);
assert.ok(report.includes("number(form.members_count.value) +"), "Total de presença não é calculado durante a digitação");
assert.ok(report.includes("number(form.offering_pix.value) +"), "Total de ofertas não é calculado durante a digitação");
assert.ok(report.includes('style: "currency"') && report.includes('currency: "BRL"'), "Formato monetário BR ausente");
assert.ok(report.includes('result.error?.code === "23505"'), "Tratamento de duplicidade ausente");
assert.ok(report.includes('status in (\'draft\',\'returned\')') || migration.includes("status in ('draft','returned')"), "Rascunho/devolvido não protegidos");
assert.ok(report.includes("Exportar CSV") && report.includes("filterLeader") && report.includes("filterCell"), "Filtros/exportação ausentes");
assert.ok(report.includes("previousReports") && report.includes("Comparação mensal"), "Comparação mensal ausente");
assert.ok(report.includes("Nenhum relatório encontrado para o período selecionado."), "Estado vazio ausente");

// Matriz RLS: público, líderes A/B, equipe e superadmin.
assert.match(migration, /reports_select[\s\S]*to authenticated[\s\S]*leader_id=auth\.uid\(\)[\s\S]*owns_cell\(cell_id\)/, "Leitura do líder não está limitada por identidade/vínculo");
assert.match(migration, /reports_insert[\s\S]*leader_id=auth\.uid\(\)[\s\S]*owns_cell\(cell_id\)[\s\S]*created_by=auth\.uid\(\)/, "Inserção do líder não está limitada");
assert.match(migration, /reports_update[\s\S]*status in \('draft','returned'\)/, "Edição do líder enviado não está bloqueada");
assert.ok(!/reports_[^\n]*to anon/.test(migration), "Público recebeu política de relatórios");
assert.ok(migration.includes("array['superadmin','admin','pastor']"), "Equipe não recebeu visão consolidada");
assert.ok(migration.includes("audit_superadmin_read") && migration.includes("public.is_superadmin()"), "Auditoria não está restrita ao superadmin");
assert.ok(migration.includes("unique(cell_id,meeting_date)"), "Restrição de relatório duplicado ausente");

// Administração e configuração pendente.
for (const area of ["profiles", "leader_cells", "church_groups", "content_pages", "pastor_availability"])
  assert.ok(admin.includes(area), `Controle administrativo ausente: ${area}`);
assert.ok(admin.includes("weekly_meetings") && admin.includes("weeklyMeetingsAdminForm"), "Encontros da semana não são editáveis pelo painel");
assert.ok(admin.includes('upsert(data, { onConflict: "leader_id,cell_id" })'), "Vínculo líder/célula não usa chave composta");
assert.ok(auth.includes("O sistema administrativo ainda precisa ser ativado no Supabase."), "Mensagem de configuração pendente ausente");
assert.ok(auth.includes("active") && !auth.includes("is_active"), "Frontend ainda usa coluna de perfil incorreta");
assert.ok(html.includes("report-management.js") && html.includes("admin-controls.js"), "Novos módulos não estão no HTML");
assert.ok(superadmin.includes("COLOQUE_AQUI_O_ID_DO_USUARIO"), "Modelo de primeiro superadmin não é neutro");
assert.ok(diagnosis.includes("PGRST205"), "Diagnóstico não registra a causa remota");

// Segurança de secrets e PWA.
const combined = [report, admin, auth, migration, html, worker, superadmin].join("\n");
assert.ok(!/(service_role|sb_secret_|API_BIBLE_KEY\s*=\s*["'][^"']+)/i.test(combined), "Possível secret versionado");
assert.ok(worker.includes("authorization") && worker.includes("/rest/") && worker.includes("/functions/"), "Service worker pode armazenar respostas privadas");
assert.ok(!report.includes("innerHTML = result") && !admin.includes("innerHTML = result"), "Resposta externa inserida como HTML sem segurança");

console.log("OK — relatório, matriz de perfis, RLS, administração, configuração pendente, segurança e PWA validados.");
