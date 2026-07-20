(function () {
  "use strict";
  const db = window.videiraSupabase;
  if (!db) return;
  const state = { auth: null };
  const canManage = () => state.auth?.hasRole("superadmin", "admin");
  const el = (tag, value, className = "") => {
    const node = document.createElement(tag);
    node.textContent = value ?? "";
    if (className) node.className = className;
    return node;
  };
  const notice = (form, value, type = "") => {
    const node = form.querySelector("[data-form-status]");
    if (node) {
      node.textContent = value;
      node.className = `management-message ${type}`;
    }
  };
  const addHidden = (form) => {
    if (!form?.elements.id) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = "id";
      form.prepend(input);
    }
  };
  const appendFields = (form, html) => {
    const action = form?.querySelector('button[type="submit"]');
    if (action) action.insertAdjacentHTML("beforebegin", html);
  };
  const forms = {
    giving: document.getElementById("givingForm"),
    address: document.getElementById("addressForm"),
    construction: document.getElementById("constructionForm"),
    event: document.getElementById("eventAdminForm"),
    cell: document.getElementById("cellAdminForm"),
    leader: document.getElementById("leaderAdminForm"),
  };
  Object.values(forms).forEach(addHidden);
  appendFields(
    forms.giving,
    '<label>Tipo da chave PIX<select name="pix_key_type"><option value="">Selecione</option><option>CPF</option><option>CNPJ</option><option>E-mail</option><option>Telefone</option><option>Chave aleatória</option></select></label><label>QR Code (caminho do arquivo)<input name="qr_code_path"></label>',
  );
  appendFields(
    forms.address,
    '<label>Latitude<input type="number" step="0.0000001" name="latitude"></label><label>Longitude<input type="number" step="0.0000001" name="longitude"></label><label>Telefone<input name="phone"></label><label>Horários de atendimento<input name="office_hours"></label>',
  );
  appendFields(
    forms.construction,
    '<label>Imagem/projeto<input name="project_media_path"></label><label>PDF<input name="project_pdf_path"></label><label>Vídeo<input type="url" name="video_url"></label><label>Contato<input type="url" name="contact_url"></label><label class="full">Dados de contribuição<textarea name="giving_text"></textarea></label>',
  );
  appendFields(
    forms.event,
    '<label>Imagem<input name="image_path"></label><label>Link<input type="url" name="link_url"></label><label class="check"><input type="checkbox" name="featured"> Destaque</label><label>Situação<select name="status"><option value="scheduled">Agendado</option><option value="cancelled">Cancelado</option><option value="completed">Concluído</option><option value="archived">Arquivado</option></select></label>',
  );
  appendFields(
    forms.cell,
    '<label>Auxiliar<select name="assistant_id" id="cellAssistant"><option value="">Nenhum</option></select></label><label>Bairro<input name="district"></label><label>Mapa<input type="url" name="map_url"></label><label>Telefone<input name="phone"></label><label>Situação<select name="status"><option value="active">Ativa</option><option value="inactive">Inativa</option><option value="archived">Arquivada</option></select></label><label class="full">Observações<textarea name="observations"></textarea></label>',
  );
  appendFields(
    forms.leader,
    '<label>Usuário vinculado<select name="profile_id" id="publicLeaderProfile"><option value="">Nenhum</option></select></label><label>Foto<input name="photo_path"></label><label class="check"><input type="checkbox" name="is_primary" checked> Responsável principal</label><label class="check"><input type="checkbox" name="is_assistant"> Auxiliar</label><label class="check"><input type="checkbox" name="active" checked> Ativo</label>',
  );

  function fill(form, row) {
    form.reset();
    for (const [field, value] of Object.entries(row)) {
      const input = form.elements[field];
      if (!input) continue;
      if (input.type === "checkbox") input.checked = !!value;
      else input.value = value ?? "";
    }
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function action(label, run) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mg-button";
    button.textContent = label;
    button.addEventListener("click", run);
    return button;
  }
  function list(container, rows, config) {
    container.replaceChildren();
    if (!rows.length) {
      container.append(el("p", "Nenhum cadastro encontrado."));
      return;
    }
    rows.forEach((row) => {
      const card = document.createElement("article");
      card.append(el("h5", config.title(row)));
      for (const line of config.lines(row)) {
        if (line) card.append(el("p", line));
      }
      const actions = document.createElement("div");
      actions.className = "list-actions";
      actions.append(action("Editar", () => fill(config.form, row)));
      if (config.archive)
        actions.append(
          action("Arquivar", () =>
            archive(config.table, row.id, config.archive),
          ),
        );
      card.append(actions);
      container.append(card);
    });
  }
  async function archive(table, id, payload) {
    if (!confirm("Arquivar este cadastro?")) return;
    await db.from(table).update(payload).eq("id", id);
    loadCatalogs();
  }
  function catalogBox(form, id) {
    let box = document.getElementById(id);
    if (!box) {
      box = document.createElement("div");
      box.id = id;
      box.className = "management-list admin-catalog";
      form.after(box);
    }
    return box;
  }
  async function loadCatalogs() {
    if (!canManage() || !state.auth?.configured) return;
    const [
      events,
      cells,
      leaders,
      groups,
      pages,
      profiles,
      links,
      availability,
      weekly,
    ] = await Promise.all([
      db
        .from("church_schedule")
        .select("*")
        .order("starts_at", { ascending: false }),
      db.from("cells").select("*").order("name"),
      db.from("public_leaders").select("*").order("display_order"),
      db.from("church_groups").select("*").order("display_order"),
      db
        .from("content_pages")
        .select("*")
        .order("created_at", { ascending: false }),
      db
        .from("profiles")
        .select("id,full_name,email,phone,active,user_roles(role)")
        .order("full_name"),
      db
        .from("leader_cells")
        .select(
          "leader_id,cell_id,is_primary,profiles(full_name,email),cells(name)",
        ),
      db
        .from("pastor_availability")
        .select("*")
        .order("starts_at", { ascending: false }),
      db
        .from("site_settings")
        .select("value")
        .eq("key", "weekly_meetings")
        .maybeSingle(),
    ]);
    const profileRows = profiles.data || [];
    for (const select of [
      document.getElementById("cellAssistant"),
      document.getElementById("publicLeaderProfile"),
      document.getElementById("availabilityPastor"),
    ]) {
      if (!select) continue;
      const selected = select.value;
      select.replaceChildren(new Option("Nenhum", ""));
      profileRows.forEach((person) =>
        select.append(new Option(person.full_name || person.email, person.id)),
      );
      select.value = selected;
    }
    list(catalogBox(forms.event, "eventCatalog"), events.data || [], {
      table: "church_schedule",
      form: forms.event,
      title: (r) => r.title,
      lines: (r) => [
        new Date(r.starts_at).toLocaleString("pt-BR"),
        r.status,
        r.location_text,
      ],
      archive: { archived: true, status: "archived" },
    });
    list(catalogBox(forms.cell, "cellCatalog"), cells.data || [], {
      table: "cells",
      form: forms.cell,
      title: (r) => r.name,
      lines: (r) => [
        `${r.meeting_day || "Dia pendente"} • ${String(r.meeting_time || "").slice(0, 5)}`,
        r.district,
        r.status,
      ],
      archive: { active: false, status: "archived" },
    });
    list(catalogBox(forms.leader, "leaderCatalog"), leaders.data || [], {
      table: "public_leaders",
      form: forms.leader,
      title: (r) => r.name,
      lines: (r) => [
        r.discipleship,
        r.whatsapp ? `WhatsApp: ${r.whatsapp}` : "Sem WhatsApp",
        r.active ? "Ativo" : "Inativo",
      ],
      archive: { active: false, published: false },
    });
    list(document.getElementById("groupCatalog"), groups.data || [], {
      table: "church_groups",
      form: document.getElementById("groupAdminForm"),
      title: (r) => r.name,
      lines: (r) => [r.description, r.published ? "Publicado" : "Rascunho"],
      archive: { active: false, archived: true, published: false },
    });
    list(document.getElementById("supplyCatalog"), pages.data || [], {
      table: "content_pages",
      form: document.getElementById("supplyAdminForm"),
      title: (r) => r.title,
      lines: (r) => [r.subtitle, r.status],
      archive: { status: "archived" },
    });
    renderUsers(profileRows, links.data || []);
    renderAvailability(availability.data || []);
    const weeklyForm = document.getElementById("weeklyMeetingsAdminForm");
    if (weeklyForm && Array.isArray(weekly.data?.value))
      weekly.data.value.forEach((item, index) => {
        for (const field of ["day", "title", "time", "description", "icon"])
          if (weeklyForm.elements[`meeting_${index}_${field}`])
            weeklyForm.elements[`meeting_${index}_${field}`].value =
              item[field] || "";
      });
  }
  function renderUsers(profiles, links) {
    const box = document.getElementById("userAdminList");
    box.replaceChildren();
    profiles.forEach((person) => {
      const roles = (person.user_roles || []).map((item) => item.role);
      const linked = links
        .filter((link) => link.leader_id === person.id)
        .map((link) => link.cells?.name)
        .filter(Boolean);
      const card = document.createElement("article");
      card.append(
        el("h5", person.full_name || person.email),
        el("p", person.email),
        el("p", `Perfis: ${roles.join(", ") || "membro"}`),
        el("p", `Células: ${linked.join(", ") || "nenhuma"}`),
      );
      const actions = document.createElement("div");
      actions.className = "list-actions";
      actions.append(
        action("Editar usuário", () =>
          fill(document.getElementById("userAdminForm"), person),
        ),
        action(person.active ? "Desativar" : "Ativar", async () => {
          await db
            .from("profiles")
            .update({ active: !person.active })
            .eq("id", person.id);
          loadCatalogs();
        }),
      );
      card.append(actions);
      box.append(card);
    });
    const userSelect = document.getElementById("roleUser"),
      linkLeader = document.getElementById("linkLeader");
    for (const select of [userSelect, linkLeader]) {
      if (!select) continue;
      const value = select.value;
      select.replaceChildren();
      profiles.forEach((person) =>
        select.append(new Option(person.full_name || person.email, person.id)),
      );
      select.value = value;
    }
    const linkCell = document.getElementById("linkCell");
    if (linkCell) {
      const value = linkCell.value;
      linkCell.replaceChildren();
      db.from("cells")
        .select("id,name")
        .neq("status", "archived")
        .then(({ data }) => {
          linkCell.replaceChildren();
          (data || []).forEach((cell) =>
            linkCell.append(new Option(cell.name, cell.id)),
          );
          linkCell.value = value;
        });
    }
  }
  function renderAvailability(rows) {
    const box = document.getElementById("availabilityList");
    box.replaceChildren();
    rows.forEach((item) => {
      const card = document.createElement("article");
      card.append(
        el(
          "h5",
          `${new Date(item.starts_at).toLocaleString("pt-BR")} até ${new Date(item.ends_at).toLocaleString("pt-BR")}`,
        ),
        el("p", item.available ? "Disponível" : "Bloqueado"),
        el("p", item.note || ""),
      );
      card.append(
        action("Remover", async () => {
          if (confirm("Remover este horário?")) {
            await db.from("pastor_availability").delete().eq("id", item.id);
            loadCatalogs();
          }
        }),
      );
      box.append(card);
    });
  }
  async function saveNew(form, table, transform = (value) => value) {
    const data = Object.fromEntries(new FormData(form));
    for (const check of form.querySelectorAll('input[type="checkbox"]'))
      data[check.name] = check.checked;
    for (const key of Object.keys(data)) if (data[key] === "") data[key] = null;
    const payload = await transform(data);
    const id = payload.id;
    delete payload.id;
    const result = id
      ? await db.from(table).update(payload).eq("id", id)
      : await db.from(table).insert(payload);
    notice(
      form,
      result.error ? "Não foi possível salvar." : "Salvo com sucesso.",
      result.error ? "error" : "success",
    );
    if (!result.error) {
      form.reset();
      loadCatalogs();
    }
  }
  async function upload(file, folder, allowed) {
    if (!file) return null;
    if (file.size > 15 * 1024 * 1024 || !allowed.includes(file.type))
      throw new Error("Arquivo inválido");
    const name = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "-"),
      path = `${folder}/${Date.now()}-${name}`,
      result = await db.storage
        .from("church-public")
        .upload(path, file, { contentType: file.type });
    if (result.error) throw result.error;
    return path;
  }

  const peoplePanel = document.querySelector('[data-admin-panel="people"]');
  peoplePanel?.insertAdjacentHTML(
    "afterbegin",
    '<div class="admin-form-grid enhanced-admin-grid"><form id="userAdminForm" class="management-form card-form"><input type="hidden" name="id"><h4>Usuário</h4><label>Nome<input name="full_name" required></label><label>Telefone<input name="phone"></label><label class="check"><input type="checkbox" name="active" checked> Ativo</label><button class="mg-button primary" type="submit">Salvar usuário</button><p data-form-status></p></form><form id="leaderCellForm" class="management-form card-form"><h4>Vincular líder à célula</h4><label>Líder<select id="linkLeader" name="leader_id"></select></label><label>Célula<select id="linkCell" name="cell_id"></select></label><label class="check"><input type="checkbox" name="is_primary" checked> Responsável principal</label><button class="mg-button primary" type="submit">Salvar vínculo</button><button class="mg-button" id="removeLeaderCell" type="button">Remover vínculo</button><p data-form-status></p></form></div><div id="userAdminList" class="management-list"></div>',
  );
  const contentGrid = document.querySelector(
    '[data-admin-panel="content"] .admin-form-grid',
  );
  contentGrid?.insertAdjacentHTML(
    "beforeend",
    '<form id="groupAdminForm" class="management-form card-form"><input type="hidden" name="id"><h4>Grupos</h4><label>Nome<input name="name" required></label><label class="full">Descrição<textarea name="description"></textarea></label><label>Imagem<input name="image_path"></label><label>Link oficial<input type="url" name="group_url"></label><label>Texto do botão<input name="button_label" value="Entrar no grupo"></label><label>Ordem<input type="number" name="display_order" min="0" value="0"></label><label class="check"><input type="checkbox" name="active" checked> Ativo</label><label class="check"><input type="checkbox" name="published"> Publicar</label><button class="mg-button primary" type="submit">Salvar grupo</button><p data-form-status></p></form><form id="supplyAdminForm" class="management-form card-form"><input type="hidden" name="id"><input type="hidden" name="slug"><h4>Suprimento da Célula</h4><label>Título<input name="title" required></label><label>Tema<input name="subtitle"></label><label>Data<input type="date" name="published_at"></label><label>Versículo<input name="main_verse"></label><label class="full">Conteúdo<textarea name="body"></textarea></label><label>PDF<input type="file" id="supplyPdf" accept="application/pdf"></label><label>Imagem<input type="file" id="supplyImage" accept="image/jpeg,image/png,image/webp"></label><label>Vídeo<input type="url" name="video_url"></label><label>Status<select name="status"><option value="draft">Rascunho</option><option value="published">Publicado</option><option value="archived">Arquivado</option></select></label><button class="mg-button primary" type="submit">Salvar suprimento</button><p data-form-status></p></form>',
  );
  contentGrid?.insertAdjacentHTML(
    "beforeend",
    `<form id="weeklyMeetingsAdminForm" class="management-form card-form"><h4>Encontros da semana</h4>${[0, 1, 2, 3]
      .map(
        (index) =>
          `<fieldset class="full"><legend>Encontro ${index + 1}</legend><label>Dia<input name="meeting_${index}_day" required></label><label>Título<input name="meeting_${index}_title" required></label><label>Horário<input name="meeting_${index}_time" required></label><label>Ícone<input name="meeting_${index}_icon" maxlength="4"></label><label class="full">Descrição<textarea name="meeting_${index}_description" required></textarea></label></fieldset>`,
      )
      .join("")}<button class="mg-button primary" type="submit">Salvar encontros</button><p data-form-status></p></form>`,
  );
  document
    .getElementById("groupAdminForm")
    ?.after(
      Object.assign(document.createElement("div"), {
        id: "groupCatalog",
        className: "management-list admin-catalog",
      }),
    );
  document
    .getElementById("supplyAdminForm")
    ?.after(
      Object.assign(document.createElement("div"), {
        id: "supplyCatalog",
        className: "management-list admin-catalog",
      }),
    );
  const pastoralPanel = document.querySelector('[data-admin-panel="pastoral"]');
  pastoralPanel?.insertAdjacentHTML(
    "beforeend",
    '<form id="availabilityForm" class="management-form card-form availability-form"><h4>Agenda e horários pastorais</h4><label>Pastor(a)<select id="availabilityPastor" name="pastor_id" required></select></label><label>Início<input type="datetime-local" name="starts_at" required></label><label>Fim<input type="datetime-local" name="ends_at" required></label><label class="check"><input type="checkbox" name="available" checked> Horário disponível</label><label class="full">Observação<input name="note"></label><button class="mg-button primary" type="submit">Salvar horário</button><p data-form-status></p></form><div id="availabilityList" class="management-list"></div>',
  );
  document
    .getElementById("userAdminForm")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      saveNew(event.currentTarget, "profiles");
    });
  document
    .getElementById("leaderCellForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = Object.fromEntries(new FormData(form));
      data.is_primary = form.elements.is_primary.checked;
      const { error } = await db
        .from("leader_cells")
        .upsert(data, { onConflict: "leader_id,cell_id" });
      notice(
        form,
        error ? "Não foi possível salvar o vínculo." : "Vínculo salvo.",
        error ? "error" : "success",
      );
      if (!error) loadCatalogs();
    });
  document
    .getElementById("removeLeaderCell")
    ?.addEventListener("click", async () => {
      const form = document.getElementById("leaderCellForm");
      if (!confirm("Remover somente este vínculo?")) return;
      const { error } = await db
        .from("leader_cells")
        .delete()
        .eq("leader_id", form.leader_id.value)
        .eq("cell_id", form.cell_id.value);
      notice(
        form,
        error ? "Não foi possível remover." : "Vínculo removido.",
        error ? "error" : "success",
      );
      loadCatalogs();
    });
  document
    .getElementById("groupAdminForm")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      saveNew(event.currentTarget, "church_groups");
    });
  document
    .getElementById("supplyAdminForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await saveNew(event.currentTarget, "content_pages", async (data) => {
          data.slug = data.slug || `suprimento-${Date.now()}`;
          data.created_by = state.auth.session.user.id;
          const pdf = await upload(
              document.getElementById("supplyPdf").files[0],
              "supplies",
              ["application/pdf"],
            ),
            image = await upload(
              document.getElementById("supplyImage").files[0],
              "supplies",
              ["image/jpeg", "image/png", "image/webp"],
            );
          if (pdf) data.pdf_path = pdf;
          if (image) data.image_path = image;
          return data;
        });
      } catch {
        notice(
          event.currentTarget,
          "Arquivo inválido ou falha no envio.",
          "error",
        );
      }
    });
  document
    .getElementById("availabilityForm")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      saveNew(event.currentTarget, "pastor_availability", (data) => ({
        ...data,
        pastor_id: data.pastor_id || state.auth.session.user.id,
      }));
    });
  document
    .getElementById("weeklyMeetingsAdminForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget,
        values = new FormData(form),
        meetings = [0, 1, 2, 3].map((index) => ({
          day: values.get(`meeting_${index}_day`),
          title: values.get(`meeting_${index}_title`),
          time: values.get(`meeting_${index}_time`),
          icon: values.get(`meeting_${index}_icon`) || "•",
          description: values.get(`meeting_${index}_description`),
        }));
      const { error } = await db.from("site_settings").upsert(
        {
          key: "weekly_meetings",
          value: meetings,
          published: true,
          updated_by: state.auth.session.user.id,
        },
        { onConflict: "key" },
      );
      notice(
        form,
        error ? "Não foi possível salvar os encontros." : "Encontros salvos.",
        error ? "error" : "success",
      );
    });
  for (const form of Object.values(forms))
    form?.addEventListener("submit", () => setTimeout(loadCatalogs, 800));
  const roleForm = document.getElementById("roleForm");
  if (roleForm && !document.getElementById("removeRole")) {
    const remove = action("Remover perfil", async () => {
      const data = Object.fromEntries(new FormData(roleForm));
      if (!confirm(`Remover o perfil ${data.role}?`)) return;
      const { error } = await db.rpc("manage_user_role", {
        target_user: data.user_id,
        target_role: data.role,
        remove_role: true,
      });
      notice(
        roleForm,
        error ? "Não foi possível remover." : "Perfil removido.",
        error ? "error" : "success",
      );
      loadCatalogs();
    });
    remove.id = "removeRole";
    roleForm.querySelector('button[type="submit"]')?.after(remove);
  }
  window.addEventListener("church-auth-changed", (event) => {
    state.auth = event.detail;
    for (const option of document.querySelectorAll(
      '#roleForm option[value="superadmin"],#roleForm option[value="admin"]',
    ))
      option.disabled = !state.auth?.hasRole("superadmin");
    if (canManage() && state.auth.configured) loadCatalogs();
  });
  if (window.churchAuth) {
    state.auth = window.churchAuth;
    for (const option of document.querySelectorAll(
      '#roleForm option[value="superadmin"],#roleForm option[value="admin"]',
    ))
      option.disabled = !state.auth?.hasRole("superadmin");
    if (canManage() && state.auth.configured) loadCatalogs();
  }
})();
