const einstellungPage = (function () {
  let contentArea = null;
  let titleEl = null;
  const USERS_STORAGE_KEY = "msdach-users-v1";
  const DELEGATION_RULES_KEY = "msdach-user-delegations-v1";
  const UPDATE_DELEGIEREN_SAME = "/api/update_delegieren";
  const UPDATE_DELEGIEREN_DIRECT = "https://goarrow.ai/test/update_delegieren.php";
  const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);
  const LOCAL_DEV_API_ORIGIN = "http://127.0.0.1:3001";
  const ROLE_OPTIONS = ["admin", "teamlead", "backoffice", "monteur"];
  const ASSIGNEE_OPTIONS = ["Philipp", "André", "Martin", "Simon"];
  const DEFAULT_USERS = [
    { id: 1, vorname: "Martin", nachname: "Schwaak", email: "admin@msdach.com", passwort: "********", rolle: "admin", active: true, delegatedTo: "" },
    { id: 2, vorname: "André", nachname: "Philipp", email: "andre@msdach.com", passwort: "********", rolle: "user", active: true, delegatedTo: "" },
    { id: 3, vorname: "Philipp", nachname: "Kruse", email: "philipp@msdach.com", passwort: "********", rolle: "user", active: true, delegatedTo: "" },
  ];

  let users = loadUsers();
  let nextId = Math.max(0, ...users.map((u) => Number(u.id) || 0)) + 1;
  let editingId = null;
  let pendingDeactivateUserId = null;

  function normalizeUser(user) {
    return {
      ...user,
      active: user.active !== false,
      delegatedTo: String(user.delegatedTo || "").trim(),
    };
  }

  function loadUsers() {
    try {
      const raw = localStorage.getItem(USERS_STORAGE_KEY);
      if (!raw) return DEFAULT_USERS.map(normalizeUser);
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.length) return DEFAULT_USERS.map(normalizeUser);
      return parsed.map(normalizeUser);
    } catch {
      return DEFAULT_USERS.map(normalizeUser);
    }
  }

  function saveUsers() {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch {}
    syncDelegationRules();
    if (window.MSDachAuth && typeof window.MSDachAuth.applyCurrentUserToShell === "function") {
      window.MSDachAuth.applyCurrentUserToShell();
    }
  }


  function getConfiguredApiBase() {
    try {
      const runtimeBase = String(window.__API_BASE__ || "").trim().replace(/\/+$/, "");
      if (runtimeBase) return runtimeBase;
    } catch {}

    try {
      const storageBase = String(localStorage.getItem("msdach-api-base") || "").trim().replace(/\/+$/, "");
      if (storageBase) return storageBase;
    } catch {}

    try {
      const hostname = location.hostname || "";
      const isLocal = /^(localhost|127\.0\.0\.1)$/i.test(hostname);
      if (location.protocol === "file:" || (isLocal && location.port !== "3001")) {
        return LOCAL_DEV_API_ORIGIN;
      }
    } catch {}

    return "";
  }

  function resolveApiUrl(path) {
    if (/^https?:\/\//i.test(path)) return path;
    const base = getConfiguredApiBase();
    return base ? `${base}${path.startsWith("/") ? path : `/${path}`}` : path;
  }
  async function parseApiJson(response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.status === "error") {
      throw new Error(data.message || `HTTP ${response.status}`);
    }
    return data;
  }

  async function fetchUsersFromAPI() {
    const response = await fetch(resolveApiUrl("/api/auth_users"), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const data = await parseApiJson(response);
    return (data.users || data.data || []).map(normalizeUser);
  }

  async function createUserOnAPI(payload) {
    const response = await fetch(resolveApiUrl("/api/auth_users"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await parseApiJson(response);
    return normalizeUser(data.user || data.data);
  }

  async function updateUserOnAPI(id, payload) {
    const response = await fetch(resolveApiUrl("/api/auth_users"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ id, ...payload }),
    });
    const data = await parseApiJson(response);
    return normalizeUser(data.user || data.data);
  }

  async function deleteUserOnAPI(id) {
    const response = await fetch(`${resolveApiUrl("/api/auth_users")}?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Accept: "application/json" },
    });
    await parseApiJson(response);
  }

  async function refreshUsersFromAPI() {
    try {
      const apiUsers = await fetchUsersFromAPI();
      if (apiUsers.length) {
        users = apiUsers;
        nextId = Math.max(0, ...users.map((u) => Number(u.id) || 0)) + 1;
        saveUsers();
        renderUsers();
      }
    } catch (error) {
      console.warn("Auth users API fetch failed, using local users:", error?.message || error);
    }
  }

  function getUserDisplayName(user) {
    return [user?.vorname, user?.nachname].filter(Boolean).join(" ").trim();
  }

  function getUserAssigneeName(user) {
    return String(user?.vorname || "").trim();
  }

  function getDelegationTargetOptions(userId) {
    const currentUser = users.find((u) => String(u.id) === String(userId));
    const currentName = getUserAssigneeName(currentUser);
    const dynamicNames = users
      .filter((u) => u.id !== userId && u.active !== false)
      .map((u) => getUserAssigneeName(u))
      .filter(Boolean);

    return Array.from(new Set([...ASSIGNEE_OPTIONS, ...dynamicNames]))
      .filter((name) => name && name !== currentName);
  }

  function syncDelegationRules() {
    const rules = {};
    users.forEach((user) => {
      const assignee = getUserAssigneeName(user);
      if (!assignee) return;
      if (user.active === false && user.delegatedTo) {
        rules[assignee] = user.delegatedTo;
      }
    });

    try {
      localStorage.setItem(DELEGATION_RULES_KEY, JSON.stringify(rules));
    } catch {}
  }

  async function updateDelegierenOnAPI(bearbeiter, delegieren) {
    const jsonPayload = {
      bearbeiter: String(bearbeiter || "").trim(),
      delegieren: String(delegieren || "").trim(),
    };

    const parseApiResponse = async (response) => {
      const text = await response.text();
      let payload = null;

      if (text) {
        try {
          payload = JSON.parse(text);
        } catch {
          payload = { status: text.trim().toLowerCase() === "false" ? "error" : "success", raw: text };
        }
      }

      if (!response.ok) {
        throw new Error(payload?.message || `HTTP ${response.status}`);
      }

      if (!text || text.trim().toLowerCase() === "false" || payload?.status === "error" || payload?.success === false) {
        throw new Error(payload?.message || "Delegieren Update fehlgeschlagen");
      }

      return payload || { status: "success" };
    };

    try {
      const response = await fetch(UPDATE_DELEGIEREN_SAME, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(jsonPayload),
      });

      return await parseApiResponse(response);
    } catch (error) {
      const isLocalDev = LOCAL_HOSTS.has(window.location.hostname);
      if (!isLocalDev) {
        throw new Error(error?.message || "Delegieren Update fehlgeschlagen");
      }

      console.warn("Same-origin delegieren update failed in local dev, trying direct fallback:", error?.message || error);
    }

    const formData = new URLSearchParams();
    formData.append("bearbeiter", jsonPayload.bearbeiter);
    formData.append("delegieren", jsonPayload.delegieren);

    const response = await fetch(UPDATE_DELEGIEREN_DIRECT, {
      method: "POST",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    return await parseApiResponse(response);
  }

  async function updateMitarbeiterStatusOnAPI(email, active) {
    const response = await fetch(resolveApiUrl("/api/update_mitarbeiter_status"), {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: String(email || "").trim(),
        aktiv: !!active,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.status === "error") {
      throw new Error(data.message || `HTTP ${response.status}`);
    }
    return data;
  }

  const getHTML = () => `
    <div class="es-container">
      <div class="es-header">
        <div>
          <div class="es-title">Benutzerverwaltung</div>
          <div class="es-sub">Systembenutzer und Berechtigungen verwalten</div>
        </div>
        <button class="es-add-btn" id="es-open-create">
          <svg width="16" height="16" fill="none" stroke="white" stroke-width="2.5" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Neuen Benutzer hinzufügen
        </button>
      </div>

      <div id="es-user-list"></div>
    </div>

    <div id="es-modal" class="es-modal-overlay">
      <div class="es-modal-box">
        <div class="es-modal-header">
          <div>
            <div class="es-modal-title" id="es-modal-title">Neuen Benutzer hinzufügen</div>
            <div class="es-modal-sub">Anmeldeformular</div>
          </div>
          <button class="es-modal-close" id="es-modal-close">&times;</button>
        </div>
        <div class="es-modal-body">
          <div class="es-field">
            <label>Vorname*</label>
            <input type="text" id="es-vorname" placeholder="Geben Sie den Vornamen ein">
          </div>
          <div class="es-field">
            <label>Nachname*</label>
            <input type="text" id="es-nachname" placeholder="Geben Sie den Nachnamen ein">
          </div>
          <div class="es-field">
            <label>E-Mail*</label>
            <input type="email" id="es-email" placeholder="Geben Sie Ihre E-Mail-Adresse ein">
          </div>
          <div class="es-field">
            <label>Passwort*</label>
            <input type="password" id="es-passwort" placeholder="Passwort eingeben">
          </div>
          <div class="es-field">
            <label>Rolle*</label>
            <select id="es-rolle">
              <option value="" disabled selected>Wählen Sie eine Rolle</option>
              ${ROLE_OPTIONS.map((role) => `<option value="${role}">${role}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="es-modal-footer">
          <button class="es-cancel-btn" id="es-cancel-btn">Stornieren</button>
          <button class="es-create-btn" id="es-submit-btn">Benutzer erstellen</button>
        </div>
      </div>
    </div>

    <div id="es-deactivate-modal" class="es-modal-overlay">
      <div class="es-modal-box es-deactivate-box">
        <div class="es-modal-header">
          <div>
            <div class="es-modal-title">Benutzer deaktivieren</div>
            <div class="es-modal-sub">Wählen Sie aus, wem die Leads delegiert werden sollen</div>
          </div>
          <button class="es-modal-close" id="es-deactivate-close">&times;</button>
        </div>
        <div class="es-modal-body">
          <div class="es-field">
            <label>Delegieren an</label>
            <select id="es-deactivate-delegate">
              <option value="">Bitte Benutzer wählen</option>
            </select>
          </div>
        </div>
        <div class="es-modal-footer">
          <button class="es-cancel-btn" id="es-deactivate-cancel">Abbrechen</button>
          <button class="es-create-btn" id="es-deactivate-confirm">Deaktivieren</button>
        </div>
      </div>
    </div>
  `;

  function addStyles() {
    if (document.getElementById("einstellung-styles")) return;
    const s = document.createElement("style");
    s.id = "einstellung-styles";
    s.textContent = `
      .es-container { width: 100%; max-width: 1100px; }
      .es-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; flex-wrap: wrap; gap: 16px; }
      .es-title { font-size: 1.45rem; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
      .es-sub { font-size: 0.85rem; color: #64748b; }
      .es-add-btn { display: inline-flex; align-items: center; gap: 8px; background: #22c55e; color: white; border: none; padding: 13px 24px; border-radius: 10px; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: background 0.15s; white-space: nowrap; }
      .es-add-btn:hover { background: #16a34a; }
      .es-gesamt { font-size: 1rem; font-weight: 700; color: #0f172a; margin-bottom: 16px; }
      .es-empty { text-align: center; padding: 60px 20px; color: #94a3b8; font-size: 0.95rem; }
      .es-user-card { display: flex; align-items: center; justify-content: space-between; background: white; border: 1px solid #e8edf4; border-radius: 14px; padding: 20px 24px; margin-bottom: 14px; transition: box-shadow 0.15s, opacity 0.15s, border-color 0.15s; }
      .es-user-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
      .es-user-card.inactive { opacity: 0.8; border-color: #fcd34d; background: #fffbeb; }
      .es-user-info { display: flex; flex-direction: column; gap: 3px; }
      .es-user-name { font-size: 1.05rem; font-weight: 700; color: #0f172a; }
      .es-user-email { font-size: 0.85rem; color: #64748b; }
      .es-user-meta { font-size: 0.78rem; color: #b45309; margin-top: 4px; }
      .es-user-actions { display: flex; align-items: center; gap: 14px; flex-shrink: 0; }
      .es-role-badge { padding: 5px 16px; border-radius: 20px; font-size: 0.82rem; font-weight: 500; background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
      .es-role-badge.admin { background: #dcfce7; color: #15803d; border-color: #86efac; }
      .es-status-wrap { display: flex; align-items: center; gap: 10px; }
      .es-status-text { font-size: 0.82rem; font-weight: 600; color: #166534; min-width: 42px; }
      .es-status-text.inactive { color: #b45309; }
      .es-toggle { position: relative; width: 52px; height: 30px; display: inline-block; }
      .es-toggle input { opacity: 0; width: 0; height: 0; }
      .es-toggle-slider { position: absolute; inset: 0; cursor: pointer; background: #cbd5e1; border-radius: 999px; transition: background 0.2s ease; }
      .es-toggle-slider::before { content: ""; position: absolute; width: 24px; height: 24px; left: 3px; top: 3px; border-radius: 50%; background: white; box-shadow: 0 1px 4px rgba(15,23,42,0.18); transition: transform 0.2s ease; }
      .es-toggle input:checked + .es-toggle-slider { background: #22c55e; }
      .es-toggle input:checked + .es-toggle-slider::before { transform: translateX(22px); }
      .es-icon-btn { background: none; border: none; cursor: pointer; padding: 6px; border-radius: 7px; display: inline-flex; align-items: center; justify-content: center; transition: background 0.15s; }
      .es-edit-btn { color: #22c55e; }
      .es-edit-btn:hover { background: #f0fdf4; }
      .es-delete-btn { color: #ef4444; }
      .es-delete-btn:hover { background: #fef2f2; }
      .es-modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.45); justify-content: center; align-items: center; z-index: 99999; }
      .es-modal-overlay.active { display: flex; }
      .es-modal-box { background: white; border-radius: 20px; width: 90%; max-width: 580px; max-height: 90vh; overflow-y: auto; animation: esModalIn 0.2s ease; box-shadow: 0 20px 60px rgba(0,0,0,0.18); }
      .es-deactivate-box { max-width: 480px; }
      @keyframes esModalIn { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
      .es-modal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 28px 32px 0; }
      .es-modal-title { font-size: 1.3rem; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
      .es-modal-sub { font-size: 0.85rem; color: #64748b; }
      .es-modal-close { background: none; border: none; font-size: 1.4rem; cursor: pointer; color: #94a3b8; line-height: 1; padding: 4px; margin-top: -4px; }
      .es-modal-close:hover { color: #475569; }
      .es-modal-body { padding: 24px 32px; display: flex; flex-direction: column; gap: 16px; }
      .es-field { display: flex; flex-direction: column; gap: 7px; }
      .es-field label { font-size: 0.92rem; font-weight: 600; color: #0f172a; }
      .es-field input, .es-field select { width: 100%; padding: 13px 16px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 0.92rem; color: #0f172a; background: white; box-sizing: border-box; transition: border-color 0.15s; }
      .es-field input:focus, .es-field select:focus { outline: none; border-color: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,0.1); }
      .es-field input::placeholder { color: #cbd5e1; }
      .es-field select { color: #94a3b8; }
      .es-field select.has-value { color: #0f172a; }
      .es-modal-footer { display: flex; align-items: center; gap: 14px; padding: 0 32px 28px; }
      .es-cancel-btn { background: white; color: #0f172a; border: 1.5px solid #e2e8f0; padding: 12px 28px; border-radius: 10px; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: all 0.15s; }
      .es-cancel-btn:hover { background: #f8fafc; border-color: #cbd5e1; }
      .es-create-btn { background: #22c55e; color: white; border: none; padding: 12px 28px; border-radius: 10px; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: background 0.15s; }
      .es-create-btn:hover { background: #16a34a; }
      .es-field input.error, .es-field select.error { border-color: #ef4444; }
      .es-err-msg { font-size: 0.78rem; color: #ef4444; margin-top: -4px; }
      @media (max-width: 600px) {
        .es-modal-header { padding: 20px 20px 0; }
        .es-modal-body { padding: 18px 20px; }
        .es-modal-footer { padding: 0 20px 22px; }
        .es-user-card { padding: 16px; flex-wrap: wrap; gap: 12px; }
        .es-user-actions { width: 100%; justify-content: flex-end; flex-wrap: wrap; }
      }
    `;
    document.head.appendChild(s);
  }

  function renderUsers() {
    const wrap = document.getElementById("es-user-list");
    if (!wrap) return;

    if (!users.length) {
      wrap.innerHTML = `<div class="es-empty">Noch keine Benutzer angelegt.<br>Klicken Sie auf „Neuen Benutzer hinzufügen“.</div>`;
      return;
    }

    let html = `<div class="es-gesamt"><strong>Gesamt:</strong> ${users.length}</div>`;
    users.forEach((u) => {
      const displayName = getUserDisplayName(u);
      const assigneeName = getUserAssigneeName(u);
      const userId = esc(String(u.id));
      html += `
        <div class="es-user-card ${u.active === false ? "inactive" : ""}">
          <div class="es-user-info">
            <div class="es-user-name">${esc(displayName)}</div>
            <div class="es-user-email">${esc(u.email)}</div>
            ${u.active === false && u.delegatedTo ? `<div class="es-user-meta">Leads werden an ${esc(u.delegatedTo)} delegiert</div>` : ""}
          </div>
          <div class="es-user-actions">
            <div class="es-status-wrap">
              <span class="es-status-text ${u.active === false ? "inactive" : ""}">${u.active === false ? "Inaktiv" : "Aktiv"}</span>
              <label class="es-toggle" title="Benutzer aktiv/inaktiv">
                <input type="checkbox" ${u.active !== false ? "checked" : ""} ${u.active === false ? "disabled" : ""} onchange="window.esToggleUserStatus('${userId}', this)">
                <span class="es-toggle-slider"></span>
              </label>
            </div>
            <span class="es-role-badge ${u.rolle === "admin" ? "admin" : ""}">${esc(u.rolle)}</span>
            <button class="es-icon-btn es-edit-btn" onclick="window.esEditUser('${userId}')" title="Bearbeiten">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="es-icon-btn es-delete-btn" onclick="window.esDeleteUser('${userId}')" title="Löschen">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          </div>
        </div>
      `;
      if (!assigneeName) return;
    });
    wrap.innerHTML = html;
  }

  function openModal(mode, userId) {
    editingId = mode === "edit" ? userId : null;
    const titleEl2 = document.getElementById("es-modal-title");
    const submitBtn = document.getElementById("es-submit-btn");

    if (mode === "edit") {
      const u = users.find((x) => String(x.id) === String(userId));
      if (!u) return;
      titleEl2.textContent = "Benutzer bearbeiten";
      submitBtn.textContent = "Änderungen speichern";
      document.getElementById("es-vorname").value = u.vorname;
      document.getElementById("es-nachname").value = u.nachname;
      document.getElementById("es-email").value = u.email;
      document.getElementById("es-passwort").value = "";
      const rolSel = document.getElementById("es-rolle");
      rolSel.value = u.rolle;
      rolSel.classList.add("has-value");
    } else {
      titleEl2.textContent = "Neuen Benutzer hinzufügen";
      submitBtn.textContent = "Benutzer erstellen";
      document.getElementById("es-vorname").value = "";
      document.getElementById("es-nachname").value = "";
      document.getElementById("es-email").value = "";
      document.getElementById("es-passwort").value = "";
      document.getElementById("es-rolle").value = "";
      document.getElementById("es-rolle").classList.remove("has-value");
    }

    clearErrors();
    document.getElementById("es-modal").classList.add("active");
  }

  function closeModal() {
    document.getElementById("es-modal")?.classList.remove("active");
    editingId = null;
  }

  function openDeactivateModal(userId) {
    pendingDeactivateUserId = userId;
    const select = document.getElementById("es-deactivate-delegate");
    if (!select) return;

    const user = users.find((u) => String(u.id) === String(userId));
    const options = getDelegationTargetOptions(userId);
    select.innerHTML = `<option value="">Bitte Benutzer wählen</option>${options.map((name) => `<option value="${esc(name)}">${esc(name)}</option>`).join("")}`;
    if (user?.delegatedTo && options.includes(user.delegatedTo)) {
      select.value = user.delegatedTo;
      select.classList.add("has-value");
    } else {
      select.value = "";
      select.classList.remove("has-value");
    }

    document.getElementById("es-deactivate-modal")?.classList.add("active");
  }

  function closeDeactivateModal() {
    document.getElementById("es-deactivate-modal")?.classList.remove("active");
    pendingDeactivateUserId = null;
    const select = document.getElementById("es-deactivate-delegate");
    if (select) {
      select.value = "";
      select.classList.remove("has-value");
    }
    renderUsers();
  }

  async function confirmDeactivateUser() {
    const user = users.find((u) => String(u.id) === String(pendingDeactivateUserId));
    const selectedDelegate = String(document.getElementById("es-deactivate-delegate")?.value || "").trim();
    const confirmBtn = document.getElementById("es-deactivate-confirm");
    if (!user || !selectedDelegate) {
      alert("Bitte wählen Sie einen Delegieren-Benutzer aus.");
      return;
    }

    try {
      if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = "Wird deaktiviert...";
      }

      await updateDelegierenOnAPI(getUserAssigneeName(user), selectedDelegate);
      await updateMitarbeiterStatusOnAPI(user.email, false);
      try {
        await updateUserOnAPI(user.id, { ...user, active: false, delegatedTo: selectedDelegate });
      } catch (apiError) {
        console.warn("Auth user deactivate API failed, saving locally:", apiError?.message || apiError);
      }

      user.active = false;
      user.delegatedTo = selectedDelegate;
      saveUsers();
      renderUsers();
      closeDeactivateModal();
    } catch (error) {
      alert(error?.message || "Delegieren Update fehlgeschlagen.");
    } finally {
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Deaktivieren";
      }
    }
  }

  function clearErrors() {
    document.querySelectorAll(".es-err-msg").forEach((e) => e.remove());
    document.querySelectorAll(".error").forEach((e) => e.classList.remove("error"));
  }

  function showError(inputId, msg) {
    const el = document.getElementById(inputId);
    if (!el) return;
    el.classList.add("error");
    const err = document.createElement("div");
    err.className = "es-err-msg";
    err.textContent = msg;
    el.insertAdjacentElement("afterend", err);
  }

  function validateForm() {
    clearErrors();
    let ok = true;
    const vn = document.getElementById("es-vorname").value.trim();
    const nn = document.getElementById("es-nachname").value.trim();
    const em = document.getElementById("es-email").value.trim();
    const pw = document.getElementById("es-passwort").value.trim();
    const rl = document.getElementById("es-rolle").value;

    if (!vn) { showError("es-vorname", "Vorname ist erforderlich"); ok = false; }
    if (!nn) { showError("es-nachname", "Nachname ist erforderlich"); ok = false; }
    if (!em || !/\S+@\S+\.\S+/.test(em)) { showError("es-email", "Gültige E-Mail erforderlich"); ok = false; }
    if (!editingId && !pw) { showError("es-passwort", "Passwort ist erforderlich"); ok = false; }
    if (!rl) { showError("es-rolle", "Bitte eine Rolle wählen"); ok = false; }

    return ok ? { vn, nn, em, pw, rl } : null;
  }

  async function handleSubmit() {
    const data = validateForm();
    if (!data) return;
    const submitBtn = document.getElementById("es-submit-btn");
    const originalText = submitBtn?.textContent || "Benutzer erstellen";

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Wird gespeichert...";
    }

    try {
      if (editingId) {
        let savedUser = null;
        try {
          savedUser = await updateUserOnAPI(editingId, {
            vorname: data.vn,
            nachname: data.nn,
            email: data.em,
            rolle: data.rl,
            ...(data.pw ? { passwort: data.pw } : {}),
          });
        } catch (apiError) {
          console.warn("Auth user update API failed, saving locally:", apiError?.message || apiError);
        }

        const idx = users.findIndex((u) => String(u.id) === String(editingId));
        if (idx !== -1) {
          users[idx] = savedUser || {
            ...users[idx],
            vorname: data.vn,
            nachname: data.nn,
            email: data.em,
            rolle: data.rl,
            ...(data.pw ? { passwort: data.pw } : {}),
          };
        }
      } else {
        let savedUser = null;
        try {
          savedUser = await createUserOnAPI({
            vorname: data.vn,
            nachname: data.nn,
            email: data.em,
            passwort: data.pw,
            rolle: data.rl,
          });
        } catch (apiError) {
          alert(apiError?.message || "Signup API fehlgeschlagen.");
          return;
        }

        users.push(savedUser || {
          id: nextId++,
          vorname: data.vn,
          nachname: data.nn,
          email: data.em,
          passwort: data.pw,
          rolle: data.rl,
          active: true,
          delegatedTo: "",
        });
      }

      saveUsers();
      closeModal();
      renderUsers();
      refreshUsersFromAPI();
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  }

  window.esEditUser = (id) => openModal("edit", id);

  window.esDeleteUser = async (id) => {
    const u = users.find((x) => String(x.id) === String(id));
    if (!u) return;
    if (confirm(`Benutzer „${getUserDisplayName(u)}” wirklich löschen?`)) {
      try {
        await deleteUserOnAPI(id);
      } catch (apiError) {
        console.warn("Auth user delete API failed, deleting locally:", apiError?.message || apiError);
      }
      users = users.filter((x) => String(x.id) !== String(id));
      saveUsers();
      renderUsers();
    }
  };

  window.esToggleUserStatus = (id, checkboxEl) => {
    const user = users.find((u) => String(u.id) === String(id));
    if (!user) return;
    if (user.active === false) {
      if (checkboxEl) checkboxEl.checked = false;
      return;
    }
    const isActive = !!checkboxEl?.checked;

    if (isActive) {
      updateMitarbeiterStatusOnAPI(user.email, true).catch((apiError) => {
        console.warn("Mitarbeiter aktiv update failed, saving locally:", apiError?.message || apiError);
      });
      updateUserOnAPI(id, { ...user, active: true, delegatedTo: "" }).catch((apiError) => {
        console.warn("Auth user activate API failed, saving locally:", apiError?.message || apiError);
      });
      user.active = true;
      user.delegatedTo = "";
      saveUsers();
      renderUsers();
      return;
    }

    if (checkboxEl) checkboxEl.checked = true;
    openDeactivateModal(id);
  };

  function esc(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function init(contentEl, titleElement) {
    contentArea = contentEl;
    titleEl = titleElement;
    addStyles();
    syncDelegationRules();

    if (titleEl) {
      titleEl.innerHTML = `<h1>Einstellung</h1><p>Benutzerverwaltung</p>`;
      titleEl.style.display = "block";
    }

    if (!contentArea) return;
    contentArea.innerHTML = getHTML();
    renderUsers();
    refreshUsersFromAPI();

    document.getElementById("es-open-create")?.addEventListener("click", () => openModal("create"));
    document.getElementById("es-modal-close")?.addEventListener("click", closeModal);
    document.getElementById("es-cancel-btn")?.addEventListener("click", closeModal);
    document.getElementById("es-modal")?.addEventListener("click", (e) => {
      if (e.target === document.getElementById("es-modal")) closeModal();
    });
    document.getElementById("es-submit-btn")?.addEventListener("click", handleSubmit);
    document.getElementById("es-rolle")?.addEventListener("change", (e) => {
      e.target.classList.toggle("has-value", !!e.target.value);
    });

    document.getElementById("es-deactivate-close")?.addEventListener("click", closeDeactivateModal);
    document.getElementById("es-deactivate-cancel")?.addEventListener("click", closeDeactivateModal);
    document.getElementById("es-deactivate-confirm")?.addEventListener("click", confirmDeactivateUser);
    document.getElementById("es-deactivate-delegate")?.addEventListener("change", (e) => {
      e.target.classList.toggle("has-value", !!e.target.value);
    });
    document.getElementById("es-deactivate-modal")?.addEventListener("click", (e) => {
      if (e.target === document.getElementById("es-deactivate-modal")) closeDeactivateModal();
    });

    console.log("einstellung page loaded");
  }

  return { init };
})();

window.einstellungPage = einstellungPage;
window.settingsPage = window.einstellungPage;
console.log("einstellung.js loaded - window.einstellungPage exists:", !!window.einstellungPage);

