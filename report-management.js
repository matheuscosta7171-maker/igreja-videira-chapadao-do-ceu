(function () {
  "use strict";
  window.reportManagementV2 = true;
  const db = window.videiraSupabase;
  const panel = document.querySelector('[data-admin-panel="reports"]');
  if (!db || !panel) return;
  const statusLabels = {
    draft: "Rascunho",
    submitted: "Enviado",
    reviewed: "Revisado",
    returned: "Devolvido",
    archived: "Arquivado",
  };
  const state = {
    auth: null,
    cells: [],
    leaders: [],
    reports: [],
    previousReports: [],
    current: null,
    configured: true,
  };
  const money = (value) =>
    (Number(value) || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  const number = (value) => Math.max(0, Number(value) || 0);
  const date = (value) =>
    value
      ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString(
          "pt-BR",
        )
      : "—";
  const text = (tag, value, className = "") => {
    const node = document.createElement(tag);
    node.textContent = value ?? "";
    if (className) node.className = className;
    return node;
  };
  const isStaff = () => state.auth?.hasRole("superadmin", "admin", "pastor");
  const canAdminister = () => state.auth?.hasRole("superadmin", "admin");
  const setMessage = (value, type = "") => {
    const node = document.getElementById("reportStatus");
    if (node) {
      node.textContent = value;
      node.className = `management-message ${type}`;
    }
  };

  panel.innerHTML = `<div class="report-heading"><div><span class="eyebrow">Acompanhamento semanal</span><h3>Relatório da Célula</h3><p>Registre dados reais da reunião. Os totais são calculados automaticamente.</p></div><span id="reportCurrentStatus" class="report-status">Novo relatório</span></div>
  <div id="reportConfiguration" class="report-configuration" hidden><strong>O sistema administrativo ainda precisa ser ativado no Supabase.</strong><p>Execute o arquivo <code>EXECUTAR-NO-SUPABASE.sql</code> no SQL Editor.</p></div>
  <form id="cellReportFormV2" class="management-form report-form"><input type="hidden" name="id"><label>Nome do líder<input id="reportLeaderName" readonly></label><label class="staff-report-field">Cadastrar em nome de<select name="leader_id" id="reportLeader"></select></label><label>Nome da célula<select name="cell_id" id="reportCell" required></select></label><label>Data da reunião<input type="date" name="meeting_date" required></label><label>Membros<input type="number" name="members_count" min="0" value="0"></label><label>Frequentadores assíduos<input type="number" name="regular_attendees_count" min="0" value="0"></label><label>Visitantes<input type="number" name="visitors_count" min="0" value="0"></label><label>Total de participantes<output id="attendanceTotal">0</output></label><label>Oferta via PIX<input type="number" name="offering_pix" min="0" step="0.01" value="0"></label><label>Oferta em dinheiro<input type="number" name="offering_cash" min="0" step="0.01" value="0"></label><label>Total das ofertas<output id="offeringTotal">R$ 0,00</output></label><label>Apelos de salvação<input type="number" name="salvation_appeals_count" min="0" value="0"></label><label class="full">Observações<textarea name="observations" maxlength="2000"></textarea></label><label class="full staff-report-field">Observação interna da revisão<textarea name="internal_notes" maxlength="2000"></textarea></label><div class="full report-form-actions"><button class="mg-button" type="button" id="newReport">Novo</button><button class="mg-button" type="submit" data-save-status="draft">Salvar rascunho</button><button class="mg-button primary" type="submit" data-save-status="submitted">Enviar relatório</button></div><p id="reportStatus" class="full" role="status"></p></form>
  <div class="report-filters"><label>Mês<select id="filterMonth">${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${new Date(2026, i, 1).toLocaleDateString("pt-BR", { month: "long" })}</option>`).join("")}</select></label><label>Ano<select id="filterYear"></select></label><label>Status<select id="filterStatus"><option value="all">Todos</option>${Object.entries(
    statusLabels,
  )
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join(
      "",
    )}</select></label><label class="staff-report-field">Líder<select id="filterLeader"><option value="all">Todos</option></select></label><label>Célula<select id="filterCell"><option value="all">Todas</option></select></label><label class="report-search staff-report-field">Buscar<input id="filterSearch" type="search" placeholder="Líder ou célula"></label><button id="refreshReportsV2" class="mg-button" type="button">Atualizar</button><button id="exportReports" class="mg-button staff-report-field" type="button">Exportar CSV</button></div>
  <div id="reportSummary" class="report-summary"></div><div id="reportChartV2" class="report-chart-v2"></div><div id="reportsTable" class="reports-table" aria-live="polite"></div>`;
  const form = document.getElementById("cellReportFormV2");

  function setOptions(select, items, placeholder) {
    select.replaceChildren();
    if (placeholder) {
      const option = document.createElement("option");
      option.value = "all";
      option.textContent = placeholder;
      select.append(option);
    }
    items.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.name || item.full_name || item.email;
      select.append(option);
    });
  }
  function updateTotals() {
    for (const input of form.querySelectorAll('input[type="number"]'))
      if (input.value === "" || Number(input.value) < 0) input.value = "0";
    const total =
      number(form.members_count.value) +
      number(form.regular_attendees_count.value) +
      number(form.visitors_count.value);
    const offerings =
      number(form.offering_pix.value) + number(form.offering_cash.value);
    document.getElementById("attendanceTotal").textContent = String(total);
    document.getElementById("offeringTotal").textContent = money(offerings);
  }
  function editingAllowed(report) {
    return (
      !report || isStaff() || ["draft", "returned"].includes(report.status)
    );
  }
  function resetForm() {
    state.current = null;
    form.reset();
    form.elements.id.value = "";
    for (const input of form.querySelectorAll('input[type="number"]'))
      input.value = "0";
    if (!isStaff()) {
      form.leader_id.value = state.auth?.session?.user?.id || "";
      document.getElementById("reportLeaderName").value =
        state.auth?.profile?.full_name || state.auth?.profile?.email || "";
    }
    document.getElementById("reportCurrentStatus").textContent =
      "Novo relatório";
    form
      .querySelectorAll("input,select,textarea")
      .forEach((field) => (field.disabled = false));
    form.elements.id.disabled = false;
    form.querySelectorAll("[data-save-status]").forEach((button) => (button.disabled = false));
    document.getElementById("reportLeaderName").readOnly = true;
    document
      .querySelectorAll(".staff-report-field")
      .forEach((node) => (node.hidden = !isStaff()));
    updateTotals();
    setMessage("");
  }
  function fillForm(report) {
    state.current = report;
    form.elements.id.value = report.id;
    form.leader_id.value = report.leader_id;
    form.cell_id.value = report.cell_id;
    form.meeting_date.value = report.meeting_date;
    for (const key of [
      "members_count",
      "regular_attendees_count",
      "visitors_count",
      "offering_pix",
      "offering_cash",
      "salvation_appeals_count",
      "observations",
      "internal_notes",
    ])
      if (form.elements[key]) form.elements[key].value = report[key] ?? "";
    document.getElementById("reportLeaderName").value =
      report.profiles?.full_name || report.profiles?.email || "";
    document.getElementById("reportCurrentStatus").textContent =
      statusLabels[report.status] || report.status;
    const allowed = editingAllowed(report);
    for (const field of form.querySelectorAll("input,select,textarea"))
      field.disabled = !allowed;
    form.elements.id.disabled = false;
    form.querySelectorAll("[data-save-status]").forEach((button) => (button.disabled = !allowed));
    document.getElementById("reportLeaderName").disabled = false;
    document.getElementById("reportLeaderName").readOnly = true;
    document.getElementById("newReport").disabled = false;
    updateTotals();
    setMessage(
      allowed
        ? "Relatório aberto para edição."
        : "Relatório enviado e bloqueado para edição do líder.",
      allowed ? "success" : "",
    );
  }
  async function checkExisting() {
    const cellId = form.cell_id.value,
      meetingDate = form.meeting_date.value;
    if (!cellId || !meetingDate) return;
    const { data, error } = await db
      .from("cell_reports")
      .select(
        "*,cells(name),profiles!cell_reports_leader_id_fkey(full_name,email)",
      )
      .eq("cell_id", cellId)
      .eq("meeting_date", meetingDate)
      .maybeSingle();
    if (!error && data) fillForm(data);
    else if (!state.current)
      setMessage("Nenhum relatório existente para esta célula e data.");
  }
  async function loadAccessData() {
    const auth = state.auth;
    if (!auth?.privateAccess) return;
    const probe = await db.from("cell_reports").select("id").limit(1);
    state.configured = probe.error?.code !== "PGRST205";
    document.getElementById("reportConfiguration").hidden = state.configured;
    form.hidden = !state.configured;
    document.querySelector(".report-filters").hidden = !state.configured;
    if (!state.configured) return;
    if (isStaff()) {
      const [cellsResult, profilesResult] = await Promise.all([
        db.from("cells").select("*").neq("status", "archived").order("name"),
        db
          .from("profiles")
          .select("id,full_name,email,active,user_roles(role)")
          .eq("active", true)
          .order("full_name"),
      ]);
      state.cells = cellsResult.data || [];
      state.leaders = (profilesResult.data || []).filter((person) =>
        (person.user_roles || []).some((item) => item.role === "leader"),
      );
    } else {
      const links = await db
        .from("leader_cells")
        .select("cell_id,cells(*)")
        .eq("leader_id", auth.session.user.id);
      state.cells = (links.data || [])
        .map((item) => item.cells)
        .filter(Boolean);
      state.leaders = [
        {
          id: auth.session.user.id,
          full_name: auth.profile?.full_name,
          email: auth.profile?.email,
        },
      ];
    }
    setOptions(document.getElementById("reportCell"), state.cells);
    setOptions(document.getElementById("reportLeader"), state.leaders);
    setOptions(document.getElementById("filterCell"), state.cells, "Todas");
    setOptions(document.getElementById("filterLeader"), state.leaders, "Todos");
    document.getElementById("reportLeaderName").value =
      auth.profile?.full_name || auth.profile?.email || "";
    if (!isStaff()) form.leader_id.value = auth.session.user.id;
    resetForm();
    loadReports();
    loadDashboardMetrics();
  }
  function filterReports(source = state.reports) {
    const status = document.getElementById("filterStatus").value,
      leader = document.getElementById("filterLeader").value,
      cell = document.getElementById("filterCell").value,
      query = document
        .getElementById("filterSearch")
        .value.trim()
        .toLocaleLowerCase("pt-BR");
    return source.filter(
      (item) =>
        (status === "all" || item.status === status) &&
        (leader === "all" || item.leader_id === leader) &&
        (cell === "all" || item.cell_id === cell) &&
        (!query ||
          `${item.profiles?.full_name || ""} ${item.cells?.name || ""}`
            .toLocaleLowerCase("pt-BR")
            .includes(query)),
    );
  }
  function action(label, handler, kind = "") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `mg-button ${kind}`;
    button.textContent = label;
    button.addEventListener("click", handler);
    return button;
  }
  function renderReports() {
    const reports = filterReports(),
      box = document.getElementById("reportsTable"),
      chart = document.getElementById("reportChartV2"),
      summary = document.getElementById("reportSummary");
    box.replaceChildren();
    chart.replaceChildren();
    summary.replaceChildren();
    if (!reports.length) {
      box.append(
        text(
          "p",
          "Nenhum relatório encontrado para o período selecionado.",
          "empty-report",
        ),
      );
      return;
    }
    const total = reports.reduce(
        (sum, item) => sum + number(item.total_attendance),
        0,
      ),
      visitors = reports.reduce(
        (sum, item) => sum + number(item.visitors_count),
        0,
      ),
      appeals = reports.reduce(
        (sum, item) => sum + number(item.salvation_appeals_count),
        0,
      ),
      average = total / reports.length;
    const previousTotal = filterReports(state.previousReports).reduce(
        (sum, item) => sum + number(item.total_attendance),
        0,
      ),
      comparison = previousTotal
        ? `${(((total - previousTotal) / previousTotal) * 100).toFixed(1)}%`
        : "Sem base anterior";
    [
      ["Relatórios", reports.length],
      ["Presença total", total],
      ["Média semanal", average.toFixed(1)],
      ["Visitantes", visitors],
      ["Apelos", appeals],
      ["Comparação mensal", comparison],
    ].forEach(([label, value]) => {
      const card = document.createElement("article");
      card.append(text("small", label), text("strong", value));
      summary.append(card);
    });
    const max = Math.max(
      ...reports.map((item) => number(item.total_attendance)),
      1,
    );
    reports.forEach((item) => {
      const row = document.createElement("div");
      row.className = "report-chart-row";
      row.append(
        text(
          "span",
          `${date(item.meeting_date)} • ${item.cells?.name || "Célula"}`,
        ),
      );
      const bars = document.createElement("div");
      bars.className = "stacked-bars";
      for (const [key, color] of [
        ["members_count", "members"],
        ["regular_attendees_count", "regular"],
        ["visitors_count", "visitors"],
      ]) {
        const bar = document.createElement("i");
        bar.className = color;
        bar.style.width = `${(number(item[key]) / max) * 100}%`;
        bar.title = `${key}: ${number(item[key])}`;
        bars.append(bar);
      }
      row.append(bars, text("strong", item.total_attendance));
      chart.append(row);
    });
    const table = document.createElement("table");
    const head = document.createElement("thead");
    head.innerHTML = `<tr><th>Data</th><th>Líder / célula</th><th>Membros</th><th>Assíduos</th><th>Visitantes</th><th>Total</th><th>Apelos</th>${isStaff() ? "<th>PIX</th><th>Dinheiro</th><th>Ofertas</th>" : ""}<th>Status</th><th>Ações</th></tr>`;
    table.append(head);
    const body = document.createElement("tbody");
    reports.forEach((item) => {
      const row = document.createElement("tr");
      [
        date(item.meeting_date),
        `${item.profiles?.full_name || "—"} / ${item.cells?.name || "—"}`,
        item.members_count,
        item.regular_attendees_count,
        item.visitors_count,
        item.total_attendance,
        item.salvation_appeals_count,
      ].forEach((value) => row.append(text("td", value)));
      if (isStaff())
        [item.offering_pix, item.offering_cash, item.total_offering].forEach(
          (value) => row.append(text("td", money(value))),
        );
      row.append(text("td", statusLabels[item.status] || item.status));
      const actions = document.createElement("td");
      actions.className = "report-row-actions";
      actions.append(action("Visualizar", () => fillForm(item)));
      if (editingAllowed(item))
        actions.append(action("Editar", () => fillForm(item)));
      if (isStaff() && item.status === "submitted")
        actions.append(
          action("Revisar", () => changeStatus(item, "reviewed"), "primary"),
          action("Devolver", () => changeStatus(item, "returned")),
        );
      if (isStaff() && item.status !== "archived")
        actions.append(
          action("Arquivar", () => changeStatus(item, "archived")),
        );
      row.append(actions);
      body.append(row);
    });
    table.append(body);
    box.append(table);
  }
  async function loadReports() {
    if (!state.configured) return;
    const month = Number(document.getElementById("filterMonth").value),
      year = Number(document.getElementById("filterYear").value),
      start = `${year}-${String(month).padStart(2, "0")}-01`,
      end = new Date(year, month, 0).toISOString().slice(0, 10),
      previousEndDate = new Date(year, month - 1, 0),
      previousEnd = previousEndDate.toISOString().slice(0, 10),
      previousStart = `${previousEndDate.getFullYear()}-${String(previousEndDate.getMonth() + 1).padStart(2, "0")}-01`,
      select =
        "*,cells(name),profiles!cell_reports_leader_id_fkey(full_name,email)";
    const [currentResult, previousResult] = await Promise.all([
      db
        .from("cell_reports")
        .select(select)
        .gte("meeting_date", start)
        .lte("meeting_date", end)
        .order("meeting_date", { ascending: false }),
      db
        .from("cell_reports")
        .select(select)
        .gte("meeting_date", previousStart)
        .lte("meeting_date", previousEnd),
    ]);
    const { data, error } = currentResult;
    if (error) {
      setMessage(
        error.code === "PGRST205"
          ? "O sistema administrativo ainda precisa ser ativado no Supabase."
          : "Não foi possível carregar os relatórios agora.",
        "error",
      );
      state.reports = [];
      state.previousReports = [];
    } else {
      state.reports = data || [];
      state.previousReports = previousResult.data || [];
    }
    renderReports();
  }
  async function changeStatus(report, status) {
    if (!confirm(`Alterar o relatório para “${statusLabels[status]}”?`)) return;
    const payload = { status };
    if (["reviewed", "returned", "archived"].includes(status)) {
      payload.reviewed_by = state.auth.session.user.id;
      payload.reviewed_at = new Date().toISOString();
      payload.internal_notes =
        form.internal_notes.value || report.internal_notes || null;
    }
    const { error } = await db
      .from("cell_reports")
      .update(payload)
      .eq("id", report.id);
    if (error)
      return setMessage("Não foi possível alterar o relatório.", "error");
    setMessage("Status atualizado.", "success");
    loadReports();
    loadDashboardMetrics();
  }
  async function saveReport(event) {
    event.preventDefault();
    const submitter = event.submitter;
    if (!submitter?.dataset.saveStatus) return;
    updateTotals();
    const requestedStatus = submitter.dataset.saveStatus,
      auth = state.auth;
    if (!auth?.privateAccess) return;
    const payload = {
      cell_id: form.cell_id.value,
      leader_id: isStaff() ? form.leader_id.value : auth.session.user.id,
      meeting_date: form.meeting_date.value,
      members_count: number(form.members_count.value),
      regular_attendees_count: number(form.regular_attendees_count.value),
      visitors_count: number(form.visitors_count.value),
      offering_pix: number(form.offering_pix.value),
      offering_cash: number(form.offering_cash.value),
      salvation_appeals_count: number(form.salvation_appeals_count.value),
      observations: form.observations.value.trim() || null,
      status: requestedStatus,
    };
    if (isStaff())
      payload.internal_notes = form.internal_notes.value.trim() || null;
    if (!payload.cell_id || !payload.leader_id || !payload.meeting_date)
      return setMessage("Informe líder, célula e data.", "error");
    let result;
    if (form.elements.id.value)
      result = await db
        .from("cell_reports")
        .update(payload)
        .eq("id", form.elements.id.value)
        .select(
          "*,cells(name),profiles!cell_reports_leader_id_fkey(full_name,email)",
        )
        .single();
    else
      result = await db
        .from("cell_reports")
        .insert({ ...payload, created_by: auth.session.user.id })
        .select(
          "*,cells(name),profiles!cell_reports_leader_id_fkey(full_name,email)",
        )
        .single();
    if (result.error?.code === "23505") {
      await checkExisting();
      return setMessage(
        "Já existe um relatório para esta célula e data. O registro existente foi aberto.",
        "error",
      );
    }
    if (result.error)
      return setMessage(
        "Não foi possível salvar. Confira suas permissões e tente novamente.",
        "error",
      );
    fillForm(result.data);
    setMessage(
      requestedStatus === "submitted"
        ? "Relatório enviado e bloqueado para edição."
        : "Rascunho salvo.",
      "success",
    );
    loadReports();
    loadDashboardMetrics();
  }
  function exportCsv() {
    const reports = filterReports();
    if (!reports.length) return;
    const rows = [
      [
        "Data",
        "Líder",
        "Célula",
        "Membros",
        "Assíduos",
        "Visitantes",
        "Total",
        "Apelos",
        "PIX",
        "Dinheiro",
        "Total ofertas",
        "Status",
      ],
      ...reports.map((item) => [
        item.meeting_date,
        item.profiles?.full_name || "",
        item.cells?.name || "",
        item.members_count,
        item.regular_attendees_count,
        item.visitors_count,
        item.total_attendance,
        item.salvation_appeals_count,
        item.offering_pix,
        item.offering_cash,
        item.total_offering,
        statusLabels[item.status],
      ]),
    ];
    const csv =
      "\ufeff" +
      rows
        .map((row) =>
          row
            .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
            .join(";"),
        )
        .join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    link.download = `relatorios-${document.getElementById("filterYear").value}-${document.getElementById("filterMonth").value}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
  async function loadDashboardMetrics() {
    if (!isStaff() || !state.configured) return;
    const now = new Date(),
      start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const [
      profiles,
      roles,
      cells,
      reports,
      prayers,
      visits,
      testimonies,
      events,
      drafts,
    ] = await Promise.all([
      db.from("profiles").select("id,active"),
      db.from("user_roles").select("user_id,role"),
      db.from("cells").select("id,status"),
      db
        .from("cell_reports")
        .select(
          "total_attendance,visitors_count,salvation_appeals_count,status",
        )
        .gte("meeting_date", start),
      db.from("prayer_requests").select("id,status"),
      db.from("pastoral_visits").select("id,status"),
      db.from("testimonies").select("id,status"),
      db
        .from("church_schedule")
        .select("id")
        .gte("starts_at", new Date().toISOString())
        .eq("archived", false),
      db.from("content_pages").select("id,status").eq("status", "draft"),
    ]);
    const reportData = reports.data || [],
      cards = [
        [
          "Usuários ativos",
          (profiles.data || []).filter((x) => x.active).length,
          "people",
        ],
        [
          "Líderes",
          new Set(
            (roles.data || [])
              .filter((x) => x.role === "leader")
              .map((x) => x.user_id),
          ).size,
          "people",
        ],
        [
          "Células",
          (cells.data || []).filter((x) => x.status === "active").length,
          "people",
        ],
        [
          "Relatórios enviados",
          reportData.filter((x) => ["submitted", "reviewed"].includes(x.status))
            .length,
          "reports",
        ],
        [
          "Relatórios pendentes",
          Math.max(
            0,
            (cells.data || []).filter((x) => x.status === "active").length -
              reportData.filter((x) =>
                ["submitted", "reviewed"].includes(x.status),
              ).length,
          ),
          "reports",
        ],
        [
          "Média de presença",
          reportData.length
            ? (
                reportData.reduce((s, x) => s + number(x.total_attendance), 0) /
                reportData.length
              ).toFixed(1)
            : 0,
          "reports",
        ],
        [
          "Visitantes no mês",
          reportData.reduce((s, x) => s + number(x.visitors_count), 0),
          "reports",
        ],
        [
          "Apelos no mês",
          reportData.reduce((s, x) => s + number(x.salvation_appeals_count), 0),
          "reports",
        ],
        [
          "Orações pendentes",
          (prayers.data || []).filter((x) => x.status === "received").length,
          "pastoral",
        ],
        [
          "Testemunhos pendentes",
          (testimonies.data || []).filter((x) => x.status === "pending").length,
          "pastoral",
        ],
        [
          "Visitas pendentes",
          (visits.data || []).filter((x) =>
            ["requested", "awaiting_confirmation"].includes(x.status),
          ).length,
          "pastoral",
        ],
        ["Eventos futuros", (events.data || []).length, "content"],
        ["Conteúdos em rascunho", (drafts.data || []).length, "content"],
      ];
    const box = document.getElementById("dashboardCards");
    if (!box) return;
    box.replaceChildren();
    cards.forEach(([label, value, target]) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "dashboard-metric-card";
      card.append(text("small", label), text("strong", value));
      card.addEventListener("click", () =>
        document.querySelector(`[data-admin-tab="${target}"]`)?.click(),
      );
      box.append(card);
    });
  }
  function setupFilters() {
    const now = new Date(),
      year = document.getElementById("filterYear");
    for (
      let value = now.getFullYear() - 2;
      value <= now.getFullYear() + 1;
      value++
    ) {
      const option = document.createElement("option");
      option.value = String(value);
      option.textContent = String(value);
      if (value === now.getFullYear()) option.selected = true;
      year.append(option);
    }
    document.getElementById("filterMonth").value = String(now.getMonth() + 1);
    [
      "filterMonth",
      "filterYear",
      "filterStatus",
      "filterLeader",
      "filterCell",
    ].forEach((id) =>
      document.getElementById(id).addEventListener("change", renderOrLoad),
    );
    document
      .getElementById("filterSearch")
      .addEventListener("input", renderReports);
  }
  function renderOrLoad(event) {
    if (["filterMonth", "filterYear"].includes(event.target.id)) loadReports();
    else renderReports();
  }
  function ensureReportNav() {
    let link = document.getElementById("reportNavLink");
    if (state.auth?.privateAccess) {
      if (!link) {
        link = document.createElement("a");
        link.id = "reportNavLink";
        link.href = "#admin";
        link.textContent = "Relatório da Célula";
        link.addEventListener("click", () =>
          setTimeout(
            () => document.querySelector('[data-admin-tab="reports"]')?.click(),
            0,
          ),
        );
        document.querySelector(".nav")?.append(link);
      }
      link.hidden = false;
    } else if (link) link.hidden = true;
  }
  form.addEventListener("input", updateTotals);
  form.addEventListener("submit", saveReport);
  form.cell_id.addEventListener("change", checkExisting);
  form.meeting_date.addEventListener("change", checkExisting);
  form.leader_id.addEventListener("change", () => {
    const leader = state.leaders.find((item) => item.id === form.leader_id.value);
    document.getElementById("reportLeaderName").value =
      leader?.full_name || leader?.email || "";
  });
  document.getElementById("newReport").addEventListener("click", resetForm);
  document
    .getElementById("refreshReportsV2")
    .addEventListener("click", loadReports);
  document.getElementById("exportReports").addEventListener("click", exportCsv);
  setupFilters();
  window.addEventListener("church-auth-changed", (event) => {
    state.auth = event.detail;
    ensureReportNav();
    document
      .querySelectorAll(".staff-report-field")
      .forEach((node) => (node.hidden = !isStaff()));
    if (state.auth?.privateAccess) loadAccessData();
  });
  if (window.churchAuth) {
    state.auth = window.churchAuth;
    ensureReportNav();
    if (state.auth.privateAccess) loadAccessData();
  }
})();
