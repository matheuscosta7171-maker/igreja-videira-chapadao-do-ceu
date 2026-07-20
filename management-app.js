(function () {
  "use strict";
  const API =
    "https://lzytpdkqdiamlikvvcuu.supabase.co/functions/v1/public-submissions";
  const db = window.videiraSupabase;
  const managedHighlightKeys = new Set();
  const main = document.querySelector("main");
  if (!main || !db) return;

  const escape = (value) => {
    const node = document.createElement("span");
    node.textContent = value ?? "";
    return node.innerHTML;
  };
  const fmtDate = (value) =>
    value
      ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString(
          "pt-BR",
        )
      : "—";
  const message = (node, text, type = "") => {
    node.textContent = text;
    node.className = `management-message ${type}`.trim();
  };
  const button = (label, action, kind = "") => {
    const el = document.createElement("button");
    el.type = "button";
    el.textContent = label;
    el.className = `mg-button ${kind}`;
    el.addEventListener("click", action);
    return el;
  };
  async function submitPublic(form, kind) {
    const status = form.querySelector("[data-form-status]");
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    message(status, "Enviando com segurança…");
    const payload = Object.fromEntries(new FormData(form));
    payload.kind = kind;
    for (const checkbox of form.querySelectorAll('input[type="checkbox"]'))
      payload[checkbox.name] = checkbox.checked;
    try {
      const headers = { "Content-Type": "application/json" };
      const token = window.churchAuth?.session?.access_token;
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(API, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      form.reset();
      message(status, data.message || "Recebemos sua solicitação.", "success");
    } catch (error) {
      message(
        status,
        error.message || "Não foi possível concluir agora. Tente novamente.",
        "error",
      );
    } finally {
      submit.disabled = false;
    }
  }

  const services = document.createElement("section");
  services.id = "servicos";
  services.className = "section management-public";
  services.innerHTML = `
    <div class="section-heading"><div><span class="eyebrow">Cuidado e comunhão</span><h2>Serviços da Igreja</h2><p class="section-intro">Envie sua solicitação com privacidade. As informações são acessadas apenas pela equipe autorizada.</p></div></div>
    <div class="service-tabs" role="tablist" aria-label="Serviços"><button class="active" data-service="prayer">Pedidos de Oração</button><button data-service="visit">Visita Pastoral</button><button data-service="testimony">Testemunhos</button><button data-service="giving">Dízimos e Ofertas</button><button data-service="construction">Nosso Prédio</button><button data-service="location">Onde Estamos</button></div>
    <div class="service-panel active" data-panel="prayer"><div class="public-form-intro"><h3>Pedidos de Oração</h3><p>Queremos orar com você. Seu pedido não será publicado automaticamente.</p></div><form id="prayerRequestForm" class="management-form"><input class="hp" name="website" tabindex="-1" autocomplete="off"><label>Nome<input name="name" maxlength="120"></label><label>Telefone ou e-mail (opcional)<input name="contact" maxlength="160"></label><label class="full">Pedido de oração<textarea name="request_text" minlength="10" maxlength="3000" required></textarea></label><label class="check full"><input type="checkbox" name="is_anonymous"> Quero permanecer anônimo</label><label class="check full"><input type="checkbox" name="contact_consent"> Autorizo contato da liderança</label><button class="mg-button primary" type="submit">Enviar pedido</button><p data-form-status role="status"></p></form></div>
    <div class="service-panel" data-panel="visit"><div class="public-form-intro"><h3>Agendar Visita Pastoral</h3><p>Solicite um atendimento. A data será confirmada pela equipe pastoral.</p></div><form id="pastoralVisitForm" class="management-form"><input class="hp" name="website" tabindex="-1" autocomplete="off"><label>Nome<input name="name" maxlength="120" required></label><label>Telefone<input name="phone" maxlength="30" inputmode="tel" required></label><label>E-mail (opcional)<input type="email" name="email" maxlength="160"></label><label>Tipo<select name="appointment_type" required><option value="visita pastoral">Visita pastoral</option><option value="aconselhamento">Aconselhamento</option><option value="oração">Oração</option><option value="visita hospitalar">Visita hospitalar</option><option value="visita familiar">Visita familiar</option><option value="outro">Outro</option></select></label><label>Data desejada<input type="date" name="desired_date" required></label><label>Horário desejado<input type="time" name="desired_time" required></label><label class="full">Motivo resumido<textarea name="reason" minlength="5" maxlength="500" required></textarea></label><label class="full">Endereço, se presencial<input name="address" maxlength="500"></label><label class="full">Observações<textarea name="notes" maxlength="1500"></textarea></label><label class="check full"><input type="checkbox" name="contact_consent" required> Autorizo contato para confirmação deste atendimento</label><button class="mg-button primary" type="submit">Solicitar visita</button><p data-form-status role="status"></p></form></div>
    <div class="service-panel" data-panel="testimony"><div class="public-form-intro"><h3>Testemunhos</h3><p>Compartilhe o que Deus fez. A publicação depende de autorização e moderação.</p></div><div id="publishedTestimonies" class="testimony-grid"></div><form id="testimonyForm" class="management-form"><input class="hp" name="website" tabindex="-1" autocomplete="off"><label>Nome<input name="name" maxlength="120" required></label><label>Título<input name="title" maxlength="160" required></label><label>Data do acontecimento<input type="date" name="event_date"></label><label>Contato (opcional)<input name="contact" maxlength="160"></label><label class="full">Testemunho<textarea name="testimony_text" minlength="20" maxlength="5000" required></textarea></label><label class="check full"><input type="checkbox" name="publication_consent"> Autorizo a publicação após moderação</label><label class="check full"><input type="checkbox" name="show_name"> Autorizo mostrar meu nome</label><button class="mg-button primary" type="submit">Enviar testemunho</button><p data-form-status role="status"></p></form></div>
    <div class="service-panel info-panel" data-panel="giving"><h3>Dízimos e Ofertas</h3><div id="givingPublic"><p>Cadastre os dados oficiais para contribuição.</p></div></div>
    <div class="service-panel info-panel" data-panel="construction"><h3>Construção do Nosso Prédio</h3><div id="constructionPublic"><p>As informações oficiais do projeto serão publicadas aqui.</p></div></div>
    <div class="service-panel info-panel" data-panel="location"><h3>Onde Estamos</h3><div id="locationPublic"><p>O endereço oficial ainda não foi publicado.</p></div></div>`;
  const leadership = document.getElementById("lideranca");
  leadership?.after(services);
  const nav = document.querySelector(".nav");
  const leadershipLink = nav?.querySelector('a[href="#lideranca"]');
  if (nav && leadershipLink) {
    const link = document.createElement("a");
    link.href = "#servicos";
    link.textContent = "Serviços";
    nav.insertBefore(link, leadershipLink);
  }
  services.querySelectorAll("[data-service]").forEach((tab) =>
    tab.addEventListener("click", () => {
      services
        .querySelectorAll("[data-service]")
        .forEach((x) => x.classList.toggle("active", x === tab));
      services
        .querySelectorAll("[data-panel]")
        .forEach((x) =>
          x.classList.toggle("active", x.dataset.panel === tab.dataset.service),
        );
    }),
  );
  document
    .getElementById("prayerRequestForm")
    .addEventListener("submit", (event) => {
      event.preventDefault();
      submitPublic(event.currentTarget, "prayer");
    });
  document
    .getElementById("pastoralVisitForm")
    .addEventListener("submit", (event) => {
      event.preventDefault();
      submitPublic(event.currentTarget, "visit");
    });
  document
    .getElementById("testimonyForm")
    .addEventListener("submit", (event) => {
      event.preventDefault();
      submitPublic(event.currentTarget, "testimony");
    });

  function infoRows(container, rows) {
    container.replaceChildren(
      ...rows
        .filter((row) => row[1])
        .map(([label, value]) => {
          const p = document.createElement("p");
          const strong = document.createElement("strong");
          strong.textContent = `${label}: `;
          p.append(strong, document.createTextNode(value));
          return p;
        }),
    );
  }
  async function loadPublicContent() {
    const [testimonies, giving, construction, address, homeSections, schedule] = await Promise.all([
      db
        .from("testimonies")
        .select("title,testimony_text,show_name,name,published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(6),
      db
        .from("giving_information")
        .select("*")
        .eq("published", true)
        .limit(1)
        .maybeSingle(),
      db
        .from("construction_projects")
        .select("*")
        .eq("published", true)
        .limit(1)
        .maybeSingle(),
      db
        .from("church_addresses")
        .select("*")
        .eq("published", true)
        .limit(1)
        .maybeSingle(),
      db.from("homepage_sections").select("*").eq("published", true).eq("archived", false).order("display_order"),
      db.from("church_schedule").select("*").eq("published", true).eq("archived", false).gte("starts_at", new Date().toISOString()).order("starts_at").limit(12),
    ]);
    const testimonyBox = document.getElementById("publishedTestimonies");
    testimonyBox.replaceChildren();
    (testimonies.data || []).forEach((item) => {
      const article = document.createElement("article");
      const title = document.createElement("h4");
      title.textContent = item.title;
      const body = document.createElement("p");
      body.textContent = item.testimony_text;
      const meta = document.createElement("small");
      meta.textContent = `${item.show_name ? item.name : "Anônimo"} • ${item.published_at ? fmtDate(item.published_at) : ""}`;
      article.append(title, body, meta);
      testimonyBox.append(article);
    });
    if (!testimonyBox.children.length)
      testimonyBox.innerHTML =
        '<p class="pending-content">Nenhum testemunho publicado até o momento.</p>';
    if (giving.data) {
      const box = document.getElementById("givingPublic");
      box.replaceChildren();
      const title = document.createElement("h4");
      title.textContent = giving.data.title;
      const explanation = document.createElement("p");
      explanation.textContent = giving.data.explanation || "";
      box.append(title, explanation);
      infoRows(box, [
        ["Chave PIX", giving.data.pix_key],
        ["Favorecido", giving.data.beneficiary],
        ["Banco", giving.data.bank_name],
        ["Instruções", giving.data.instructions],
      ]);
    }
    if (construction.data) {
      const box = document.getElementById("constructionPublic");
      box.replaceChildren();
      for (const [tag, value] of [
        ["h4", construction.data.title],
        ["p", construction.data.introduction],
        ["p", construction.data.description],
        ["p", construction.data.objective],
        ["p", construction.data.progress_text],
      ])
        if (value) {
          const el = document.createElement(tag);
          el.textContent = value;
          box.append(el);
        }
    }
    if (address.data) {
      const a = address.data;
      const full = [
        a.street,
        a.street_number,
        a.district,
        a.city,
        a.state,
        a.postal_code,
        a.complement,
      ]
        .filter(Boolean)
        .join(", ");
      const url =
        a.google_maps_url ||
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(full)}`;
      const box = document.getElementById("locationPublic");
      box.replaceChildren();
      const name = document.createElement("h4");
      name.textContent = a.church_name;
      const location = document.createElement("p");
      location.textContent = full;
      const open = document.createElement("a");
      open.className = "mg-button primary";
      open.textContent = "Abrir no mapa";
      open.href = url;
      open.target = "_blank";
      open.rel = "noopener noreferrer";
      const route = open.cloneNode(true);
      route.textContent = "Traçar rota";
      route.href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(full)}`;
      box.append(name, location, open, route);
    }
    const sections = homeSections.data || [];
    const welcome = sections.find((item) => item.section_key === "welcome");
    const vision = sections.find((item) => item.section_key === "vision");
    if (welcome) {
      const title = document.getElementById("welcomeTitle");
      if (title) title.textContent = welcome.title;
      const body = document.querySelector(".home-welcome > p");
      if (body) body.textContent = welcome.body;
      if (typeof homeForm !== "undefined") { homeForm.elements.welcome_title.value = welcome.title || ""; homeForm.elements.welcome_body.value = welcome.body || ""; }
    }
    if (vision) {
      const body = document.querySelector(".home-vision .home-section-heading p");
      if (body) body.textContent = vision.body;
      if (typeof homeForm !== "undefined") homeForm.elements.vision_body.value = vision.body || "";
    }
    for (const item of sections.filter((row) => row.section_key.startsWith("highlight-"))) {
      if (managedHighlightKeys.has(item.section_key) || typeof homeHighlights === "undefined") continue;
      let details = { description: item.body || "" };
      try { details = JSON.parse(item.body); } catch {}
      const image = db.storage.from("church-public").getPublicUrl(item.media_path).data.publicUrl;
      homeHighlights.push({ title: item.title, description: details.description || "", image, alt: item.title, date: details.date || "", time: details.time || "", address: details.address || "", link: item.link_url || "" });
      managedHighlightKeys.add(item.section_key);
    }
    if (managedHighlightKeys.size && typeof renderHighlights === "function") renderHighlights();
    let managedEvents = document.getElementById("managedEvents");
    if (!managedEvents) { managedEvents = document.createElement("div"); managedEvents.id = "managedEvents"; managedEvents.className = "managed-events"; document.getElementById("agenda")?.append(managedEvents); }
    managedEvents.replaceChildren();
    (schedule.data || []).forEach((item) => managedEvents.append(listCard(item.title, [new Date(item.starts_at).toLocaleString("pt-BR"), item.description || "", item.location_text || ""].filter(Boolean))));
  }
  loadPublicContent();

  const admin = document.getElementById("admin");
  admin.classList.add("management-admin");
  admin.querySelector(".section-heading h2").textContent = "Administração";
  admin.querySelector(".section-heading .eyebrow").textContent =
    "Sistema de gestão";
  const dashboard = document.createElement("div");
  dashboard.className = "management-dashboard";
  dashboard.innerHTML = `
    <aside class="management-sidebar" aria-label="Áreas administrativas"><strong>Gestão Videira</strong><button class="active" data-admin-tab="overview">Visão geral</button><button data-admin-tab="reports">Relatórios</button><button data-admin-tab="pastoral">Cuidado pastoral</button><button data-admin-tab="content">Conteúdo público</button><button data-admin-tab="people">Usuários e células</button><button data-admin-tab="audit">Auditoria</button></aside>
    <div class="management-workspace">
      <section class="admin-panel active" data-admin-panel="overview"><div class="admin-welcome"><h3>Visão geral</h3><p id="adminIdentity">Entre para acessar seus recursos.</p></div><div id="dashboardCards" class="dashboard-cards"></div><div id="notificationsList" class="management-list"></div></section>
      <section class="admin-panel" data-admin-panel="reports"><h3>Relatório da Célula</h3><form id="cellReportForm" class="management-form"><label>Célula<select name="cell_id" id="reportCell" required></select></label><label>Data da reunião<input type="date" name="meeting_date" required></label><label>Membros<input type="number" name="members_count" min="0" value="0" required></label><label>Frequentadores assíduos<input type="number" name="regular_attendees_count" min="0" value="0" required></label><label>Visitantes<input type="number" name="visitors_count" min="0" value="0" required></label><label>Total de presentes<output id="attendanceTotal">0</output></label><label>Oferta por PIX<input type="number" name="offering_pix" min="0" step="0.01" value="0" required></label><label>Oferta em dinheiro<input type="number" name="offering_cash" min="0" step="0.01" value="0" required></label><label>Total de ofertas<output id="offeringTotal">R$ 0,00</output></label><label>Apelos de salvação<input type="number" name="salvation_appeals_count" min="0" value="0" required></label><label class="full">Observações<textarea name="observations" maxlength="2000"></textarea></label><div class="full form-actions"><button class="mg-button" type="submit" value="draft">Salvar rascunho</button><button class="mg-button primary" type="submit" value="submitted">Enviar relatório</button></div><p class="full" data-form-status role="status"></p></form><div class="chart-toolbar"><label>Mês<input id="reportMonth" type="month"></label><button id="refreshReports" class="mg-button" type="button">Atualizar gráfico</button></div><div id="reportChart" class="report-chart"></div><div id="reportsList" class="management-list"></div></section>
      <section class="admin-panel" data-admin-panel="pastoral"><h3>Cuidado pastoral</h3><div class="moderation-columns"><div><h4>Pedidos de oração</h4><div id="adminPrayers" class="management-list"></div></div><div><h4>Visitas pastorais</h4><div id="adminVisits" class="management-list"></div></div><div><h4>Testemunhos</h4><div id="adminTestimonies" class="management-list"></div></div></div></section>
      <section class="admin-panel" data-admin-panel="content"><h3>Conteúdo público</h3><div class="admin-form-grid"><form id="givingForm" class="management-form card-form"><h4>Dízimos e Ofertas</h4><label>Título<input name="title" value="Dízimos e Ofertas" required></label><label class="full">Explicação<textarea name="explanation"></textarea></label><label>Chave PIX<input name="pix_key"></label><label>Favorecido<input name="beneficiary"></label><label>Banco<input name="bank_name"></label><label class="full">Instruções<textarea name="instructions"></textarea></label><label class="check full"><input type="checkbox" name="published"> Publicar</label><button class="mg-button primary" type="submit">Salvar</button><p data-form-status></p></form><form id="addressForm" class="management-form card-form"><h4>Onde Estamos</h4><label>Nome<input name="church_name" value="Igreja Videira" required></label><label>Rua<input name="street"></label><label>Número<input name="street_number"></label><label>Bairro<input name="district"></label><label>Cidade<input name="city"></label><label>Estado<input name="state"></label><label>CEP<input name="postal_code"></label><label>Complemento<input name="complement"></label><label class="full">Link oficial Google Maps<input type="url" name="google_maps_url"></label><label class="check full"><input type="checkbox" name="published"> Publicar</label><button class="mg-button primary" type="submit">Salvar</button><p data-form-status></p></form><form id="constructionForm" class="management-form card-form"><h4>Construção do Nosso Prédio</h4><label>Título<input name="title" value="Construção do Nosso Prédio" required></label><label class="full">Apresentação<textarea name="introduction"></textarea></label><label class="full">Descrição<textarea name="description"></textarea></label><label class="full">Objetivo<textarea name="objective"></textarea></label><label class="full">Andamento real<textarea name="progress_text"></textarea></label><label>Atualização<input type="date" name="latest_update"></label><label class="check"><input type="checkbox" name="published"> Publicar</label><button class="mg-button primary" type="submit">Salvar</button><p data-form-status></p></form><form id="eventAdminForm" class="management-form card-form"><h4>Agenda e eventos</h4><label>Título<input name="title" required></label><label>Início<input type="datetime-local" name="starts_at" required></label><label>Fim<input type="datetime-local" name="ends_at"></label><label>Local<input name="location_text"></label><label class="full">Descrição<textarea name="description"></textarea></label><label class="check"><input type="checkbox" name="published"> Publicar</label><button class="mg-button primary" type="submit">Adicionar evento</button><p data-form-status></p></form></div></section>
      <section class="admin-panel" data-admin-panel="people"><h3>Usuários, líderes e células</h3><div class="admin-form-grid"><form id="cellAdminForm" class="management-form card-form"><h4>Cadastrar célula</h4><label>Nome<input name="name" required></label><label>Discipulador<input name="discipulator_name"></label><label>Dia<input name="meeting_day"></label><label>Horário<input type="time" name="meeting_time"></label><label>Endereço público<input name="public_address"></label><label class="check"><input type="checkbox" name="published"> Publicar</label><button class="mg-button primary" type="submit">Salvar célula</button><p data-form-status></p></form><form id="leaderAdminForm" class="management-form card-form"><h4>Líder público</h4><label>Nome<input name="name" required></label><label>Identificador<input name="slug" pattern="[a-z0-9-]+" required></label><label>Discipulado<input name="discipleship" required></label><label>WhatsApp (55 + DDD + número)<input name="whatsapp" pattern="55[0-9]{10,11}"></label><label>Dia<input name="meeting_day"></label><label>Horário<input name="meeting_time"></label><label class="check"><input type="checkbox" name="published" checked> Publicar</label><button class="mg-button primary" type="submit">Salvar líder</button><p data-form-status></p></form><form id="roleForm" class="management-form card-form superadmin-only"><h4>Permissões</h4><label>Usuário<select name="user_id" id="roleUser"></select></label><label>Perfil<select name="role"><option value="member">Membro</option><option value="leader">Líder</option><option value="pastor">Pastor</option><option value="admin">Administrador</option><option value="superadmin">Superadmin</option></select></label><button class="mg-button primary" type="submit">Atribuir perfil</button><p data-form-status></p></form></div><div id="peopleList" class="management-list"></div></section>
      <section class="admin-panel" data-admin-panel="audit"><h3>Histórico administrativo</h3><div id="auditList" class="management-list"></div></section>
    </div>`;
  admin.prepend(dashboard);
  const contentGrid = dashboard.querySelector('[data-admin-panel="content"] .admin-form-grid');
  const homeForm = document.createElement("form");
  homeForm.id = "homeContentForm";
  homeForm.className = "management-form card-form";
  homeForm.innerHTML = '<h4>Página inicial</h4><label>Título de boas-vindas<input name="welcome_title" value="Bem-vindo à Igreja Videira" required></label><label class="full">Apresentação<textarea name="welcome_body" required></textarea></label><label class="full">Nossa visão<textarea name="vision_body" required></textarea></label><button class="mg-button primary" type="submit">Salvar textos</button><p data-form-status></p>';
  homeForm.elements.welcome_body.value = document.querySelector(".home-welcome > p")?.textContent?.trim() || "";
  homeForm.elements.vision_body.value = document.querySelector(".home-vision .home-section-heading p")?.textContent?.trim() || "";
  const highlightForm = document.createElement("form");
  highlightForm.id = "highlightAdminForm";
  highlightForm.className = "management-form card-form";
  highlightForm.innerHTML = '<h4>Novo destaque</h4><label>Título<input name="title" required maxlength="160"></label><label class="full">Descrição<textarea name="body" required maxlength="600"></textarea></label><label class="full">Imagem<input type="file" name="image" accept="image/jpeg,image/png,image/webp" required></label><label>Data (opcional)<input name="date_text"></label><label>Horário (opcional)<input name="time_text"></label><label>Endereço (opcional)<input name="address_text"></label><label>Link (opcional)<input type="url" name="link_url"></label><label class="check"><input type="checkbox" name="published"> Publicar</label><button class="mg-button primary" type="submit">Salvar destaque</button><p data-form-status></p>';
  contentGrid?.prepend(highlightForm);
  contentGrid?.prepend(homeForm);
  admin.querySelector(".admin-grid").classList.add("legacy-admin-grid");
  dashboard.querySelectorAll("[data-admin-tab]").forEach((tab) =>
    tab.addEventListener("click", () => {
      dashboard
        .querySelectorAll("[data-admin-tab]")
        .forEach((x) => x.classList.toggle("active", x === tab));
      dashboard
        .querySelectorAll("[data-admin-panel]")
        .forEach((x) =>
          x.classList.toggle(
            "active",
            x.dataset.adminPanel === tab.dataset.adminTab,
          ),
        );
    }),
  );

  function formPayload(form) {
    const data = Object.fromEntries(new FormData(form));
    for (const checkbox of form.querySelectorAll('input[type="checkbox"]'))
      data[checkbox.name] = checkbox.checked;
    for (const key of Object.keys(data)) if (data[key] === "") data[key] = null;
    return data;
  }
  async function saveForm(form, table, options = {}) {
    const status = form.querySelector("[data-form-status]");
    if (!window.churchAuth?.canManageContent())
      return message(status, "Acesso de administrador necessário.", "error");
    const payload = { ...formPayload(form), ...(options.extra || {}) };
    const query = options.singleton
      ? db.from(table).upsert(payload, { onConflict: options.conflict || "id" })
      : db.from(table).insert(payload);
    const { error } = await query;
    if (error)
      return message(
        status,
        "Não foi possível salvar. Confira a configuração e tente novamente.",
        "error",
      );
    message(status, "Salvo com sucesso.", "success");
    if (options.reset) form.reset();
    loadPublicContent();
    loadDashboard();
  }
  document.getElementById("givingForm").addEventListener("submit", (event) => {
    event.preventDefault();
    saveSingleton(event.currentTarget, "giving_information");
  });
  document.getElementById("addressForm").addEventListener("submit", (event) => {
    event.preventDefault();
    saveSingleton(event.currentTarget, "church_addresses");
  });
  document
    .getElementById("constructionForm")
    .addEventListener("submit", (event) => {
      event.preventDefault();
      saveSingleton(event.currentTarget, "construction_projects");
    });
  async function saveSingleton(form, table) {
    const existing = await db.from(table).select("id").limit(1).maybeSingle();
    saveForm(form, table, {
      singleton: true,
      conflict: "id",
      extra: existing.data?.id ? { id: existing.data.id } : {},
    });
  }
  document
    .getElementById("eventAdminForm")
    .addEventListener("submit", (event) => {
      event.preventDefault();
      saveForm(event.currentTarget, "church_schedule", { reset: true });
    });
  document
    .getElementById("cellAdminForm")
    .addEventListener("submit", (event) => {
      event.preventDefault();
      saveForm(event.currentTarget, "cells", { reset: true });
    });
  document
    .getElementById("leaderAdminForm")
    .addEventListener("submit", (event) => {
      event.preventDefault();
      saveForm(event.currentTarget, "public_leaders", { reset: true });
    });
  homeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = homeForm.querySelector("[data-form-status]");
    if (!window.churchAuth?.canManageContent()) return message(status, "Acesso de administrador necessário.", "error");
    const data = formPayload(homeForm);
    const rows = [
      { section_key: "welcome", title: data.welcome_title, body: data.welcome_body, display_order: 1, published: true, updated_by: window.churchAuth.session.user.id },
      { section_key: "vision", title: "Nossa Visão", body: data.vision_body, display_order: 2, published: true, updated_by: window.churchAuth.session.user.id },
    ];
    const { error } = await db.from("homepage_sections").upsert(rows, { onConflict: "section_key" });
    message(status, error ? "Não foi possível salvar os textos." : "Página inicial atualizada.", error ? "error" : "success");
    if (!error) loadPublicContent();
  });
  highlightForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = highlightForm.querySelector("[data-form-status]");
    if (!window.churchAuth?.canManageContent()) return message(status, "Acesso de administrador necessário.", "error");
    const file = highlightForm.elements.image.files[0];
    if (!file || file.size > 15 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) return message(status, "Envie JPEG, PNG ou WebP de até 15 MB.", "error");
    const safeName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `highlights/${Date.now()}-${safeName}`;
    const upload = await db.storage.from("church-public").upload(path, file, { contentType: file.type });
    if (upload.error) return message(status, "Não foi possível enviar a imagem.", "error");
    const data = formPayload(highlightForm);
    const slug = `highlight-${Date.now()}`;
    const body = JSON.stringify({ description: data.body, date: data.date_text, time: data.time_text, address: data.address_text });
    const { error } = await db.from("homepage_sections").insert({ section_key: slug, title: data.title, body, media_path: path, link_url: data.link_url, display_order: 20, published: data.published, updated_by: window.churchAuth.session.user.id });
    if (error) { await db.storage.from("church-public").remove([path]); return message(status, "Não foi possível salvar o destaque.", "error"); }
    highlightForm.reset(); message(status, "Destaque salvo.", "success"); loadPublicContent();
  });
  document
    .getElementById("roleForm")
    .addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget,
        status = form.querySelector("[data-form-status]");
      const payload = formPayload(form);
      payload.assigned_by = window.churchAuth?.session?.user?.id;
      const { error } = await db
        .from("user_roles")
        .upsert(payload, { onConflict: "user_id,role" });
      message(
        status,
        error ? "Não foi possível atribuir o perfil." : "Perfil atribuído.",
        error ? "error" : "success",
      );
      loadDashboard();
    });

  const reportForm = document.getElementById("cellReportForm");
  reportForm.addEventListener("input", () => {
    const value = (name) => Number(reportForm.elements[name].value) || 0;
    document.getElementById("attendanceTotal").textContent =
      value("members_count") +
      value("regular_attendees_count") +
      value("visitors_count");
    document.getElementById("offeringTotal").textContent = (
      value("offering_pix") + value("offering_cash")
    ).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  });
  reportForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = reportForm.querySelector("[data-form-status]"),
      auth = window.churchAuth;
    if (!auth?.session)
      return message(status, "Entre para enviar o relatório.", "error");
    const payload = formPayload(reportForm);
    payload.leader_id = auth.session.user.id;
    payload.created_by = auth.session.user.id;
    payload.status = event.submitter.value;
    [
      "members_count",
      "regular_attendees_count",
      "visitors_count",
      "salvation_appeals_count",
    ].forEach((key) => (payload[key] = Number(payload[key])));
    ["offering_pix", "offering_cash"].forEach(
      (key) => (payload[key] = Number(payload[key])),
    );
    const { error } = await db.from("cell_reports").insert(payload);
    if (error)
      return message(
        status,
        "Não foi possível salvar. Verifique a célula, a data e suas permissões.",
        "error",
      );
    message(
      status,
      payload.status === "submitted" ? "Relatório enviado." : "Rascunho salvo.",
      "success",
    );
    reportForm.reset();
    reportForm.dispatchEvent(new Event("input"));
    loadReports();
  });
  document
    .getElementById("refreshReports")
    .addEventListener("click", loadReports);

  function listCard(title, lines, actions = []) {
    const article = document.createElement("article");
    const h = document.createElement("h5");
    h.textContent = title;
    article.append(h);
    lines.forEach((line) => {
      const p = document.createElement("p");
      p.textContent = line;
      article.append(p);
    });
    if (actions.length) {
      const wrap = document.createElement("div");
      wrap.className = "list-actions";
      actions.forEach((action) =>
        wrap.append(button(action.label, action.run, action.kind)),
      );
      article.append(wrap);
    }
    return article;
  }
  async function updateStatus(table, id, status) {
    if (!confirm(`Confirmar alteração para “${status}”?`)) return;
    await db.from(table).update({ status }).eq("id", id);
    loadDashboard();
  }
  async function loadReports() {
    const auth = window.churchAuth;
    if (!auth?.privateAccess) return;
    const month =
      document.getElementById("reportMonth").value ||
      new Date().toISOString().slice(0, 7);
    document.getElementById("reportMonth").value = month;
    const start = `${month}-01`,
      end = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)
        .toISOString()
        .slice(0, 10);
    const { data } = await db
      .from("cell_reports")
      .select(
        "id,meeting_date,members_count,regular_attendees_count,visitors_count,total_attendance,total_offering,salvation_appeals_count,status,cells(name)",
      )
      .gte("meeting_date", start)
      .lte("meeting_date", end)
      .order("meeting_date");
    const list = document.getElementById("reportsList"),
      chart = document.getElementById("reportChart");
    list.replaceChildren();
    chart.replaceChildren();
    const max = Math.max(1, ...(data || []).map((x) => x.total_attendance));
    (data || []).forEach((item) => {
      const bar = document.createElement("div");
      bar.className = "report-bar";
      bar.innerHTML = `<span>${escape(fmtDate(item.meeting_date))}</span><i style="--bar:${Math.round((item.total_attendance / max) * 100)}%"></i><strong>${item.total_attendance}</strong>`;
      chart.append(bar);
      list.append(
        listCard(
          `${item.cells?.name || "Célula"} • ${fmtDate(item.meeting_date)}`,
          [
            `Presença: ${item.total_attendance} • Visitantes: ${item.visitors_count} • Apelos: ${item.salvation_appeals_count}`,
            `Status: ${item.status}`,
          ],
          auth.hasRole("superadmin", "admin", "pastor") &&
            item.status === "submitted"
            ? [
                {
                  label: "Marcar revisado",
                  run: () => updateStatus("cell_reports", item.id, "reviewed"),
                },
                {
                  label: "Devolver",
                  run: () => updateStatus("cell_reports", item.id, "returned"),
                },
              ]
            : [],
        ),
      );
    });
    if (!data?.length)
      list.append(
        listCard("Nenhum relatório", ["Não há relatórios neste período."]),
      );
  }

  async function loadDashboard() {
    const auth = window.churchAuth;
    if (!auth?.privateAccess) return;
    document.getElementById("adminIdentity").textContent =
      `${auth.profile?.full_name || auth.profile?.email || "Usuário"} • ${auth.roles.join(", ")}`;
    document.body.classList.toggle("is-superadmin", auth.hasRole("superadmin"));
    const staff = auth.hasRole("superadmin", "admin", "pastor");
    const queries = staff
      ? [
          db
            .from("prayer_requests")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(30),
          db
            .from("pastoral_visits")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(30),
          db
            .from("testimonies")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(30),
        ]
      : [
          Promise.resolve({ data: [] }),
          Promise.resolve({ data: [] }),
          Promise.resolve({ data: [] }),
        ];
    const [prayers, visits, testimonies] = await Promise.all(queries);
    const cards = document.getElementById("dashboardCards");
    cards.replaceChildren();
    [
      [
        "Pedidos pendentes",
        (prayers.data || []).filter((x) => x.status === "received").length,
      ],
      [
        "Visitas solicitadas",
        (visits.data || []).filter((x) => x.status === "requested").length,
      ],
      [
        "Testemunhos em moderação",
        (testimonies.data || []).filter((x) => x.status === "pending").length,
      ],
      ["Seus perfis", auth.roles.length],
    ].forEach(([label, value]) =>
      cards.append(listCard(label, [String(value)])),
    );
    const prayersBox = document.getElementById("adminPrayers");
    prayersBox.replaceChildren();
    (prayers.data || []).forEach((item) =>
      prayersBox.append(
        listCard(
          item.anonymous ? "Anônimo" : item.name,
          [
            item.request_text,
            `Status: ${item.status} • ${fmtDate(item.created_at)}`,
          ],
          [
            {
              label: "Em oração",
              run: () => updateStatus("prayer_requests", item.id, "praying"),
            },
            {
              label: "Respondido",
              run: () => updateStatus("prayer_requests", item.id, "answered"),
            },
            {
              label: "Arquivar",
              run: () => updateStatus("prayer_requests", item.id, "archived"),
            },
          ],
        ),
      ),
    );
    const visitsBox = document.getElementById("adminVisits");
    visitsBox.replaceChildren();
    (visits.data || []).forEach((item) =>
      visitsBox.append(
        listCard(
          `${item.name} • ${fmtDate(item.desired_date)} ${String(item.desired_time).slice(0, 5)}`,
          [
            item.reason_summary,
            `Tipo: ${item.visit_type} • Status: ${item.status}`,
          ],
          [
            {
              label: "Confirmar",
              run: () => updateStatus("pastoral_visits", item.id, "confirmed"),
            },
            {
              label: "Reagendar",
              run: () =>
                updateStatus(
                  "pastoral_visits",
                  item.id,
                  "reschedule_requested",
                ),
            },
            {
              label: "Concluir",
              run: () => updateStatus("pastoral_visits", item.id, "completed"),
            },
            {
              label: "Recusar",
              run: () => updateStatus("pastoral_visits", item.id, "declined"),
            },
          ],
        ),
      ),
    );
    const testimonyBox = document.getElementById("adminTestimonies");
    testimonyBox.replaceChildren();
    (testimonies.data || []).forEach((item) =>
      testimonyBox.append(
        listCard(
          item.title,
          [
            item.testimony_text,
            `${item.show_name ? item.name : "Nome oculto"} • ${item.status}`,
          ],
          [
            {
              label: "Aprovar",
              run: () => updateStatus("testimonies", item.id, "approved"),
            },
            {
              label: "Publicar",
              run: async () => {
                if (!item.publication_authorized)
                  return alert("A pessoa não autorizou a publicação.");
                await db
                  .from("testimonies")
                  .update({
                    status: "published",
                    published_at: new Date().toISOString(),
                  })
                  .eq("id", item.id);
                loadDashboard();
                loadPublicContent();
              },
            },
            {
              label: "Arquivar",
              run: () => updateStatus("testimonies", item.id, "archived"),
            },
          ],
        ),
      ),
    );
    const { data: links } = await db
      .from("leader_cells")
      .select("cell_id,cells(id,name)")
      .eq("leader_id", auth.session.user.id);
    const select = document.getElementById("reportCell");
    select.replaceChildren();
    (links || []).forEach((link) => {
      const option = document.createElement("option");
      option.value = link.cells.id;
      option.textContent = link.cells.name;
      select.append(option);
    });
    if (staff && !select.children.length) {
      const { data: allCells } = await db
        .from("cells")
        .select("id,name")
        .eq("active", true);
      (allCells || []).forEach((cell) => {
        const option = document.createElement("option");
        option.value = cell.id;
        option.textContent = cell.name;
        select.append(option);
      });
    }
    if (auth.hasRole("superadmin")) {
      const [{ data: profiles }, { data: audit }] = await Promise.all([
        db
          .from("profiles")
          .select("id,full_name,email,is_active")
          .order("full_name"),
        db
          .from("audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
      ]);
      const roleUser = document.getElementById("roleUser");
      roleUser.replaceChildren();
      (profiles || []).forEach((person) => {
        const option = document.createElement("option");
        option.value = person.id;
        option.textContent = person.full_name || person.email;
        roleUser.append(option);
      });
      const auditBox = document.getElementById("auditList");
      auditBox.replaceChildren();
      (audit || []).forEach((item) =>
        auditBox.append(
          listCard(`${item.action} • ${item.entity_type}`, [
            item.summary || "Alteração administrativa",
            new Date(item.created_at).toLocaleString("pt-BR"),
          ]),
        ),
      );
    }
    const { data: notes } = await db
      .from("notifications")
      .select("*")
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(10);
    const noteBox = document.getElementById("notificationsList");
    noteBox.replaceChildren();
    (notes || []).forEach((note) =>
      noteBox.append(listCard(note.title, [note.message])),
    );
    loadReports();
  }
  window.addEventListener("church-auth-changed", () => loadDashboard());
  window.addEventListener("load", () => loadPublicContent(), { once: true });
  if (window.churchAuth) loadDashboard();

  document
    .querySelectorAll('a[href="#palavra"]')
    .forEach((link) => (link.textContent = "Suprimento"));
  document
    .querySelectorAll("#palavra .eyebrow,.cloud-word-archive .eyebrow")
    .forEach((node) => (node.textContent = "Suprimento da Célula"));
  const privacy = document.createElement("section");
  privacy.id = "privacidade";
  privacy.className = "privacy-note";
  privacy.innerHTML =
    '<h2>Privacidade e proteção de dados</h2><p>Usamos apenas os dados necessários para cuidar de pessoas e administrar a igreja. Pedidos de oração, visitas, contatos e relatórios são protegidos por níveis de acesso e não são publicados automaticamente.</p><a href="POLITICA-DE-PRIVACIDADE.md" target="_blank" rel="noopener noreferrer">Ler política de privacidade</a>';
  document.querySelector("footer")?.before(privacy);
})();
