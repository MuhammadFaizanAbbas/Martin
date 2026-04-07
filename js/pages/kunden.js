const kundenPage = (function () {
  let contentArea = null;
  let titleEl = null;
  let fullLeadsData = [];
  let notesCache = new Map();
  let activityCache = new Map();
  const PENDING_KUNDEN_UPDATES_KEY = "kunden-pending-updates-v1";
  const KUNDEN_LEADS_CACHE_KEY = "kunden-leads-cache-v1";
  const KUNDEN_DASHBOARD_CACHE_KEY = "kunden-dashboard-cache-v1";

  // ── API URLs ──────────────────────────────────────────────────────────────
  const SO_LEADS = "/api/leads";
  const SO_DASHBOARD = "/api/dashboard";
  const REMOTE_LEADS_URL = "https://goarrow.ai/test/fetch_all_leads.php";
  const REMOTE_DASHBOARD_URL = "https://goarrow.ai/test/dashboard.php";
  const ACTIVITY_FETCH_SAME = "/api/lead_activity";
  const NOTES_FETCH_SAME = "/api/lead_notes";
  const UPDATE_API_DIRECT = "https://goarrow.ai/test/update_lead.php";
  const UPDATE_API_SAME = "/api/update_lead";
  const UPDATE_API_PROXY = `https://corsproxy.io/?${encodeURIComponent(UPDATE_API_DIRECT)}`;
  const UPDATE_API_ALT_PROXY = `https://api.allorigins.win/raw?url=${encodeURIComponent(UPDATE_API_DIRECT)}`;
  const BULK_EMAIL_WEBHOOK_URL =
    "https://msdach.app.n8n.cloud/webhook/send_bulk_emails";

  // Add these lines near other API URLs (around line 20-30)
const INSERT_ACTIVITY_API = "/api/insert_activity";
const INSERT_ACTIVITY_DIRECT = "https://goarrow.ai/test/insert_activity.php";

  const PROXY_LEADS_URL = `https://corsproxy.io/?${encodeURIComponent(REMOTE_LEADS_URL)}`;
  const PROXY_DASHBOARD_URL = `https://corsproxy.io/?${encodeURIComponent(REMOTE_DASHBOARD_URL)}`;
  const ALT_PROXY_LEADS_URL = `https://api.allorigins.win/raw?url=${encodeURIComponent(REMOTE_LEADS_URL)}`;
  const ALT_PROXY_DASHBOARD_URL = `https://api.allorigins.win/raw?url=${encodeURIComponent(REMOTE_DASHBOARD_URL)}`;

  // ── State ──────────────────────────────────────────────────────────────────
  function shouldTrySameOriginApi() {
    const hostname = window.location.hostname;
    const port = window.location.port;
    const isStaticDevHost =
      (hostname === "127.0.0.1" || hostname === "localhost") &&
      /^55\d{2}$/.test(port || "");

    return !isStaticDevHost;
  }

  function getCorsSafeEndpoints(sameOriginUrl, proxyUrl, altProxyUrl) {
    const endpoints = [];
    if (shouldTrySameOriginApi() && sameOriginUrl) {
      endpoints.push({ url: sameOriginUrl, delay: 0 });
    }
    if (proxyUrl) endpoints.push({ url: proxyUrl, delay: 0 });
    if (altProxyUrl) endpoints.push({ url: altProxyUrl, delay: 350 });
    return endpoints;
  }

  function getResilientFetchEndpoints(sameOriginUrl, targetUrl) {
    const endpoints = [];
    if (shouldTrySameOriginApi() && sameOriginUrl) {
      endpoints.push({ url: `${sameOriginUrl}?_ts=${Date.now()}`, delay: 0 });
    }

    const proxyTargets = [
      `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    ];

    proxyTargets.forEach((url, index) => {
      endpoints.push({ url, delay: index * 350 });
    });

    return endpoints;
  }

  function saveJsonCache(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify({ value, savedAt: Date.now() }));
    } catch {}
  }

  function loadJsonCache(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.value ?? null;
    } catch {
      return null;
    }
  }

  function loadPendingUpdates() {
    try {
      const raw = localStorage.getItem(PENDING_KUNDEN_UPDATES_KEY);
      if (!raw) return new Map();
      return new Map(Object.entries(JSON.parse(raw) || {}));
    } catch {
      return new Map();
    }
  }

  function persistPendingUpdates() {
    try {
      localStorage.setItem(
        PENDING_KUNDEN_UPDATES_KEY,
        JSON.stringify(Object.fromEntries(pendingUpdates)),
      );
    } catch {}
  }

  function queuePendingUpdate(id, patch) {
    const key = String(id);
    pendingUpdates.set(key, {
      ...(pendingUpdates.get(key) || {}),
      ...patch,
      _updatedAt: Date.now(),
    });
    persistPendingUpdates();
  }

  function applyPendingUpdates(list) {
    return list.map((lead) => {
      const pending = pendingUpdates.get(String(lead.id));
      if (!pending) return lead;
      const merged = { ...lead, ...pending };
      if (merged.status) merged.statusClass = getStatusClass(merged.status);
      return merged;
    });
  }

  let leadsData = [];
  let dashboardStats = {};
  let expandedRows = new Set();
  let selectedKunden = new Set();
  let checkedEdit = new Set();
  let kundenActiveFilter = "offen";
  let filteredData = [];
  let isLoading = false;
  let pendingUpdates = loadPendingUpdates();
  
  // New filter states
  let statusFilter = "";
  let leadSourceFilter = "";
  let ortSearchTerm = "";
  let bearbeiterFilter = "";
  let delegierenFilter = "";  // Add this line

  // Store teleconsultation selections for each lead
  let teleconsultationSelections = new Map();

  const STATUS_MAPPING = {
    Offen: "Offen",
    "follow up": "follow up",
    "Infos eingeholt": "Infos...",
    "Nur Info eingeholt": "Infos...",
    "in Bearbeitung": "in Bearbeitung",
    Beauftragung: "Beauftragung",
    "EA Beauftragung": "EA Beauftragung",
    "NF Beauftragung": "NF Beauftragung",
    Abgesagt: "Abgesagt",
    "Abgesagt tot": "Abgesagt tot",
    "Außerhalb Einzugsgebiet": "Außerhalb",
    "falscher Kunde": "falscher Kunde",
    Ghoster: "Ghoster",
    Storniert: "Storniert",
  };

  // Status options for edit modal - comprehensive list
  const EDIT_STATUS_OPTIONS = [
    "follow up",
    "Offen",
    "In Bearbeitung",
    "Infos eingeholt",
    "Beauftragung",
    "Beauftragt",
    "EA beauftragt",
    "NT beauftragt",
    "In Bearbeitung - Angebot",
    "In Bearbeitung - Preischätzung",
    "Abgesagt",
    "1x gesagt tot",
    "Falscher Kunde",
    "Storno",
    "Ghoster"
  ];
  // Status options for edit modal - comprehensive list
  const client_STATUS_OPTIONS = [
    "in Bearbeitung",
    "Offen",
    "Nur Info eingeholt",
    "falscher Kunde",
  ];
  const BEARBEITUNG_STATUS_OPTIONS = [
    "follow up",
    "EA Beauftragung",
    "Beauftragung",
    "NF Beauftragung",
  ];
  const FOLLOW_UP_STATUS_OPTIONS = [
    "Ghoster",
    "Abgesagt",
    "Abgesagt tot",
    "NF Beauftragung",
    "Contact Sign In",
  ];
  const BEAUFTRAGUNG_STATUS_OPTIONS = [
    "Storniert",
  ];

  // Quelle options
  const QUELLE_OPTIONS = [
    "Google", "Facebook", "ChatGPT", "Instagram", "kleinanzeigen",
    "Empfehlung", "Newsletter", "Bestandskunde", "MA Baustelle",
    "Empfehlungskarte", "Aussendienst", "Platzhalter", "Buswerbung",
    "Autowerbung", "bing", "Flyer", "Solar"
  ];

  // Bearbeiter options
  const BEARBEITER_OPTIONS = ["Philipp", "André", "Martin", "Simon"];

  // Dacheindeckung options
  const DACHEINDECKUNG_OPTIONS = [
    "Beton", "Ton", "Metall", "Eternit", "Engobe", "Glasiert", "Asbest", "Echt Schiefer", "Tegalit"
  ];

  // Farbe options
  const FARBE_OPTIONS = [
    "Anthrazit", "Rot", "Schwarz", "Grau", "Ziegelrot", "Blauschwarz",
    "Schiefergrau", "Stahlblau", "Bordeaux", "Moosgrün", "Oxidrot", "Klassikrot"
  ];

  // Dachpfanne options
  const DACHPFANNE_OPTIONS = [
    "Frankfurter Pfanne", "Harzer Pfanne", "Doppel-S Pfanne", "Taunus Pfanne",
    "Hohlpfanne", "Doppelmuldenziegel", "Biberschwanz", "Tegalit", "Sonstige", "Unbekannt"
  ];

  // Dachneigung options
  const DACHNEIGUNG_OPTIONS = [
    "0-15°", "15-25°", "25-45°", "45-55°", "über 55 Grad"
  ];

  // ─────────────────────────────────────────────
  // TOASTS (lightweight, no dependency)
  // ─────────────────────────────────────────────
  function addToastStyles() {
    if (document.getElementById("toast-styles")) return;
    const s = document.createElement("style");
    s.id = "toast-styles";
    s.textContent = `
      .toast-container { position: fixed; top: 16px; right: 16px; z-index: 999999; display: flex; flex-direction: column; gap: 10px; pointer-events: none; }
      .toast { min-width: 280px; max-width: 380px; padding: 12px 14px; border-radius: 10px; color: #0f172a; background: #ffffff; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(0,0,0,0.08); font-size: 0.9rem; display: grid; grid-template-columns: 6px 1fr auto; align-items: center; gap: 12px; opacity: 0; transform: translateX(16px); animation: toastIn 200ms ease forwards; pointer-events: auto; position: relative; overflow: hidden; }
      .toast .toast-accent { width: 6px; height: 100%; border-radius: 6px; }
      .toast .toast-close { background: transparent; border: none; color: #94a3b8; font-size: 16px; cursor: pointer; line-height: 1; padding: 2px 4px; border-radius: 6px; }
      .toast .toast-close:hover { background: #f1f5f9; color: #475569; }
      .toast .toast-progress { position: absolute; left: 0; bottom: 0; height: 3px; width: 100%; background: rgba(0,0,0,0.06); }
      .toast .toast-progress > div { height: 100%; width: 100%; transform-origin: left center; background: #3b82f6; }
      .toast-success { border-color: #bbf7d0; }
      .toast-success .toast-accent { background: #22c55e; }
      .toast-success .toast-progress > div { background: #22c55e; }
      .toast-error { border-color: #fecaca; }
      .toast-error .toast-accent { background: #ef4444; }
      .toast-error .toast-progress > div { background: #ef4444; }
      .toast-info { border-color: #c7d2fe; }
      .toast-info .toast-accent { background: #3b82f6; }
      .toast-info .toast-progress > div { background: #3b82f6; }
      @keyframes toastIn { to { opacity: 1; transform: translateX(0); } }
      @keyframes toastOut { to { opacity: 0; transform: translateX(16px); } }
    `;
    document.head.appendChild(s);
  }

  function ensureToastContainer() {
    let c = document.getElementById("toast-container");
    if (!c) {
      c = document.createElement("div");
      c.id = "toast-container";
      c.className = "toast-container";
      document.body.appendChild(c);
    }
    return c;
  }

  function showToast(message, type = "success", duration = 2500) {
    addToastStyles();
    const container = ensureToastContainer();
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    const accent = document.createElement("div");
    accent.className = "toast-accent";
    const content = document.createElement("div");
    content.textContent = message;
    const close = document.createElement("button");
    close.className = "toast-close";
    close.setAttribute("aria-label", "Schließen");
    close.textContent = "×";
    const progress = document.createElement("div");
    progress.className = "toast-progress";
    const bar = document.createElement("div");
    progress.appendChild(bar);
    el.appendChild(accent);
    el.appendChild(content);
    el.appendChild(close);
    el.appendChild(progress);
    container.appendChild(el);

    let start = performance.now();
    let stopped = false;
    const tick = (t) => {
      const elapsed = t - start;
      const pct = Math.max(0, 1 - elapsed / duration);
      bar.style.transform = `scaleX(${pct})`;
      if (!stopped && elapsed < duration) {
        rafId = requestAnimationFrame(tick);
      } else {
        hide();
      }
    };
    const hide = () => {
      stopped = true;
      el.style.animation = "toastOut 180ms ease forwards";
      setTimeout(() => el.remove(), 200);
    };
    let rafId = requestAnimationFrame(tick);
    close.addEventListener("click", hide);
    el.addEventListener("mouseenter", () => {
      stopped = true;
    });
    el.addEventListener("mouseleave", () => {
      if (bar.style.transform) {
        start =
          performance.now() -
          duration *
            (1 - parseFloat(bar.style.transform.replace("scaleX(", "")));
        stopped = false;
        rafId = requestAnimationFrame(tick);
      }
    });
    return { hide };
  }

  function isStaticLocalHost() {
    return (
      typeof location !== "undefined" &&
      (location.protocol === "file:" ||
        /^(localhost|127\.0\.0\.1)$/i.test(location.hostname || ""))
    );
  }

  // ─────────────────────────────────────────────
  // UPDATE LEAD API (from leads page)
  // ─────────────────────────────────────────────
  function friendlyApiError(prefix, details = "") {
    const message = String(details || "").trim();
    return message ? `${prefix}: ${message}` : prefix;
  }

  function normalizeUpdateResponse(data, rawText = "") {
    const raw = String(rawText || "").trim();
    if (
      data === 0 ||
      data?.status === 0 ||
      raw === "0" ||
      data === false ||
      data == null ||
      data?.success === false ||
      data?.status === false ||
      String(data?.status || "").toLowerCase() === "error" ||
      raw.toLowerCase() === "false"
    ) {
      throw new Error(data?.message || data?.error || raw || "Backend returned false");
    }
    return data;
  }

  function buildLeadUpdatePayload(lead, overrides = {}) {
    const leadId = String(overrides.id ?? overrides.lead_id ?? lead?.id ?? "").trim();
    const normalizedErstberatung = normalizeErstberatungValue(
      overrides.erstberatung_telefon ?? lead?.erstberatung_telefon ?? "",
    );
    return {
      id: leadId,
      lead_id: leadId,
      status: overrides.status ?? lead?.status ?? "",
      sale_typ: overrides.sale_typ ?? overrides.salesTyp ?? lead?.salesTyp ?? "",
      bearbeiter: overrides.bearbeiter ?? lead?.bearbeiter ?? "",
      name: overrides.name ?? lead?.name ?? "",
      salutation: overrides.salutation ?? lead?.salutation ?? "",
      erstberatung_telefon: normalizedErstberatung,
      erstberatungTelefon: normalizedErstberatung,
      briefberatung_telefon: normalizedErstberatung,
      briefberatungTelefon: normalizedErstberatung,
      strasse_objekt: overrides.strasse_objekt ?? lead?.strasse ?? "",
      angebot: overrides.angebot ?? lead?.angebot ?? "",
      plz: overrides.plz ?? lead?.plz ?? "",
      ort: overrides.ort ?? lead?.ort ?? "",
      telefon: overrides.telefon ?? lead?.telefon ?? "",
      email: overrides.email ?? lead?.email ?? "",
      einschaetzung_kunde:
        overrides.einschaetzung_kunde ?? overrides.qualification ?? lead?.qualification ?? "",
      lead_quelle: overrides.lead_quelle ?? overrides.quelle ?? lead?.quelle ?? "",
      kontakt_via: overrides.kontakt_via ?? overrides.kontaktVia ?? lead?.kontaktVia ?? "",
      datum: overrides.datum ?? lead?.datum ?? "",
      nachfassen: overrides.nachfassen ?? lead?.nachfassen ?? "",
      summe_netto:
        overrides.summe_netto ??
        (lead?.summe ? String(lead.summe).replace(/^\$\s*/, "").trim() : ""),
      dachflaeche_m2: overrides.dachflaeche_m2 ?? lead?.dachflaeche ?? "",
      dachneigung_grad: overrides.dachneigung_grad ?? lead?.dachneigung ?? "",
      dacheindeckung: overrides.dacheindeckung ?? lead?.dacheindeckung ?? "",
      wunsch_farbe: overrides.wunsch_farbe ?? lead?.farbe ?? "",
      dachpfanne: overrides.dachpfanne ?? lead?.dachpfanne ?? "",
      baujahr_dach: overrides.baujahr_dach ?? lead?.dachalter ?? "",
      zusaetzliche_extras: overrides.zusaetzliche_extras ?? lead?.zusatzExtras ?? "",
      delegieren: overrides.delegieren ?? lead?.delegieren ?? "",
    };
  }

  async function updateLeadOnAPI(id, payload) {
    const leadId = String(id ?? payload?.lead_id ?? payload?.id ?? "").trim();
    if (!leadId || leadId === "null" || leadId === "undefined") {
      throw new Error("Lead ID fehlt");
    }

    const normalizeDate = (value) => {
      const raw = String(value || "").trim();
      if (!raw || raw === "—" || raw === "0000-00-00") return "";
      const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
      return match ? match[1] : raw;
    };

    const normalizedErstberatung = normalizeErstberatungValue(payload.erstberatung_telefon || "");

    const mappedPayload = {
      id: leadId,
      lead_id: leadId,
      status: payload.status || "",
      sale_typ: payload.sale_typ || "",
      bearbeiter: payload.bearbeiter || "",
      name: payload.name || "",
      salutation: payload.salutation || "",
      erstberatung_telefon: normalizedErstberatung,
      erstberatungTelefon: normalizedErstberatung,
      briefberatung_telefon: normalizedErstberatung,
      briefberatungTelefon: normalizedErstberatung,
      strasse_objekt: payload.strasse_objekt || "",
      angebot: payload.angebot || "",
      plz: payload.plz || "",
      ort: payload.ort || "",
      telefon: payload.telefon || "",
      email: payload.email || "",
      einschaetzung_kunde: payload.einschaetzung_kunde || "",
      lead_quelle: payload.lead_quelle || "",
      kontakt_via: payload.kontakt_via || payload.kontaktVia || "",
      datum: normalizeDate(payload.datum),
      nachfassen: normalizeDate(payload.nachfassen),
      summe_netto: payload.summe_netto || "",
      dachflaeche_m2: payload.dachflaeche_m2 || "",
      dachneigung_grad: payload.dachneigung_grad || "",
      dacheindeckung: payload.dacheindeckung || "",
      wunsch_farbe: payload.wunsch_farbe || "",
      dachpfanne: payload.dachpfanne || "",
      baujahr_dach: payload.baujahr_dach || "",
      zusaetzliche_extras: payload.zusaetzliche_extras || "",
      delegieren: payload.delegieren || "",
    };

    Object.keys(mappedPayload).forEach((key) => {
      if (mappedPayload[key] === undefined || mappedPayload[key] === null) {
        delete mappedPayload[key];
      }
    });

    const formData = new URLSearchParams();
    Object.entries(mappedPayload).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        formData.append(key, String(value));
      }
    });

    console.log("Update payload preview:", mappedPayload);
    console.log("Update payload form data:", formData.toString());

    try {
      if (isStaticLocalHost()) throw new Error("Static localhost without /api");

      const response = await fetch(UPDATE_API_SAME, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(mappedPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { status: "success", raw: text };
      }

      const normalized = normalizeUpdateResponse(data, text);
      console.log("Update response (same-origin):", normalized);
      return normalized;
    } catch (error) {
      console.warn("Same-origin update failed, trying proxy:", error.message);
    }

    const proxyEndpoints = [UPDATE_API_PROXY, UPDATE_API_ALT_PROXY];
    for (const endpoint of proxyEndpoints) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          data = { status: "success", raw: text };
        }

        const normalized = normalizeUpdateResponse(data, text);
        console.log("Update response (proxy):", normalized);
        return normalized;
      } catch (error) {
        console.warn("Update proxy failed:", endpoint, error.message);
      }
    }

    throw new Error(
      friendlyApiError("Update fehlgeschlagen", "Kein erreichbarer Update-Endpunkt verfügbar"),
    );
  }

  // ─────────────────────────────────────────────
  // ACTIVITY API (from leads page)
  // ─────────────────────────────────────────────
  function isInvalidActivityActor(value) {
    const normalized = String(value || "").trim().toLowerCase();
    return (
      !normalized ||
      normalized === "???" ||
      normalized === "?" ||
      normalized === "created_by" ||
      normalized === "system" ||
      normalized === "null" ||
      normalized === "undefined"
    );
  }

  function resolveActivityActor(preferred = "") {
    const candidates = [preferred, bearbeiterFilter];
    for (const value of candidates) {
      const normalized = String(value || "").trim();
      if (!isInvalidActivityActor(normalized)) return normalized;
    }
    return "";
  }

  function resolveActivityActorForLead(leadId, preferred = "") {
    const key = String(leadId);
    const lead = leadsData.find((l) => String(l.id) === key);
    const pending = pendingUpdates.get(key) || {};
    const candidates = [
      preferred,
      pending.bearbeiter,
      lead?.bearbeiter,
      pending.delegieren,
      lead?.delegieren,
      bearbeiterFilter,
    ];

    for (const value of candidates) {
      const actor = resolveActivityActor(value);
      if (actor) return actor;
    }

    return "Bearbeiter unbekannt";
  }

  function rewriteActivityTextActor(text, actor) {
    const safeText = String(text || "").trim();
    const safeActor = resolveActivityActor(actor) || "Bearbeiter unbekannt";
    if (!safeText) return safeText;
    return safeText
      .replace(/^created_by\b/i, safeActor)
      .replace(/^system\b/i, safeActor);
  }

  function syncEditPermissionState(leadId, enabled) {
    const key = String(leadId);
    if (enabled) checkedEdit.add(key);
    else checkedEdit.delete(key);

    const editCheckbox = document.querySelector(`.edit-cb[data-id="${leadId}"]`);
    if (editCheckbox) editCheckbox.checked = !!enabled;

    const editBtn =
      editCheckbox?.parentElement?.querySelector(".edit-icon-btn") ||
      document.querySelector(`.edit-cb[data-id="${leadId}"]`)?.parentElement?.querySelector(".edit-icon-btn");
    if (editBtn) editBtn.disabled = !enabled;
  }

  function normalizeErstberatungValue(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized) return "";
    if (normalized === "wahr" || normalized === "true" || normalized === "1") {
      return "WAHR";
    }
    if (normalized === "falsch" || normalized === "false" || normalized === "0") {
      return "FALSCH";
    }
    return String(value || "").trim();
  }

  function getTeleconsultationSelection(leadId) {
    const key = String(leadId);
    const cached = teleconsultationSelections.get(key);
    if (cached === "true" || cached === "false") return cached;

    const lead = leadsData.find((item) => String(item.id) === key);
    const current = normalizeErstberatungValue(lead?.erstberatung_telefon);
    if (current === "WAHR") return "true";
    if (current === "FALSCH") return "false";
    return "";
  }

  function isErstberatungChecked(lead) {
    return getTeleconsultationSelection(lead?.id) === "true";
  }

async function insertActivity(leadId, activityType, activityText, meta = {}) {
  const actor = resolveActivityActorForLead(
    leadId,
    meta.bearbeiter || meta.from || meta.user || meta.author,
  );
  const normalizedText = rewriteActivityTextActor(activityText, actor);

  const payload = {
    lead_id: leadId,
    from: actor,
    description: normalizedText,
    activity_type: activityType,
    activity_text: normalizedText,
    action: activityType,
    user: actor,
    created_by: actor,
    phone: meta.phone || "",
    email: meta.email || "",
    lead_name: meta.leadName || "",
    timestamp: new Date().toISOString(),
  };

  console.log("Activity insert payload:", payload);

  const params = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null) params.append(k, String(v));
  });

  try {
    if (isStaticLocalHost()) throw new Error("Static localhost without /api");
    const res = await fetch(INSERT_ACTIVITY_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data && (data.status === "success" || data.success === true)) {
      return data;
    }
    return data;
  } catch (err) {
    if (isStaticLocalHost()) {
      console.info("Skipping same-origin activity insert on static localhost; using proxy");
    } else {
      console.warn("Activity insert via same-origin failed, trying proxy...", err.message);
    }

    try {
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(INSERT_ACTIVITY_DIRECT)}`;
      const res = await fetch(proxyUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        return { status: "success", raw: text };
      }
    } catch (proxyErr) {
      console.error("Activity insert failed:", proxyErr);
      throw new Error(`Aktivit??t konnte nicht gespeichert werden: ${proxyErr.message}`);
    }
  }
}

  function addOptimisticActivity(leadId, activity) {
    const key = String(leadId);
    const existing = activityCache.get(key) || [];
    const merged = [activity, ...existing];
    activityCache.set(key, merged);
  }

  // ─────────────────────────────────────────────
  // NOTES API (from leads page)
  // ─────────────────────────────────────────────
  const INSERT_NOTE_DIRECT = "https://goarrow.ai/test/insert_lead_note.php";
  const NOTES_INSERT_SAME = "/api/insert_lead_note";

  async function createNoteForLead(leadId, text) {
    const body = { lead_id: leadId, note: text, text };
    const params = new URLSearchParams();
    Object.entries(body).forEach(([k, v]) => {
      if (v !== undefined && v !== null) params.append(k, String(v));
    });
    try {
      if (isStaticLocalHost()) throw new Error("Static localhost without /api");
      const res = await fetch(NOTES_INSERT_SAME, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data;
    } catch (err) {
      try {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(INSERT_NOTE_DIRECT)}`;
        const res = await fetch(proxyUrl, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const textResp = await res.text();
        try {
          return JSON.parse(textResp);
        } catch {
          return { status: "success", raw: textResp };
        }
      } catch (proxyErr) {
        throw new Error(`Notiz konnte nicht gespeichert werden: ${proxyErr.message}`);
      }
    }
  }

  // ─────────────────────────────────────────────
  // EXISTING FUNCTIONS
  // ─────────────────────────────────────────────
  function httpGetJson(url, controller) {
    return fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller?.signal,
    }).then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { success: true, data };
    });
  }

  function fetchDelayed(url, delayMs, controller) {
    return new Promise((resolve, reject) => {
      const start = () => {
        httpGetJson(url, controller).then(resolve).catch(reject);
      };
      if (delayMs > 0) setTimeout(start, delayMs);
      else start();
    });
  }

  async function fetchFirstAvailable(urlsWithDelay) {
    const controllers = urlsWithDelay.map(() => new AbortController());
    const promises = urlsWithDelay.map((cfg, idx) =>
      fetchDelayed(cfg.url, cfg.delay || 0, controllers[idx])
    );

    try {
      const result = await Promise.any(promises);
      controllers.forEach((c) => {
        try { c.abort(); } catch {}
      });
      return result;
    } catch (err) {
      return { success: false, error: "All endpoints failed" };
    }
  }

  function getRemoteJsonProxyUrls(targetUrl) {
    return [`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`];
  }

  async function fetchNotesForLead(leadId) {
    if (notesCache.has(String(leadId))) {
      return notesCache.get(String(leadId));
    }

    const normalizeNotes = (data) => {
      const list = Array.isArray(data) ? data : (data?.data || data?.notes || []);
      return (list || []).map((n) => ({
        text: String(n.text || n.note || n.message || ''),
        author: String(n.author || n.user || 'Created at'),
        date: String(n.date || n.created_at || ''),
      }));
    };

    if (shouldTrySameOriginApi()) {
      try {
        const res = await fetch(`${NOTES_FETCH_SAME}?lead_id=${encodeURIComponent(leadId)}`, {
          headers: { Accept: 'application/json' }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const normalized = normalizeNotes(await res.json());
        notesCache.set(String(leadId), normalized);
        return normalized;
      } catch {}
    }

    const target = `https://goarrow.ai/test/fetch_lead_notes.php?lead_id=${encodeURIComponent(leadId)}`;
    for (const url of getRemoteJsonProxyUrls(target)) {
      try {
        const r = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const normalized = normalizeNotes(await r.json()).map((n) => ({
          ...n,
          author: n.author || 'System',
        }));
        notesCache.set(String(leadId), normalized);
        return normalized;
      } catch {}
    }
    return [];
  }

async function fetchActivityForLead(leadId) {
    if (activityCache.has(String(leadId))) {
      return activityCache.get(String(leadId));
    }
    
    const normalize = (a) => {
      let text = a.text || a.activity || a.action || a.event || a.message || a.desc || a.description || '';
      let by = a.from || a.by || a.user || a.username || a.author || a.created_by || '';
      if (isInvalidActivityActor(by)) {
        by = resolveActivityActorForLead(leadId, by);
      }
      text = rewriteActivityTextActor(text, by);
      let at = a.at || a.datetime || a.timestamp || a.date_time || a.date || a.created_at || '';
      if (!at) {
        const d = a.activity_date || a.activityDate || a.date;
        const t = a.activity_time || a.activityTime || a.time;
        if (d || t) at = `${d || ''}${d && t ? ' ' : ''}${t || ''}`.trim();
      }
      return {
        text: String(text || ''),
        by: String(by || 'Bearbeiter unbekannt'),
        at: String(at || ''),
      };
    };

    async function tryFetch(url) {
      const r = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const list = Array.isArray(data) ? data : (data.data || data.activity || data.items || []);
      return (list || []).map(normalize);
    }

    if (shouldTrySameOriginApi()) {
      try {
        let list = await tryFetch(`${ACTIVITY_FETCH_SAME}?lead_id=${encodeURIComponent(leadId)}`);
        if (!list.length) {
          list = await tryFetch(`${ACTIVITY_FETCH_SAME}?id=${encodeURIComponent(leadId)}`);
        }
        if (list.length) {
          activityCache.set(String(leadId), list);
          return list;
        }
      } catch {}
    }

    const base = 'https://goarrow.ai/test/fetch_activity.php';
    const targets = [`${base}?lead_id=${encodeURIComponent(leadId)}`];
    for (const target of targets) {
      for (const url of getRemoteJsonProxyUrls(target)) {
        try {
          const list = await tryFetch(url);
          if (list.length) {
            activityCache.set(String(leadId), list);
            return list;
          }
        } catch {}
      }
    }
    return [];
}

  async function fetchLeads() {
    const result = await fetchFirstAvailable(
      getResilientFetchEndpoints(SO_LEADS, REMOTE_LEADS_URL)
    );
    if (!result.success || !result.data) {
      const cached = loadJsonCache(KUNDEN_LEADS_CACHE_KEY);
      if (cached) {
        console.warn("Using cached leads data because all live endpoints failed.");
        const rawCachedList = Array.isArray(cached)
          ? cached
          : (cached.data || cached.leads || cached.items || []);
        return applyPendingUpdates((rawCachedList || []).map((apiLead) => ({
          id: apiLead.id,
          name: apiLead.name || "â€”",
          salutation: apiLead.salutation || "",
          ort: apiLead.ort || "â€”",
          status: STATUS_MAPPING[apiLead.status] || apiLead.status || "Offen",
          statusClass: getStatusClass(apiLead.status),
          quelle: apiLead.lead_quelle || "â€”",
          bearbeiter: apiLead.bearbeiter || "â€”",
          summe: apiLead.summe_netto ? `$ ${formatNumber(apiLead.summe_netto)}` : "$ 0,00",
          datum: apiLead.created_at ? apiLead.created_at.split(" ")[0] : apiLead.datum || "â€”",
          dachflaeche: apiLead.dachflaeche_m2 || "",
          dacheindeckung: apiLead.dacheindeckung || "",
          dachalter: apiLead.baujahr_dach || "",
          dachpfanne: apiLead.dachpfanne || "",
          farbe: apiLead.wunsch_farbe || "",
          dachneigung: apiLead.dachneigung_grad ? `${apiLead.dachneigung_grad}Â°` : "",
          strasse: apiLead.strasse_objekt || "",
          telefon: apiLead.telefon || "",
          email: apiLead.email || "",
          nachfassen: apiLead.nachfassen,
// In fetchLeads function, already present - line ~1070
          erstberatung_telefon: normalizeErstberatungValue(apiLead.erstberatung_telefon || ""),
          delegieren: apiLead.delegieren || "—",
          plz: apiLead.plz || "",
          angebot: apiLead.angebot || "",
          qualification: apiLead.einschaetzung_kunde || "",
          kontaktVia: apiLead.kontakt_via || "",
          zusatzExtras: apiLead.zusaetzliche_extras || "",
          salesTyp: apiLead.sale_typ || "",
          notes: [],
          activities: [],
        })));
      }
      console.error("Failed to fetch leads:", result.error);
      return [];
    }

    saveJsonCache(KUNDEN_LEADS_CACHE_KEY, result.data);

    const rawList = Array.isArray(result.data)
      ? result.data
      : (result.data.data || result.data.leads || result.data.items || []);

    return applyPendingUpdates((rawList || []).map((apiLead) => ({
      id: apiLead.id,
      name: apiLead.name || "—",
      salutation: apiLead.salutation || "",
      ort: apiLead.ort || "—",
      status: STATUS_MAPPING[apiLead.status] || apiLead.status || "Offen",
      statusClass: getStatusClass(apiLead.status),
      quelle: apiLead.lead_quelle || "—",
      bearbeiter: apiLead.bearbeiter || "—",
      summe: apiLead.summe_netto
        ? `$ ${formatNumber(apiLead.summe_netto)}`
        : "$ 0,00",
      datum: apiLead.created_at
        ? apiLead.created_at.split(" ")[0]
        : apiLead.datum || "—",
      dachflaeche: apiLead.dachflaeche_m2 || "",
      dacheindeckung: apiLead.dacheindeckung || "",
      dachalter: apiLead.baujahr_dach || "",
      dachpfanne: apiLead.dachpfanne || "",
      farbe: apiLead.wunsch_farbe || "",
      dachneigung: apiLead.dachneigung_grad
        ? `${apiLead.dachneigung_grad}°`
        : "",
      strasse: apiLead.strasse_objekt || "",
      telefon: apiLead.telefon || "",
      email: apiLead.email || "",
      nachfassen: apiLead.nachfassen,
      erstberatung_telefon: normalizeErstberatungValue(apiLead.erstberatung_telefon || ""),
      delegieren: apiLead.delegieren,
      plz: apiLead.plz || "",
      angebot: apiLead.angebot || "",
      qualification: apiLead.einschaetzung_kunde || "",
      kontaktVia: apiLead.kontakt_via || "",
      zusatzExtras: apiLead.zusaetzliche_extras || "",
      salesTyp: apiLead.sale_typ || "",
      notes: [],
      activities: [],
    })));
  }

  async function fetchDashboardStats() {
    const result = await fetchFirstAvailable(
      getResilientFetchEndpoints(SO_DASHBOARD, REMOTE_DASHBOARD_URL)
    );

    if (!result.success || !result.data) {
      const cached = loadJsonCache(KUNDEN_DASHBOARD_CACHE_KEY);
      if (cached && typeof cached === "object") {
        console.warn("Using cached dashboard stats because live endpoints failed.");
        return cached;
      }
      console.error("Failed to fetch dashboard stats:", result.error);
      return {};
    }

    saveJsonCache(KUNDEN_DASHBOARD_CACHE_KEY, result.data);

    if (result.data.data && typeof result.data.data === 'object') return result.data.data;
    if (typeof result.data === 'object') return result.data;
    return {};
  }

 async function loadAllData() {
  if (isLoading) return;
  isLoading = true;

  const tbody = document.getElementById("kunden-tbody");
  if (tbody) {
    tbody.innerHTML = `<td colspan="14"><div class="empty-state">⏳ Daten werden geladen...</div>`;
  }

  fetchLeads()
    .then((leads) => {
      leadsData = leads;
      fullLeadsData = leads;
      populateFilterOptions();
      protectFilterDropdowns();  // Add this line here
      renderKunden();
    })
    .catch((e) => {
      console.error("Leads load failed", e);
      if (tbody) {
        tbody.innerHTML = `<td colspan="14"><div class="empty-state">❌ Fehler beim Laden der Leads.</div>`;
      }
      showToast("Kunden Daten konnten live nicht geladen werden.", "error", 3000);
    })
    .finally(() => {
      isLoading = false;
    });

  fetchDashboardStats()
    .then((stats) => {
      dashboardStats = stats;
      renderStats();
    })
    .catch((e) => {
      console.warn("Dashboard stats load failed", e);
    });
}

// Protect filter dropdowns from being modified by other scripts
// Protect filter dropdowns from being modified by other scripts
function protectFilterDropdowns() {
  // Protect bearbeiter filter
  const bearbeiterSelect = document.getElementById("filter-bearbeiter");
  if (bearbeiterSelect) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // Check if incorrect options were added
          let hasIncorrectOption = false;
          const validValues = ["", "Philipp", "Martin", "André", "Simon"];
          for (let i = 0; i < bearbeiterSelect.options.length; i++) {
            const opt = bearbeiterSelect.options[i];
            if (!validValues.includes(opt.value) && opt.value !== "") {
              hasIncorrectOption = true;
              break;
            }
          }
          if (hasIncorrectOption) {
            // Reset to fixed options
            const currentValue = bearbeiterSelect.value;
            bearbeiterSelect.innerHTML = '<option value="">Alle Bearbeiter</option>';
            const fixedBearbeiter = ["Philipp", "Martin", "André", "Simon"];
            fixedBearbeiter.forEach(name => {
              const option = document.createElement("option");
              option.value = name;
              option.textContent = name;
              bearbeiterSelect.appendChild(option);
            });
            if (fixedBearbeiter.includes(currentValue)) {
              bearbeiterSelect.value = currentValue;
            }
          }
        }
      });
    });
    observer.observe(bearbeiterSelect, { childList: true, subtree: true });
  }

  // Protect delegieren filter
  const delegierenSelect = document.getElementById("filter-delegieren");
  if (delegierenSelect) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // Check if incorrect options were added
          let hasIncorrectOption = false;
          const validValues = ["", "Philipp", "Martin", "André", "Simon"];
          for (let i = 0; i < delegierenSelect.options.length; i++) {
            const opt = delegierenSelect.options[i];
            if (!validValues.includes(opt.value) && opt.value !== "") {
              hasIncorrectOption = true;
              break;
            }
          }
          if (hasIncorrectOption) {
            // Reset to fixed options
            const currentValue = delegierenSelect.value;
            delegierenSelect.innerHTML = '<option value="">Alle Delegieren</option>';
            const fixedDelegieren = ["Philipp", "Martin", "André", "Simon"];
            fixedDelegieren.forEach(name => {
              const option = document.createElement("option");
              option.value = name;
              option.textContent = name;
              delegierenSelect.appendChild(option);
            });
            if (fixedDelegieren.includes(currentValue)) {
              delegierenSelect.value = currentValue;
            }
          }
        }
      });
    });
    observer.observe(delegierenSelect, { childList: true, subtree: true });
  }
}

  function populateFilterOptions() {
    const uniqueStatuses = [
      ...new Set(
        leadsData
          .map((lead) => String(lead.status || "").trim())
          .filter((value) => value && value !== "???" && value !== "?"),
      ),
    ];
    const statusSelect = document.getElementById("filter-status");
    if (statusSelect) {
      const currentValue = statusSelect.value;
      statusSelect.innerHTML =
        '<option value="">Alle Status</option>' +
        uniqueStatuses
          .map(
            (status) =>
              '<option value="' +
              escapeHtml(status) +
              '">' +
              escapeHtml(status) +
              "</option>",
          )
          .join("");
      if (uniqueStatuses.includes(currentValue)) statusSelect.value = currentValue;
    }

    const uniqueSources = [
      ...new Set(
        leadsData
          .map((lead) => String(lead.quelle || "").trim())
          .filter((value) => value && value !== "???" && value !== "?"),
      ),
    ];
    const sourceSelect = document.getElementById("filter-source");
    if (sourceSelect) {
      const currentValue = sourceSelect.value;
      sourceSelect.innerHTML =
        '<option value="">Alle Quellen</option>' +
        uniqueSources
          .map(
            (source) =>
              '<option value="' +
              escapeHtml(source) +
              '">' +
              escapeHtml(source) +
              "</option>",
          )
          .join("");
      if (uniqueSources.includes(currentValue)) sourceSelect.value = currentValue;
    }

    const bearbeiterSelect = document.getElementById("filter-bearbeiter");
    if (bearbeiterSelect) {
      const currentValue = bearbeiterSelect.value;
      bearbeiterSelect.innerHTML =
        '<option value="">Alle Bearbeiter</option>' +
        BEARBEITER_OPTIONS
          .map(
            (value) =>
              '<option value="' +
              escapeHtml(value) +
              '">' +
              escapeHtml(value) +
              "</option>",
          )
          .join("");
      if (BEARBEITER_OPTIONS.includes(currentValue)) bearbeiterSelect.value = currentValue;
    }

    const delegierenSelect = document.getElementById("filter-delegieren");
    if (delegierenSelect) {
      const currentValue = delegierenSelect.value;
      delegierenSelect.innerHTML =
        '<option value="">Alle Delegieren</option>' +
        BEARBEITER_OPTIONS
          .map(
            (value) =>
              '<option value="' +
              escapeHtml(value) +
              '">' +
              escapeHtml(value) +
              "</option>",
          )
          .join("");
      if (BEARBEITER_OPTIONS.includes(currentValue)) delegierenSelect.value = currentValue;
    }
  }

  function applyFilters() {
    renderKunden();
  }

  function resetFilters() {
    statusFilter = "";
    leadSourceFilter = "";
    ortSearchTerm = "";
    bearbeiterFilter = "";
    delegierenFilter = "";

    const statusSelect = document.getElementById("filter-status");
    const sourceSelect = document.getElementById("filter-source");
    const ortInput = document.getElementById("filter-ort");
    const bearbeiterSelect = document.getElementById("filter-bearbeiter");
    const delegierenSelect = document.getElementById("filter-delegieren");

    if (statusSelect) statusSelect.value = "";
    if (sourceSelect) sourceSelect.value = "";
    if (ortInput) ortInput.value = "";
    if (bearbeiterSelect) bearbeiterSelect.value = "";
    if (delegierenSelect) delegierenSelect.value = "";

    renderKunden();
  }

  function formatNumber(num) {
    if (!num || num === "0.00") return "0,00";
    return parseFloat(num).toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function getStatusClass(status) {
    const statusLower = (status || "").toLowerCase();
    if (statusLower === "follow up") return "badge-follow";
    if (statusLower === "offen") return "badge-offen";
    if (
      statusLower === "infos eingeholt" ||
      statusLower === "nur info eingeholt"
    )
      return "badge-info";
    if (
      statusLower === "beauftragung" ||
      statusLower === "ea beauftragung" ||
      statusLower === "nf beauftragung"
    )
      return "badge-beauft";
    if (statusLower === "in bearbeitung") return "badge-bearbeitung";
    return "badge-offen";
  }

  function isInBearbeitungStatus(status) {
    return String(status || "").trim().toLowerCase() === "in bearbeitung";
  }

  function shouldShowPhoneIcon() {
    if (kundenActiveFilter === "bearbeitung") return false;
    if (kundenActiveFilter === "beauft") return false;
    return true;
  }

  function shouldShowEmailIcon() {
    if (kundenActiveFilter === "offen") return false;
    if (kundenActiveFilter === "beauft") return false;
    return true;
  }

  function getStatDefinitions() {
    return [
      {
        key: "offen",
        label: "Offen",
        icon: "📞",
        count: dashboardStats.Offen || 0,
        filter: (l) => l.status === "Offen",
      },
      {
        key: "bearbeitung",
        label: "in Bearbeitung",
        icon: "📞",
        count: dashboardStats["in Bearbeitung"] || 0,
        filter: (l) => isInBearbeitungStatus(l.status),
      },
      {
        key: "followup",
        label: "follow up",
        icon: "📞",
        count: dashboardStats["follow up"] || 0,
        filter: (l) => l.status === "follow up",
      },
      {
        key: "auftrags",
        label: "Auftragsbestätigung",
        icon: "📞",
        count: 0,
        filter: (l) => l.status === "Auftragsbestätigung",
      },
      {
        key: "beauft",
        label: "Beauftragung",
        isMulti: true,
        counts: {
          beauftragung: dashboardStats.Beauftragung || 0,
          eaBeauftragung: dashboardStats["EA Beauftragung"] || 0,
          nfBeauftragung: dashboardStats["NF Beauftragung"] || 0,
        },
        filter: (l) =>
          ["Beauftragung", "EA Beauftragung", "NF Beauftragung"].includes(
            l.status,
          ),
      },
    ];
  }

  function renderStats() {
    const el = document.getElementById("kunden-stats");
    if (!el) return;

    const statDefs = getStatDefinitions();
    let html = "";

    statDefs.forEach((def) => {
      const isActive = kundenActiveFilter === def.key;

      if (def.isMulti) {
        html += `<div class="kstat-card${isActive ? " active" : ""}" onclick="window.setKundenFilter('${def.key}')" style="min-width: 190px; flex: 1.5">
          <div class="kstat-active-dot"></div>
          <div class="kstat-lbl">${def.label}</div>
          <div class="kstat-multi">
            <div class="kstat-multi-row"><span>Beauftragung</span><span>${def.counts.beauftragung}</span></div>
            <div class="kstat-multi-row"><span>EA Beauftragung</span><span>${def.counts.eaBeauftragung}</span></div>
            <div class="kstat-multi-row"><span>NF Beauftragung</span><span>${def.counts.nfBeauftragung}</span></div>
          </div>
        </div>`;
      } else {
        html += `<div class="kstat-card${isActive ? " active" : ""}" onclick="window.setKundenFilter('${def.key}')">
          <div class="kstat-active-dot"></div>
          <div class="kstat-lbl">${def.label}</div>
          <div class="kstat-val">${def.count}</div>
        </div>`;
      }
    });

    el.innerHTML = html;
  }

  function updateMassEmailButton() {
    const massEmailBtn = document.getElementById("mass-email-btn");
    const selectedCount = selectedKunden.size;
    
    if (massEmailBtn) {
      if (selectedCount > 0) {
        massEmailBtn.style.display = "flex";
        massEmailBtn.innerHTML = `
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <path d="m22 7-10 7L2 7"/>
          </svg>
          Senden Sie Massen-E-Mails (${selectedCount})
        `;
      } else {
        massEmailBtn.style.display = "none";
      }
    }
  }

  async function triggerBulkEmailWebhook({ emails, names, action, source }) {
    const payload = {
      emails: emails.join(","),
      names: names.join(","),
      action: action || "",
      source: source || "",
    };
    const params = new URLSearchParams(payload);
    const webhookUrl = `${BULK_EMAIL_WEBHOOK_URL}?${params.toString()}`;

    console.log("Kunden bulk email webhook payload:", payload);
    console.log("Kunden bulk email webhook URL:", webhookUrl);

    try {
      const response = await fetch(webhookUrl, {
        method: "GET",
        cache: "no-store",
      });
      const responseText = await response.text();

      console.log(
        "Kunden bulk email webhook status:",
        response.status,
        response.statusText,
      );
      console.log("Kunden bulk email webhook response:", responseText);

      if (!response.ok) {
        throw new Error(`Webhook HTTP ${response.status}: ${responseText}`);
      }

      return {
        success: true,
        status: response.status,
        responseText,
      };
    } catch (error) {
      console.warn("Kunden bulk email webhook failed:", error);
      throw new Error(error.message || "Bulk email webhook call fehlgeschlagen");
    }
  }

  function openMassEmailModal() {
    if (selectedKunden.size === 0) return;
    
    const selectedLeads = leadsData.filter(lead => selectedKunden.has(lead.id));
    
    const modalHtml = `
      <div id="massEmailModal" class="k-modal-overlay">
        <div class="k-modal-content" style="max-width: 650px;">
          <div class="k-modal-header">
            <h3>Senden Sie Massen-E-Mails</h3>
            <button class="k-close-btn" id="closeMassEmailModal">&times;</button>
          </div>
          <div class="k-modal-body">
            <div class="form-group" style="margin-bottom: 20px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #0f172a;">Choose an E-Mail</label>
              <select id="email-template-select" class="k-full-select">
                <option value="E1">E1</option>
                <option value="E2">E2</option>
                <option value="E3">E3</option>
                <option value="E4">E4</option>
                <option value="E5">E5</option>
                <option value="E6">E6</option>
                <option value="E7">E7</option>
                <option value="E8">E8</option>
                <option value="E9">E9</option>
                <option value="E10">E10</option>
              </select>
            </div>
            
            <div class="form-group" style="margin-bottom: 20px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #0f172a;">Name</label>
              <div style="padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; color: #0f172a;">
                ${selectedLeads.map(lead => {
                  const displayName = (lead.salutation ? lead.salutation + " " : "") + lead.name;
                  return `<div style="margin-bottom: 5px;">${escapeHtml(displayName)}</div>`;
                }).join('')}
              </div>
            </div>
            
            <div class="form-group" style="margin-bottom: 20px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #0f172a;">E-Mail</label>
              <div style="padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; color: #0f172a;">
                ${selectedLeads.map(lead => {
                  return `<div style="margin-bottom: 5px;">${escapeHtml(lead.email || "—")}</div>`;
                }).join('')}
              </div>
            </div>
            
            <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px;">
              <button type="button" id="cancelMassEmail" class="k-btn-outline" style="padding: 10px 24px; border: 1px solid #e2e8f0; background: white; border-radius: 8px; cursor: pointer;">Abbrechen</button>
              <button type="button" id="sendMassEmail" class="k-btn-green" style="padding: 10px 24px;">E-Mail senden</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    const existingModal = document.getElementById("massEmailModal");
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = document.getElementById("massEmailModal");
    const closeBtn = document.getElementById("closeMassEmailModal");
    const cancelBtn = document.getElementById("cancelMassEmail");
    const sendBtn = document.getElementById("sendMassEmail");
    
    const closeModal = () => {
      modal.classList.remove('active');
      setTimeout(() => modal.remove(), 300);
    };
    
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    
    sendBtn?.addEventListener('click', async () => {
      const selectedTemplate = document.getElementById("email-template-select")?.value || "";
      const validEmailData = selectedLeads
        .map((lead) => ({
          id: lead.id,
          name: (lead.salutation ? lead.salutation + " " : "") + lead.name,
          email: String(lead.email || "").trim(),
          datum: lead.datum,
        }))
        .filter((lead) => lead.email);

      if (!selectedTemplate) {
        showToast("Bitte wählen Sie eine E-Mail-Vorlage aus", "error", 2200);
        return;
      }

      if (!validEmailData.length) {
        showToast("Keine gültigen E-Mail-Adressen vorhanden", "error", 2200);
        return;
      }

      const webhookRecipients = validEmailData.map((item) => item.email);
      const webhookRecipientNames = validEmailData.map((item) => item.name);
      const source = resolveActivityActor(selectedLeads[0]?.bearbeiter || "");
      const originalText = sendBtn.textContent || "E-Mail senden";

      if (!/^E(?:10|[1-9])$/.test(selectedTemplate)) {
        showToast("UngÃ¼ltige E-Mail-Vorlage", "error", 2200);
        return;
      }

      sendBtn.disabled = true;
      sendBtn.textContent = "Wird gesendet...";

      try {
        const webhookResult = await triggerBulkEmailWebhook({
          emails: webhookRecipients,
          names: webhookRecipientNames,
          action: selectedTemplate,
          source,
        });

        console.log("Kunden bulk email webhook success:", webhookResult);
        showToast(
          `${selectedTemplate} bulk email ${validEmailData.length} EmpfÃ¤nger ko send trigger ho gaya`,
          "success",
          3000,
        );
        closeModal();
        return;
      } catch (error) {
        showToast(
          error.message || "Bulk email send fehlgeschlagen",
          "error",
          3000,
        );
        return;
      } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = originalText;
      }

      const templateContent = {
        E1: { subject: "Kunden Update - E1", body: "Hallo,\n\nhier ist E-Mail Vorlage E1.\n\nViele Grüße" },
        E2: { subject: "Kunden Update - E2", body: "Hallo,\n\nhier ist E-Mail Vorlage E2.\n\nViele Grüße" },
        E3: { subject: "Kunden Update - E3", body: "Hallo,\n\nhier ist E-Mail Vorlage E3.\n\nViele Grüße" },
        E4: { subject: "Kunden Update - E4", body: "Hallo,\n\nhier ist E-Mail Vorlage E4.\n\nViele Grüße" },
        E5: { subject: "Kunden Update - E5", body: "Hallo,\n\nhier ist E-Mail Vorlage E5.\n\nViele Grüße" },
        E6: { subject: "Kunden Update - E6", body: "Hallo,\n\nhier ist E-Mail Vorlage E6.\n\nViele Grüße" },
        E7: { subject: "Kunden Update - E7", body: "Hallo,\n\nhier ist E-Mail Vorlage E7.\n\nViele Grüße" },
        E8: { subject: "Kunden Update - E8", body: "Hallo,\n\nhier ist E-Mail Vorlage E8.\n\nViele Grüße" },
        E9: { subject: "Kunden Update - E9", body: "Hallo,\n\nhier ist E-Mail Vorlage E9.\n\nViele Grüße" },
        E10: { subject: "Kunden Update - E10", body: "Hallo,\n\nhier ist E-Mail Vorlage E10.\n\nViele Grüße" },
      };

      const selectedTemplateContent = templateContent[selectedTemplate];
      if (!selectedTemplateContent) {
        showToast("Ungültige E-Mail-Vorlage", "error", 2200);
        return;
      }

      const recipients = validEmailData.map((item) => item.email);
      const composeBaseUrl = "https://hex2013.com/owa/?path=/mail/action/compose";
      const params = new URLSearchParams();

      if (recipients.length === 1) {
        params.set("to", recipients[0]);
      } else {
        params.set("bcc", recipients.join(";"));
      }

      params.set("subject", selectedTemplateContent.subject);
      params.set("body", selectedTemplateContent.body);

      const composeUrl = `${composeBaseUrl}&${params.toString()}`;
      const composeWindow = window.open(composeUrl, "_blank");
      if (!composeWindow) {
        showToast("E-Mail-Fenster konnte nicht geöffnet werden", "error", 2600);
        return;
      }

      showToast(`E-Mail-Fenster für ${validEmailData.length} Empfänger geöffnet`, "success", 3000);
      closeModal();
      return;
      
      const emailData = selectedLeads.map(lead => {
        return {
          id: lead.id,
          name: (lead.salutation ? lead.salutation + " " : "") + lead.name,
          email: lead.email,
          datum: lead.datum,
        };
      });
      
      const massEmailData = {
        template: selectedTemplate,
        recipients: emailData,
        date: new Date().toISOString()
      };
      
      console.log("Sending mass email:", massEmailData);
      alert(`E-Mails werden gesendet:\n\nTemplate: ${selectedTemplate}\nEmpfänger: ${emailData.length}\n\nDetails in Console einsehbar`);
      
      closeModal();
    });
    
    modal.classList.add('active');
  }

  function openTeleconsultationModal(leadId, checkboxElement) {
    const lead = leadsData.find(l => l.id === leadId);
    if (!lead) return;
    
    const currentSelection = teleconsultationSelections.get(leadId) || '';
    
    const modalHtml = `
      <div id="teleconsultationModal" class="k-modal-overlay">
        <div class="k-modal-content" style="max-width: 500px;">
          <div class="k-modal-header">
            <h3>Erstberatung Telefon</h3>
            <button class="k-close-btn" id="closeTeleModal">&times;</button>
          </div>
          <div class="k-modal-body">
            <div class="form-group" style="margin-bottom: 20px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #0f172a;">Wählen Sie eine Option:</label>
              <select id="teleconsultationSelect" class="k-full-select">
                <option value="">Bitte wählen</option>
                <option value="true" ${currentSelection === 'true' ? 'selected' : ''}>WAHR</option>
                <option value="false" ${currentSelection === 'false' ? 'selected' : ''}>FALSCH</option>
              </select>
            </div>
            
            <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px;">
              <button type="button" id="cancelTeleModal" class="k-btn-outline" style="padding: 10px 24px;">Abbrechen</button>
              <button type="button" id="updateTeleconsultation" class="k-btn-green" style="padding: 10px 24px;">Aktualisierung Beratung</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    const existingModal = document.getElementById("teleconsultationModal");
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = document.getElementById("teleconsultationModal");
    const closeBtn = document.getElementById("closeTeleModal");
    const cancelBtn = document.getElementById("cancelTeleModal");
    const updateBtn = document.getElementById("updateTeleconsultation");
    
    const closeModal = () => {
      modal.classList.remove('active');
      setTimeout(() => modal.remove(), 300);
    };
    
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    
    updateBtn?.addEventListener('click', () => {
      const selectedValue = document.getElementById("teleconsultationSelect")?.value;
      
      if (selectedValue === 'true') {
        if (checkboxElement && !checkboxElement.checked) {
          checkboxElement.checked = true;
          selectedKunden.add(leadId);
          updateCount();
          updateMassEmailButton();
        }
        
        const editCheckbox = document.querySelector(`.edit-cb[data-id="${leadId}"]`);
        if (editCheckbox && !editCheckbox.checked) {
          editCheckbox.checked = true;
          checkedEdit.add(String(leadId));
          const editBtn = editCheckbox.parentElement?.querySelector(".edit-icon-btn");
          if (editBtn) editBtn.disabled = false;
        }
        teleconsultationSelections.set(leadId, 'true');
      } else if (selectedValue === 'false') {
        if (checkboxElement && checkboxElement.checked) {
          checkboxElement.checked = false;
          selectedKunden.delete(leadId);
          updateCount();
          updateMassEmailButton();
        }
        
        const editCheckbox = document.querySelector(`.edit-cb[data-id="${leadId}"]`);
        if (editCheckbox && editCheckbox.checked) {
          editCheckbox.checked = false;
          checkedEdit.delete(String(leadId));
          const editBtn = editCheckbox.parentElement?.querySelector(".edit-icon-btn");
          if (editBtn) editBtn.disabled = true;
        }
        teleconsultationSelections.set(leadId, 'false');
      }
      
      console.log(`Teleconsultation for lead ${leadId} set to ${selectedValue}`);
      closeModal();
    });
    
    modal.classList.add('active');
  }

function openEditStatusModal(leadId) {
  const lead = leadsData.find((l) => String(l.id) === String(leadId));
  if (!lead) return;

  if (!checkedEdit.has(String(leadId)) && !isErstberatungChecked(lead)) {
    showToast("Bitte aktivieren Sie zuerst die Beratung mit WAHR", "error", 2500);
    return;
  }
  
  const getStatusModalConfig = () => {
    if (kundenActiveFilter === "bearbeitung") {
      return {
        title: "im Gange",
        placeholder: "Wählen Sie eine Option aus",
        options: BEARBEITUNG_STATUS_OPTIONS,
      };
    }

    if (kundenActiveFilter === "followup") {
      return {
        title: "Nachverfolgen",
        placeholder: "Wählen Sie eine Option...",
        options: FOLLOW_UP_STATUS_OPTIONS,
      };
    }

    if (kundenActiveFilter === "beauft") {
      return {
        title: "Beauftragung",
        placeholder: "Choose an Beauftragung",
        options: BEAUFTRAGUNG_STATUS_OPTIONS,
      };
    }

    return {
      title: "Status ändern",
      placeholder: "",
      options: client_STATUS_OPTIONS,
    };
  };

  const modalConfig = getStatusModalConfig();
  const selectedValue = modalConfig.options.includes(lead.status) ? lead.status : "";

  const modalHtml = `
    <div id="editStatusModal" class="k-modal-overlay">
      <div class="k-modal-content" style="max-width: 450px;">
        <div class="k-modal-header">
          <h3>${escapeHtml(modalConfig.title)}</h3>
          <button class="k-close-btn" id="closeEditStatusModal">&times;</button>
        </div>
        <div class="k-modal-body">
          <div class="form-group" style="margin-bottom: 20px;">
            <select id="editStatusSelect" class="k-full-select">
              ${modalConfig.placeholder ? `<option value="">${escapeHtml(modalConfig.placeholder)}</option>` : ""}
              ${modalConfig.options.map(opt => `<option value="${opt}" ${selectedValue === opt ? 'selected' : ''}>${opt}</option>`).join('')}
            </select>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px;">
            <button type="button" id="cancelEditStatus" class="k-btn-outline" style="padding: 10px 24px;">Abbrechen</button>
            <button type="button" id="saveEditStatus" class="k-btn-green" style="padding: 10px 24px;">Speichern</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  const existingModal = document.getElementById("editStatusModal");
  if (existingModal) existingModal.remove();
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  const modal = document.getElementById("editStatusModal");
  const closeBtn = document.getElementById("closeEditStatusModal");
  const cancelBtn = document.getElementById("cancelEditStatus");
  const saveBtn = document.getElementById("saveEditStatus");
  
  const closeModal = () => {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 300);
  };
  
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  
  saveBtn?.addEventListener('click', async () => {
    const newStatus = document.getElementById("editStatusSelect")?.value;
    const previousStatus = lead.status;

    if (!newStatus) {
      showToast("Bitte wählen Sie einen Status aus", "error", 2200);
      return;
    }

    if (newStatus === previousStatus) {
      closeModal();
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "Wird gespeichert...";

    try {
      const payload = buildLeadUpdatePayload(lead, {
        id: String(lead.id),
        lead_id: String(lead.id),
        status: newStatus,
      });

      await updateLeadOnAPI(lead.id, payload);

      // IMPORTANT: Update dashboard stats BEFORE updating the lead object
      // Map status to dashboard keys
      const getDashboardKey = (status) => {
        if (status === "follow up") return "follow up";
        if (status === "in Bearbeitung") return "in Bearbeitung";
        if (status === "Offen") return "Offen";
        if (status === "Nur Info eingeholt") return "Nur Info eingeholt";
        if (status === "falscher Kunde") return "falscher Kunde";
        return status;
      };
      
      const oldKey = getDashboardKey(previousStatus);
      const newKey = getDashboardKey(newStatus);
      
      // Update dashboard stats
      if (dashboardStats[oldKey] !== undefined) {
        dashboardStats[oldKey] = Math.max(0, (dashboardStats[oldKey] || 0) - 1);
      }
      if (dashboardStats[newKey] !== undefined) {
        dashboardStats[newKey] = (dashboardStats[newKey] || 0) + 1;
      } else {
        dashboardStats[newKey] = 1;
      }
      
      // Also update the multi-status counts for Beauftragung if needed
      if (previousStatus === "Beauftragung") {
        dashboardStats.Beauftragung = Math.max(0, (dashboardStats.Beauftragung || 0) - 1);
      } else if (previousStatus === "EA Beauftragung") {
        dashboardStats["EA Beauftragung"] = Math.max(0, (dashboardStats["EA Beauftragung"] || 0) - 1);
      } else if (previousStatus === "NF Beauftragung") {
        dashboardStats["NF Beauftragung"] = Math.max(0, (dashboardStats["NF Beauftragung"] || 0) - 1);
      }
      
      if (newStatus === "Beauftragung") {
        dashboardStats.Beauftragung = (dashboardStats.Beauftragung || 0) + 1;
      } else if (newStatus === "EA Beauftragung") {
        dashboardStats["EA Beauftragung"] = (dashboardStats["EA Beauftragung"] || 0) + 1;
      } else if (newStatus === "NF Beauftragung") {
        dashboardStats["NF Beauftragung"] = (dashboardStats["NF Beauftragung"] || 0) + 1;
      }

      // Update the lead object
      lead.status = newStatus;
      lead.statusClass = getStatusClass(newStatus);
      
      // Queue pending update
      queuePendingUpdate(lead.id, {
        status: newStatus,
        statusClass: lead.statusClass,
      });

      // Clear caches to force refresh
      activityCache.delete(String(lead.id));
      notesCache.delete(String(lead.id));
      
      console.log(`Lead ${leadId} status updated from ${previousStatus} to ${newStatus}`);
      showToast(`Status wurde auf ${newStatus} gesetzt`, "success", 2200);
      
      // Re-render everything
      saveJsonCache(KUNDEN_DASHBOARD_CACHE_KEY, dashboardStats);
      renderStats();  // Update stats display first
      renderKunden(); // Then re-render the table (this applies the active filter)
      closeModal();
      
    } catch (err) {
      console.error("Status update failed:", err);
      showToast(err.message || "Status Update fehlgeschlagen", "error", 3000);
      saveBtn.disabled = false;
      saveBtn.textContent = "Speichern";
    }
  });
  
  modal.classList.add('active');
}

  // ========== Full Edit Popup with API Integration ==========
  function openFullEditModal(leadId) {
    const lead = leadsData.find(l => l.id === leadId);
    if (!lead) return;
    
    const modalHtml = `
      <div id="fullEditModal" class="k-modal-overlay">
        <div class="k-modal-content" style="max-width: 750px; max-height: 90vh;">
          <div class="k-modal-header">
            <h3>Lead bearbeiten - ${escapeHtml(lead.name)}</h3>
            <button class="k-close-btn" id="closeFullEditModal">&times;</button>
          </div>
          <div class="k-modal-body" style="overflow-y: auto;">
            <form id="fullEditForm">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <!-- Contact Information -->
                <div class="form-group">
                  <label>Anrede</label>
                  <select id="edit_salutation" class="k-full-select">
                    <option value="">Wählen...</option>
                    <option value="Herr" ${lead.salutation === 'Herr' ? 'selected' : ''}>Herr</option>
                    <option value="Frau" ${lead.salutation === 'Frau' ? 'selected' : ''}>Frau</option>
                    <option value="Divers" ${lead.salutation === 'Divers' ? 'selected' : ''}>Divers</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Name *</label>
                  <input type="text" id="edit_name" class="k-full-input" value="${escapeHtml(lead.name)}" required>
                </div>
                <div class="form-group">
                  <label>Straße Objekt</label>
                  <input type="text" id="edit_strasse" class="k-full-input" value="${escapeHtml(lead.strasse || '')}">
                </div>
                <div class="form-group">
                  <label>PLZ</label>
                  <input type="text" id="edit_plz" class="k-full-input" value="${escapeHtml(lead.plz || '')}">
                </div>
                <div class="form-group">
                  <label>Ort</label>
                  <input type="text" id="edit_ort" class="k-full-input" value="${escapeHtml(lead.ort)}">
                </div>
                <div class="form-group">
                  <label>Telefon</label>
                  <input type="text" id="edit_telefon" class="k-full-input" value="${escapeHtml(lead.telefon || '')}">
                </div>
                <div class="form-group">
                  <label>E-Mail</label>
                  <input type="email" id="edit_email" class="k-full-input" value="${escapeHtml(lead.email || '')}">
                </div>
                <div class="form-group">
                  <label>Kontakt Via</label>
                  <select id="edit_kontaktVia" class="k-full-select">
                    <option value="">Wählen...</option>
                    <option value="Telefon" ${lead.kontaktVia === 'Telefon' ? 'selected' : ''}>Telefon</option>
                    <option value="E-Mail" ${lead.kontaktVia === 'E-Mail' ? 'selected' : ''}>E-Mail</option>
                    <option value="Leadformular" ${lead.kontaktVia === 'Leadformular' ? 'selected' : ''}>Leadformular</option>
                    <option value="Anruf" ${lead.kontaktVia === 'Anruf' ? 'selected' : ''}>Anruf</option>
                  </select>
                </div>
                
                <!-- Lead Information -->
                <div class="form-group">
                  <label>Status</label>
                  <select id="edit_status" class="k-full-select">
                    ${EDIT_STATUS_OPTIONS.map(opt => `<option value="${opt}" ${lead.status === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label>Qualification</label>
                  <select id="edit_qualification" class="k-full-select">
                    <option value="">Wählen...</option>
                    <option value="Hoch" ${lead.qualification === 'Hoch' ? 'selected' : ''}>Hoch</option>
                    <option value="Mittel" ${lead.qualification === 'Mittel' ? 'selected' : ''}>Mittel</option>
                    <option value="Niedrig" ${lead.qualification === 'Niedrig' ? 'selected' : ''}>Niedrig</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Lead Quelle</label>
                  <select id="edit_quelle" class="k-full-select">
                    ${QUELLE_OPTIONS.map(opt => `<option value="${opt}" ${lead.quelle === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label>Bearbeiter</label>
                  <select id="edit_bearbeiter" class="k-full-select">
                    <option value="">Wählen...</option>
                    ${BEARBEITER_OPTIONS.map(opt => `<option value="${opt}" ${lead.bearbeiter === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label>Erstberatung Telefon</label>
                  <select id="edit_erstberatung_telefon" class="k-full-select">
                    <option value="">W??hlen...</option>
                    <option value="WAHR" ${normalizeErstberatungValue(lead.erstberatung_telefon) === 'WAHR' ? 'selected' : ''}>WAHR</option>
                    <option value="FALSCH" ${normalizeErstberatungValue(lead.erstberatung_telefon) === 'FALSCH' ? 'selected' : ''}>FALSCH</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Delegieren</label>
                  <select id="edit_delegieren" class="k-full-select">
                    <option value="">Wählen...</option>
                    ${BEARBEITER_OPTIONS.map(opt => `<option value="${opt}" ${lead.delegieren === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label>Angebot</label>
                  <input type="text" id="edit_angebot" class="k-full-input" value="${escapeHtml(lead.angebot || '')}">
                </div>
                <div class="form-group">
                  <label>Summe Netto</label>
                  <input type="text" id="edit_summe" class="k-full-input" value="${escapeHtml(lead.summe.replace('$ ', ''))}">
                </div>
                <div class="form-group">
                  <label>Datum</label>
                  <input type="date" id="edit_datum" class="k-full-input" value="${escapeHtml(lead.datum !== '—' ? lead.datum : '')}">
                </div>
                <div class="form-group">
                  <label>Nachfassen</label>
                  <input type="date" id="edit_nachfassen" class="k-full-input" value="${escapeHtml(lead.nachfassen || '')}">
                </div>
                <div class="form-group">
                  <label>Sales Typ</label>
                  <select id="edit_salesTyp" class="k-full-select">
                    <option value="">Wählen...</option>
                    <option value="Inbound" ${lead.salesTyp === 'Inbound' ? 'selected' : ''}>Inbound</option>
                    <option value="Outbound" ${lead.salesTyp === 'Outbound' ? 'selected' : ''}>Outbound</option>
                  </select>
                </div>
                
                <!-- Roof Details -->
                <div class="form-group">
                  <label>Dachfläche (m²)</label>
                  <input type="text" id="edit_dachflaeche" class="k-full-input" value="${escapeHtml(lead.dachflaeche || '')}">
                </div>
                <div class="form-group">
                  <label>Dachneigung Grad</label>
                  <select id="edit_dachneigung" class="k-full-select">
                    <option value="">Wählen...</option>
                    ${DACHNEIGUNG_OPTIONS.map(opt => `<option value="${opt}" ${lead.dachneigung === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label>Dacheindeckung</label>
                  <select id="edit_dacheindeckung" class="k-full-select">
                    <option value="">Wählen...</option>
                    ${DACHEINDECKUNG_OPTIONS.map(opt => `<option value="${opt}" ${lead.dacheindeckung === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label>Wunsch Farbe</label>
                  <select id="edit_farbe" class="k-full-select">
                    <option value="">Wählen...</option>
                    ${FARBE_OPTIONS.map(opt => `<option value="${opt}" ${lead.farbe === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label>Dachpfanne</label>
                  <select id="edit_dachpfanne" class="k-full-select">
                    <option value="">Wählen...</option>
                    ${DACHPFANNE_OPTIONS.map(opt => `<option value="${opt}" ${lead.dachpfanne === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label>Baujahr Dach</label>
                  <select id="edit_baujahr" class="k-full-select">
                    <option value="">Wählen...</option>
                    ${Array.from({ length: 80 }, (_, i) => 2024 - i).map(y => `<option value="${y}" ${lead.dachalter === String(y) ? 'selected' : ''}>${y}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label>Zusätzliche Extras</label>
                  <input type="text" id="edit_zusatzExtras" class="k-full-input" value="${escapeHtml(lead.zusatzExtras || '')}">
                </div>
              </div>
              <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px;">
                <button type="button" id="cancelFullEdit" class="k-btn-outline">Abbrechen</button>
                <button type="button" id="saveFullEdit" class="k-btn-green">Änderungen speichern</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
    
    const existingModal = document.getElementById("fullEditModal");
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = document.getElementById("fullEditModal");
    const closeBtn = document.getElementById("closeFullEditModal");
    const cancelBtn = document.getElementById("cancelFullEdit");
    const saveBtn = document.getElementById("saveFullEdit");
    
    const closeModal = () => {
      modal.classList.remove('active');
      setTimeout(() => modal.remove(), 300);
    };
    
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    
    saveBtn?.addEventListener('click', async () => {
      try {
        showToast("Updating lead...", "info", 1000);
        
        const editId = String(lead.id).trim();
        if (!editId || editId === "null" || editId === "undefined") {
          throw new Error("Lead ID fehlt");
        }
        
const payload = {
  id: editId,
  lead_id: editId,
  name: document.getElementById("edit_name")?.value || '',
  salutation: document.getElementById("edit_salutation")?.value || '',
  erstberatung_telefon: document.getElementById("edit_erstberatung_telefon")?.value || '',
  strasse_objekt: document.getElementById("edit_strasse")?.value || '',
  angebot: document.getElementById("edit_angebot")?.value || '',
  plz: document.getElementById("edit_plz")?.value || '',
  ort: document.getElementById("edit_ort")?.value || '',
  telefon: document.getElementById("edit_telefon")?.value || '',
  email: document.getElementById("edit_email")?.value || '',
  status: document.getElementById("edit_status")?.value || lead.status,
  einschaetzung_kunde: document.getElementById("edit_qualification")?.value || '',
  lead_quelle: document.getElementById("edit_quelle")?.value || '',
  kontakt_via: document.getElementById("edit_kontaktVia")?.value || '',
  datum: document.getElementById("edit_datum")?.value || lead.datum,
  nachfassen: document.getElementById("edit_nachfassen")?.value || '',
  bearbeiter: document.getElementById("edit_bearbeiter")?.value || '',
  delegieren: document.getElementById("edit_delegieren")?.value || '',
  summe_netto: document.getElementById("edit_summe")?.value || '',
  dachflaeche_m2: document.getElementById("edit_dachflaeche")?.value || '',
  dachneigung_grad: document.getElementById("edit_dachneigung")?.value || '',
  dacheindeckung: document.getElementById("edit_dacheindeckung")?.value || '',
  wunsch_farbe: document.getElementById("edit_farbe")?.value || '',
  dachpfanne: document.getElementById("edit_dachpfanne")?.value || '',
  baujahr_dach: document.getElementById("edit_baujahr")?.value || '',
  zusaetzliche_extras: document.getElementById("edit_zusatzExtras")?.value || '',
  sale_typ: document.getElementById("edit_salesTyp")?.value || '',
};
        
        const response = await updateLeadOnAPI(editId, payload);
        console.log("Update response:", response);
         // 👇 YAHAN LAGAO (approximately line 970-980 ke beech)
    activityCache.delete(String(lead.id));
    notesCache.delete(String(lead.id));
        // Update local lead data
        const updatedLead = {
          ...lead,
          salutation: payload.salutation,
          name: payload.name,
          strasse: payload.strasse_objekt,
          plz: payload.plz,
          ort: payload.ort,
          telefon: payload.telefon,
          email: payload.email,
          kontaktVia: payload.kontakt_via,
          status: payload.status,
          qualification: payload.einschaetzung_kunde,
          quelle: payload.lead_quelle,
          bearbeiter: payload.bearbeiter,
          delegieren: payload.delegieren || "",
          angebot: payload.angebot,
          summe: payload.summe_netto ? `$ ${formatNumber(payload.summe_netto)}` : "$ 0,00",
          datum: payload.datum || lead.datum,
          nachfassen: payload.nachfassen,
          salesTyp: payload.sale_typ,
          dachflaeche: payload.dachflaeche_m2,
          dachneigung: payload.dachneigung_grad,
          dacheindeckung: payload.dacheindeckung,
          farbe: payload.wunsch_farbe,
          dachpfanne: payload.dachpfanne,
          dachalter: payload.baujahr_dach,
          zusatzExtras: payload.zusaetzliche_extras,
          erstberatung_telefon: payload.erstberatung_telefon || lead.erstberatung_telefon || "",
          statusClass: getStatusClass(payload.status),
        };
        
        queuePendingUpdate(lead.id, updatedLead);
        Object.assign(lead, updatedLead);

        const erstberatungValue = normalizeErstberatungValue(
          payload.erstberatung_telefon || lead.erstberatung_telefon || "",
        );
        if (erstberatungValue === "WAHR") {
          teleconsultationSelections.set(lead.id, "true");
          syncEditPermissionState(lead.id, true);
        } else if (erstberatungValue === "FALSCH") {
          teleconsultationSelections.set(lead.id, "false");
          syncEditPermissionState(lead.id, false);
        }
        
        showToast("Lead erfolgreich aktualisiert!", "success", 2000);
        renderKunden();
        closeModal();
        
        // Log activity
        const actor = resolveActivityActorForLead(
          lead.id,
          payload.bearbeiter || lead.bearbeiter,
        );
        const activityText = rewriteActivityTextActor(
          `${actor} hat Lead ${lead.name} aktualisiert`,
          actor,
        );
        addOptimisticActivity(lead.id, {
          text: activityText,
          by: actor,
          at: new Date().toLocaleString(),
        });
        
        try {
          await insertActivity(lead.id, "update", activityText, {
            from: actor,
            leadName: lead.name,
          });
        } catch (e) {
          console.warn("Activity log failed:", e);
        }
        
      } catch (err) {
        console.error("Update error:", err);
        showToast(err.message || "Update fehlgeschlagen", "error", 3000);
      }
    });
    
    modal.classList.add('active');
  }

  window.viewKunde = async (id) => {
    const lead = leadsData.find((l) => l.id === id);
    if (!lead) return;
    
    const titleEl = document.getElementById("kundenViewTitle");
    const contentEl = document.getElementById("kundenViewContent");
    if (titleEl) titleEl.textContent = (lead.salutation ? lead.salutation + " " : "") + lead.name + " – Details";
    if (contentEl) {
      contentEl.innerHTML = `<div style="text-align: center; padding: 20px;">⏳ Lade Details...</div>`;
    }
    
    const modal = document.getElementById("kundenViewModal");
    if (modal) modal.classList.add("active");
    
    const [notes, activities] = await Promise.all([
      fetchNotesForLead(lead.id),
      fetchActivityForLead(lead.id)
    ]);
    
    if (contentEl) {
      let notesHtml = '';
      if (notes && notes.length > 0) {
        notesHtml = notes.map(note => `
          <div class="timeline-item">
            <div class="timeline-icon">📝</div>
            <div class="timeline-content">
              <div class="timeline-text">${escapeHtml(note.text)}</div>
              <div class="timeline-meta">
                <span class="timeline-author">${escapeHtml(note.author)}</span>
                <span class="timeline-date">${escapeHtml(note.date || 'Kein Datum')}</span>
              </div>
            </div>
          </div>
        `).join('');
      } else {
        notesHtml = `<div class="empty-notes">Keine Notizen vorhanden</div>`;
      }
      
      let activitiesHtml = '';
      if (activities && activities.length > 0) {
        activitiesHtml = activities.map(activity => `
          <div class="timeline-item">
            <div class="timeline-content">
              <div class="timeline-text">${escapeHtml(activity.text)}</div>
              <div class="timeline-meta">
<div class="timeline-activity">
  <div class="timeline-activity-label">Activity from:</div>
  <span class="timeline-author">${escapeHtml(activity.by)}</span>
</div>
<div class="timeline-activity-date">
  <div class="timeline-activity-label">Activity Time:</div>
  <span class="timeline-date">${escapeHtml(activity.at || 'Kein Datum')}</span>
</div>
              </div>
                </div>
            </div>
          </div>
        `).join('');
      } else {
        activitiesHtml = `<div class="empty-activities">Keine Aktivitäten vorhanden</div>`;
      }
      
      contentEl.innerHTML = `
        <div class="k-view-section">
          <h4>Kontaktinformationen</h4>
          <div class="k-detail-row"><div class="k-detail-label">Anrede</div><div class="k-detail-value">${escapeHtml(lead.salutation || "—")}</div></div>
          <div class="k-detail-row"><div class="k-detail-label">Name</div><div class="k-detail-value">${escapeHtml(lead.name)}</div></div>
          <div class="k-detail-row"><div class="k-detail-label">Ort</div><div class="k-detail-value">${escapeHtml(lead.ort)}</div></div>
          <div class="k-detail-row"><div class="k-detail-label">Straße</div><div class="k-detail-value">${escapeHtml(lead.strasse || "—")}</div></div>
          <div class="k-detail-row"><div class="k-detail-label">PLZ</div><div class="k-detail-value">${escapeHtml(lead.plz || "—")}</div></div>
          <div class="k-detail-row"><div class="k-detail-label">Telefon</div><div class="k-detail-value">${escapeHtml(lead.telefon || "—")}</div></div>
          <div class="k-detail-row"><div class="k-detail-label">E-Mail</div><div class="k-detail-value">${escapeHtml(lead.email || "—")}</div></div>
          <div class="k-detail-row"><div class="k-detail-label">Kontakt Via</div><div class="k-detail-value">${escapeHtml(lead.kontaktVia || "—")}</div></div>
        </div>
        <div class="k-view-section">
          <h4>Lead Informationen</h4>
          <div class="k-detail-row"><div class="k-detail-label">Status</div><div class="k-detail-value"><span class="badge ${lead.statusClass}">${escapeHtml(lead.status)}</span></div></div>
          <div class="k-detail-row"><div class="k-detail-label">Lead Quelle</div><div class="k-detail-value">${escapeHtml(lead.quelle || "—")}</div></div>
          <div class="k-detail-row"><div class="k-detail-label">Bearbeiter</div><div class="k-detail-value">${escapeHtml(lead.bearbeiter || "—")}</div></div>
          <div class="k-detail-row"><div class="k-detail-label">Delegieren</div><div class="k-detail-value">${escapeHtml(lead.delegieren || "—")}</div></div>
             <div class="k-detail-row"><div class="k-detail-label">Erstberatung Telefon</div><div class="k-detail-value">${escapeHtml(lead.erstberatung_telefon || "—")}</div></div>
          <div class="k-detail-row"><div class="k-detail-label">Angebot</div><div class="k-detail-value">${escapeHtml(lead.angebot || "—")}</div></div>
          <div class="k-detail-row"><div class="k-detail-label">Summe Netto</div><div class="k-detail-value">${escapeHtml(lead.summe)}</div></div>
          <div class="k-detail-row"><div class="k-detail-label">Datum</div><div class="k-detail-value">${escapeHtml(lead.datum)}</div></div>
          <div class="k-detail-row"><div class="k-detail-label">Nachfassen</div><div class="k-detail-value">${escapeHtml(lead.nachfassen || "—")}</div></div>
          <div class="k-detail-row"><div class="k-detail-label">Sales Typ</div><div class="k-detail-value">${escapeHtml(lead.salesTyp || "—")}</div></div>
        </div>
        <div class="k-view-section">
          <h4>Dachdetails</h4>
          <div class="k-detail-row"><div class="k-detail-label">Dachfläche (m²)</div><div class="k-detail-value">${escapeHtml(lead.dachflaeche || "—")}</div></div>
          <div class="k-detail-row"><div class="k-detail-label">Dacheindeckung</div><div class="k-detail-value">${escapeHtml(lead.dacheindeckung || "—")}</div></div>
          <div class="k-detail-row"><div class="k-detail-label">Baujahr Dach</div><div class="k-detail-value">${escapeHtml(lead.dachalter || "—")}</div></div>
          <div class="k-detail-row"><div class="k-detail-label">Dachpfanne</div><div class="k-detail-value">${escapeHtml(lead.dachpfanne || "—")}</div></div>
          <div class="k-detail-row"><div class="k-detail-label">Wunsch Farbe</div><div class="k-detail-value">${escapeHtml(lead.farbe || "—")}</div></div>
          <div class="k-detail-row"><div class="k-detail-label">Dachneigung Grad</div><div class="k-detail-value">${escapeHtml(lead.dachneigung || "—")}</div></div>
          <div class="k-detail-row"><div class="k-detail-label">Zusätzliche Extras</div><div class="k-detail-value">${escapeHtml(lead.zusatzExtras || "—")}</div></div>
        </div>
        
        <div class="k-view-section">
          <h4>📝 Notiz anzeigen</h4>
          <div class="timeline-container">
            ${notesHtml}
          </div>
        </div>
        
        <div class="k-view-section">
          <h4>⏱️ Aktivitätszeitleiste</h4>
          <div class="timeline-container">
            ${activitiesHtml}
          </div>
        </div>
      `;
    }
  };

 window.callKunde = async (id) => {
  const lead = leadsData.find((l) => l.id === id);
  if (lead && lead.telefon) {
    let phoneNumber = String(lead.telefon).replace(/[\s\-\(\)]/g, '');
    
    if (phoneNumber.startsWith('0') && !phoneNumber.startsWith('+')) {
      phoneNumber = '' + phoneNumber.substring(1);
    } else if (!phoneNumber.startsWith('+') && !phoneNumber.startsWith('00')) {
      phoneNumber = '' + phoneNumber;
    }
    
    const baseUrl = "https://msdach.3cx.eu:5001/webclient/#/call";
    const callUrl = `${baseUrl}?phone=${encodeURIComponent(phoneNumber)}`;
    
    window.open(callUrl, "_blank");
    const actor = resolveActivityActorForLead(lead.id, lead.bearbeiter);
    const activityText = rewriteActivityTextActor(
      `${actor} rief an ${phoneNumber}`,
      actor,
    );
    
    // Add optimistic activity for UI
    addOptimisticActivity(lead.id, {
      text: activityText,
      by: actor,
      at: new Date().toLocaleString(),
    });
    
    try {
      // Pass bearbeiter explicitly
      await insertActivity(lead.id, "call", activityText, {
        bearbeiter: actor,  // This is CRITICAL
        from: actor,
        phone: phoneNumber,
        leadName: lead.name,
      });
      console.log(`✅ Activity recorded for lead ${lead.id}: ${activityText} by ${actor}`);
    } catch (err) {
      console.warn("Failed to record call activity:", err.message);
    }
    
    showToast(`Anruf wird gestartet: ${phoneNumber}`, "success", 3000);
  } else {
    showToast("Keine Telefonnummer vorhanden", "error", 2500);
  }
};

  window.sendEmailToKunde = (id) => {
    const lead = leadsData.find((l) => l.id === id);
    if (lead && lead.email) {
      alert(`E-Mail wird gesendet an: ${lead.email}`);
    } else {
      showToast("Is customer ke liye email address available nahi hai.", "error", 2500);
    }
  };

  window.openKarte = (id) => {
    const lead = leadsData.find((l) => l.id === id);
    if (lead && (lead.strasse || lead.ort)) {
      const address = `${lead.strasse || ""} ${lead.ort || ""}`;
      window.open(
        `https://maps.google.com/?q=${encodeURIComponent(address)}`,
        "_blank",
      );
    } else {
      alert("Keine Adresse vorhanden");
    }
  };

  window.openMassEmailModal = openMassEmailModal;
  window.openFullEditModal = openFullEditModal;

  function renderKunden() {
    if (!leadsData.length) {
      renderStats();
      return;
    }

    renderStats();

    const statDefs = getStatDefinitions();
    const activeDef = statDefs.find((d) => d.key === kundenActiveFilter);

    const pillEl = document.getElementById("kunden-filter-pill");
    if (pillEl) {
      if (activeDef) {
        pillEl.style.display = "block";
        pillEl.innerHTML = `<span class="active-filter-pill">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          Gefiltert: ${activeDef.label}
          <button onclick="window.clearKundenFilter()" title="Filter entfernen">✕</button>
        </span>`;
      } else {
        pillEl.style.display = "none";
      }
    }

    const searchInput = document.getElementById("kunden-search");
    const searchTerm = (searchInput?.value || "").toLowerCase();
    statusFilter = document.getElementById("filter-status")?.value || "";
    leadSourceFilter = document.getElementById("filter-source")?.value || "";
    ortSearchTerm = (document.getElementById("filter-ort")?.value || "").toLowerCase();
    bearbeiterFilter = document.getElementById("filter-bearbeiter")?.value || "";
    delegierenFilter = document.getElementById("filter-delegieren")?.value || "";  // Add this line


    let data = leadsData.slice();
    
    if (activeDef && activeDef.filter) {
      data = data.filter(activeDef.filter);
    }
    
    if (statusFilter) {
      data = data.filter(l => l.status === statusFilter);
    }
    
    if (leadSourceFilter) {
      data = data.filter(l => l.quelle === leadSourceFilter);
    }
    
    if (searchTerm) {
      data = data.filter(
        (l) =>
          l.name.toLowerCase().includes(searchTerm) ||
          l.ort.toLowerCase().includes(searchTerm),
      );
    }
    
    if (ortSearchTerm) {
      data = data.filter(
        (l) =>
          l.ort.toLowerCase().includes(ortSearchTerm),
      );
    }

    if (bearbeiterFilter) {
      data = data.filter(l => l.bearbeiter === bearbeiterFilter);
    }
    if (delegierenFilter) {  // Add this block
    data = data.filter(l => l.delegieren === delegierenFilter);
}

    filteredData = data;

    const tbody = document.getElementById("kunden-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!filteredData.length) {
      tbody.innerHTML = `<td colspan="14"><div class="empty-state">Keine Kunden in dieser Kategorie.</div>`;
      updateCount();
      return;
    }

    const showPhoneIcon = shouldShowPhoneIcon();
    const showEmailIcon = shouldShowEmailIcon();

    filteredData.forEach((lead) => {
      const isExp = expandedRows.has(lead.id);
      const editCb = checkedEdit.has(String(lead.id)) || isErstberatungChecked(lead);
      const displayName =
        (lead.salutation ? lead.salutation + " " : "") + lead.name;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <tr>
          <td>
          <input type="checkbox" class="cb kunden-cb" data-id="${lead.id}" ${selectedKunden.has(lead.id) ? "checked" : ""}>
          </td>
          <td>
          <button class="expand-btn ${isExp ? "open" : ""}" onclick="window.toggleKundenExpand(${lead.id})">
            <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          </td>
          <td><span style="font-weight:500">${escapeHtml(displayName)}</span></td>
        <td style="font-size:0.8rem;color:#64748b">${escapeHtml(lead.ort)}</td>
          <td><span class="badge ${lead.statusClass}">${escapeHtml(lead.status)}</span></td>
          <td>${lead.quelle ? `<span class="tag">${escapeHtml(lead.quelle)}</span>` : ""}</td>
          <td>${lead.bearbeiter ? `<span class="assignee-chip">${escapeHtml(lead.bearbeiter)}</span>` : ""}</td>

          <td><div class="delegate-dot">${escapeHtml(lead.delegieren || "—")}</div></td>
          <td><span class="amount">${escapeHtml(lead.summe)}</span></td>
          <td><span class="date-cell">${escapeHtml(lead.datum)}</span></td>
          <td>
          <button class="act-btn" onclick="window.viewKunde(${lead.id})" title="Details anzeigen">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
          </td>
          <td>
          <div style="display: flex; gap: 6px; align-items: center;">
            ${showPhoneIcon ? `
              <button class="act-btn-green" onclick="window.callKunde(${lead.id})" title="Anrufen">
                <svg width="14" height="14" fill="white" stroke="white" stroke-width="1.5" viewBox="0 0 24 24">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 3.08 5.18 2 2 0 0 1 5.06 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L9.09 10.91A16 16 0 0 0 13.09 15l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21 16z"/>
                </svg>
              </button>
            ` : ''}
            ${showEmailIcon ? `
              <button class="act-btn-email" onclick="window.sendEmailToKunde(${lead.id})" title="E-Mail senden">
                <svg width="14" height="14" fill="none" stroke="white" stroke-width="2" viewBox="0 0 24 24">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="m22 7-10 7L2 7"/>
                </svg>
              </button>
            ` : ''}
          </div>
          </td>
          <td>
          <div class="bearbeiten-cell">
            <input type="checkbox" class="edit-cb" data-id="${lead.id}" ${editCb ? "checked" : ""} 
              onchange="window.handleEditCheckboxClick(${lead.id}, this)">
            <button class="edit-icon-btn" onclick="window.openEditStatusModal(${lead.id})" ${editCb ? "" : "disabled"} title="Bearbeiten">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          </div>
          </td>
          <td>
          <button class="act-btn-green-outline" onclick="window.openKarte(${lead.id})" title="Karte">
            <svg width="14" height="14" fill="none" stroke="#22c55e" stroke-width="2" viewBox="0 0 24 24">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
          </button>
          </td>
      `;
      tbody.appendChild(tr);

      const xtr = document.createElement("tr");
      xtr.className = `expand-row${isExp ? " open" : ""}`;
      xtr.addEventListener('click', (e) => {
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('a')) return;
        openFullEditModal(lead.id);
      });
      xtr.style.cursor = 'pointer';
      xtr.title = 'Klicken Sie zum Bearbeiten der Lead-Daten';
      xtr.innerHTML = `<td colspan="14"><div class="expand-grid">
        <div class="expand-item"><label>Dachfläche (m²)</label><span>${escapeHtml(lead.dachflaeche || "—")}</span></div>
        <div class="expand-item"><label>Dacheindeckung</label><span>${escapeHtml(lead.dacheindeckung || "—")}</span></div>
        <div class="expand-item"><label>Baujahr Dach</label><span>${escapeHtml(lead.dachalter || "—")}</span></div>
        <div class="expand-item"><label>Dachpfanne</label><span>${escapeHtml(lead.dachpfanne || "—")}</span></div>
        <div class="expand-item"><label>Wunsch Farbe</label><span>${escapeHtml(lead.farbe || "—")}</span></div>
        <div class="expand-item"><label>Dachneigung Grad</label><span>${escapeHtml(lead.dachneigung || "—")}</span></div>
        <div class="expand-item"><label>Straße</label><span>${escapeHtml(lead.strasse || "—")}</span></div>
        <div class="expand-item"><label>PLZ</label><span>${escapeHtml(lead.plz || "—")}</span></div>
        <div class="expand-item"><label>Telefon</label><span>${escapeHtml(lead.telefon || "—")}</span></div>
        <div class="expand-item"><label>E-Mail</label><span>${escapeHtml(lead.email || "—")}</span></div>
      </div>`;
      tbody.appendChild(xtr);
    });

    document.querySelectorAll(".kunden-cb").forEach((cb) => {
      cb.addEventListener("change", (e) => {
        const id = parseInt(e.target.dataset.id);
        if (e.target.checked) selectedKunden.add(id);
        else selectedKunden.delete(id);
        updateCount();
        updateMassEmailButton();
      });
    });

    updateCount();
    updateMassEmailButton();
  }

  function updateCount() {
    const el = document.getElementById("kunden-selected-count");
    if (el) el.textContent = `Wählen Sie Leads aus: ${selectedKunden.size}`;
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  window.setKundenFilter = (key) => {
    kundenActiveFilter = key;
    renderKunden();
  };
  window.clearKundenFilter = () => {
    kundenActiveFilter = null;
    renderKunden();
  };
  window.toggleKundenExpand = (id) => {
    if (expandedRows.has(id)) expandedRows.delete(id);
    else expandedRows.add(id);
    renderKunden();
  };

window.handleEditCheckboxClick = (id, checkboxElement) => {
  const lead = leadsData.find((item) => String(item.id) === String(id));
  const originalState = checkedEdit.has(String(id)) || isErstberatungChecked(lead);
  checkboxElement.checked = originalState;
  openTeleconsultationModalWithCallback(id, checkboxElement, originalState);
};

function openTeleconsultationModalWithCallback(leadId, checkboxElement, originalState) {
  const lead = leadsData.find(l => l.id === leadId);
  if (!lead) return;
  
  const currentSelection = getTeleconsultationSelection(leadId);
  
  const modalHtml = `
    <div id="teleconsultationModal" class="k-modal-overlay">
      <div class="k-modal-content" style="max-width: 500px;">
        <div class="k-modal-header">
          <h3>Erstberatung Telefon</h3>
          <button class="k-close-btn" id="closeTeleModal">&times;</button>
        </div>
        <div class="k-modal-body">
          <div class="form-group" style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #0f172a;">Wählen Sie eine Option:</label>
            <select id="teleconsultationSelect" class="k-full-select">
              <option value="">Bitte wählen</option>
              <option value="true" ${currentSelection === 'true' ? 'selected' : ''}>WAHR</option>
              <option value="false" ${currentSelection === 'false' ? 'selected' : ''}>FALSCH</option>
            </select>
          </div>
          
          <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px;">
            <button type="button" id="cancelTeleModal" class="k-btn-outline" style="padding: 10px 24px;">Abbrechen</button>
            <button type="button" id="updateTeleconsultation" class="k-btn-green" style="padding: 10px 24px;">Aktualisierung Erstberatung Telefon</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  const existingModal = document.getElementById("teleconsultationModal");
  if (existingModal) existingModal.remove();
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  const modal = document.getElementById("teleconsultationModal");
  const closeBtn = document.getElementById("closeTeleModal");
  const cancelBtn = document.getElementById("cancelTeleModal");
  const updateBtn = document.getElementById("updateTeleconsultation");
  const selectEl = document.getElementById("teleconsultationSelect");
  
  const closeModal = () => {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 300);
    if (checkboxElement && !selectEl?.value) {
      checkboxElement.checked = originalState;
    }
  };
  
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  
  updateBtn?.addEventListener('click', async () => {
  const selectedValue = selectEl?.value;
  
  if (!selectedValue) {
    showToast("Bitte wählen Sie eine Option", "error", 2000);
    return;
  }
  
  updateBtn.disabled = true;
  updateBtn.textContent = "Wird aktualisiert...";
  
  try {
    const payload = buildLeadUpdatePayload(lead, {
      id: String(lead.id),
      lead_id: String(lead.id),
      erstberatung_telefon: selectedValue === 'true' ? "WAHR" : "FALSCH",
    });
    
    console.log("Updating erstberatung_telefon:", payload);
    
    const response = await updateLeadOnAPI(lead.id, payload);
    console.log("Update response:", response);

    const rowsUpdated = Number(response?.rows_updated);
    if (Number.isFinite(rowsUpdated) && rowsUpdated === 0) {
      console.warn("Erstberatung Telefon update returned rows_updated: 0", payload);
    }

    const normalizedErstberatung =
      selectedValue === 'true' ? "WAHR" : "FALSCH";

    if (selectedValue === 'true') {
      lead.erstberatung_telefon = normalizedErstberatung;
      syncEditPermissionState(leadId, true);
      teleconsultationSelections.set(String(leadId), 'true');
      queuePendingUpdate(lead.id, { erstberatung_telefon: normalizedErstberatung });
      showToast(`Erstberatung Telefon wurde auf WAHR gesetzt f?r ${lead.name}`, "success", 3000);
    } else if (selectedValue === 'false') {
      lead.erstberatung_telefon = normalizedErstberatung;
      syncEditPermissionState(leadId, false);
      teleconsultationSelections.set(String(leadId), 'false');
      queuePendingUpdate(lead.id, { erstberatung_telefon: normalizedErstberatung });
      showToast(`Erstberatung Telefon wurde auf FALSCH gesetzt f?r ${lead.name}`, "success", 3000);
    }

    // Log activity
    const actor = resolveActivityActor(lead.bearbeiter);
    const activityText = `${actor} hat Erstberatung Telefon auf ${selectedValue === 'true' ? 'WAHR' : 'FALSCH'} gesetzt für ${lead.name}`;
    
    addOptimisticActivity(lead.id, {
      text: activityText,
      by: actor,
      at: new Date().toLocaleString(),
    });
    
    try {
      await insertActivity(lead.id, "update", activityText, {
        from: actor,
        bearbeiter: actor,
        leadName: lead.name,
      });
      console.log("Activity recorded for erstberatung_telefon update");
    } catch (e) {
      console.warn("Activity log failed:", e);
    }
    
    // Refresh the table without full reload to preserve state
    renderKunden();
    
    closeModal();
    
  } catch (err) {
    console.error("Update failed:", err);
    showToast(err.message || "Aktualisierung fehlgeschlagen", "error", 3000);
    
    // Reset checkbox to original state on error
    if (checkboxElement) {
      checkboxElement.checked = originalState;
    }
  } finally {
    updateBtn.disabled = false;
    updateBtn.textContent = "Aktualisierung Erstberatung Telefon";
  }
});
  
  modal.classList.add('active');
}

  window.openEditStatusModal = openEditStatusModal;

  let statusModalLeadId = null;
  window.openStatusModal = (id) => {
    statusModalLeadId = id;
    const lead = leadsData.find((l) => l.id === id);
    const sel = document.getElementById("statusModalSelect");
    if (sel && lead) sel.value = lead.status || "";
    const modal = document.getElementById("statusModal");
    if (modal) modal.classList.add("active");
  };

  function saveStatusUpdate() {
    const newStatus = document.getElementById("statusModalSelect")?.value;
    if (!newStatus) {
      alert("Bitte Status wählen");
      return;
    }

    const lead = leadsData.find((l) => l.id === statusModalLeadId);
    if (lead) {
      lead.status = newStatus;
      lead.statusClass = getStatusClass(newStatus);
      console.log(`Lead ${statusModalLeadId} status updated to ${newStatus}`);
    }

    const modal = document.getElementById("statusModal");
    if (modal) modal.classList.remove("active");
    renderKunden();
  }

  function addKundenStyles() {
    if (document.getElementById("kunden-styles")) return;
    const s = document.createElement("style");
    s.id = "kunden-styles";
    s.textContent = `
      .kunden-container { width: 100%; }
      .page-title { font-size: 1.8rem; font-weight: 700; color: #0f172a; margin-bottom: 20px; }
      .kunden-stats { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 24px; }
      .kstat-card { background: white; border-radius: 16px; padding: 18px 22px; flex: 1; min-width: 130px; cursor: pointer; border: 2px solid transparent; box-shadow: 0 1px 4px rgba(0,0,0,0.06); transition: all 0.18s; position: relative; }
      .kstat-card:hover { border-color: #cbd5e1; }
      .kstat-card.active { border-color: #22c55e; background: #f0fdf4; }
      .kstat-active-dot { position: absolute; top: 12px; right: 12px; width: 8px; height: 8px; background: #22c55e; border-radius: 50%; display: none; }
      .kstat-card.active .kstat-active-dot { display: block; }
      .kstat-lbl { font-size: 0.78rem; color: #64748b; margin-bottom: 6px; }
      .kstat-val { font-size: 2rem; font-weight: 700; color: #0f172a; }
      .kstat-multi { margin-top: 4px; }
      .kstat-multi-row { display: flex; justify-content: space-between; font-size: 0.78rem; padding: 5px 0; color: #475569; border-bottom: 1px solid #f1f5f9; }
      .kstat-multi-row:last-child { border-bottom: none; }
      .kstat-multi-row span:last-child { font-weight: 600; color: #0f172a; }
      .active-filter-pill { display: inline-flex; align-items: center; gap: 8px; background: #f0fdf4; padding: 8px 16px; border-radius: 40px; font-size: 0.85rem; color: #166534; margin-bottom: 16px; }
      .active-filter-pill button { background: none; border: none; cursor: pointer; font-size: 1rem; color: #166534; padding: 0 4px; }
      .filter-section { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; align-items: flex-end; }
      .filter-group { display: flex; flex-direction: column; gap: 6px; }
      .filter-group label { font-size: 0.75rem; font-weight: 500; color: #64748b; }
      .filter-group select, .filter-group input { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.85rem; background: white; min-width: 180px; }
      .filter-group select:focus, .filter-group input:focus { outline: none; border-color: #22c55e; }
      .filter-actions { display: flex; gap: 8px; margin-left: auto; align-items: center; }
      .reset-filter-btn { background: #f1f5f9; border: 1px solid #e2e8f0; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; color: #475569; transition: all 0.2s; }
      .reset-filter-btn:hover { background: #e2e8f0; }
      .toolbar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 16px; }
      .search-box { display: flex; align-items: center; background: white; border: 1px solid #e2e8f0; border-radius: 40px; padding: 8px 16px; gap: 8px; flex: 1; max-width: 300px; }
      .search-box input { border: none; outline: none; font-size: 0.85rem; width: 100%; height: 30px; }
      .spacer { flex: 1; }
      .table-label { margin: 8px 0 16px; font-size: 0.85rem; color: #64748b; }
      .mass-email-btn {
        display: none;
        align-items: center;
        gap: 8px;
        background: #22c55e;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s;
      }
      .mass-email-btn:hover { background: #16a34a; }
      .mass-email-btn svg { stroke: white; }
      .table-wrap { overflow-x: visible; background: white; border-radius: 16px; border: 1px solid #eef2f8; width: 100%; }
      #kunden-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      #kunden-table th, #kunden-table td { padding: 11px 8px; vertical-align: middle; }
      #kunden-table th { text-align: left; background: #f8fafc; color: #475569; font-weight: 600; font-size: 0.78rem; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
      #kunden-table td { font-size: 0.83rem; border-bottom: 1px solid #f1f5f9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      #kunden-table tr:hover { background: #f8fafc; }
      
      /* Column widths */
      #kunden-table th:nth-child(1), #kunden-table td:nth-child(1) { width: 34px; }
      #kunden-table th:nth-child(2), #kunden-table td:nth-child(2) { width: 34px; }
      #kunden-table th:nth-child(3), #kunden-table td:nth-child(3) { width: 140px; }
      #kunden-table th:nth-child(4), #kunden-table td:nth-child(4) { width: 100px; }
      #kunden-table th:nth-child(5), #kunden-table td:nth-child(5) { width: 100px; }
      #kunden-table th:nth-child(6), #kunden-table td:nth-child(6) { width: 85px; }
      #kunden-table th:nth-child(7), #kunden-table td:nth-child(7) { width: 85px; }
      #kunden-table th:nth-child(8), #kunden-table td:nth-child(8) { width: 70px; text-align: center; }
      #kunden-table th:nth-child(9), #kunden-table td:nth-child(9) { width: 85px; text-align: right; }
      #kunden-table th:nth-child(10), #kunden-table td:nth-child(10) { width: 82px; }
      #kunden-table th:nth-child(11), #kunden-table td:nth-child(11) { width: 60px; text-align: center; }
      #kunden-table th:nth-child(12), #kunden-table td:nth-child(12) { width: 100px; }
      #kunden-table th:nth-child(13), #kunden-table td:nth-child(13) { width: 85px; }
      #kunden-table th:nth-child(14), #kunden-table td:nth-child(14) { width: 60px; text-align: center; }
      
      .cb { width: 16px; height: 16px; cursor: pointer; accent-color: #22c55e; margin: 0; }
      .expand-btn { background: none; border: none; cursor: pointer; padding: 3px 9px; color: #94a3b8; display: inline-flex; align-items: center; justify-content: center; }
      .expand-btn.open svg { transform: rotate(90deg); }
      .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 500; white-space: nowrap; }
      .badge-follow { background: #dbeafe; color: #1e40af; }
      .badge-offen  { background: #fef3c7; color: #92400e; }
      .badge-info   { background: #e0e7ff; color: #4338ca; }
      .badge-beauft { background: #dcfce7; color: #166534; }
      .badge-bearbeitung { background: #fed7aa; color: #9a3412; }
      .tag { display: inline-block; padding: 3px 8px; background: #f1f5f9; border-radius: 12px; font-size: 0.72rem; white-space: nowrap; }
      .assignee-chip { display: inline-block; padding: 3px 10px; background: #eef2ff; border-radius: 20px; font-size: 0.72rem; font-weight: 500; color: #4f46e5; white-space: nowrap; }
      .delegate-dot {     display: inline-block;
    padding: 3px 8px;
    background: #eef2ff;
    border-radius: 16px;
    font-size: 0.65rem;
    font-weight: 500;
 border-radius: 20px; background: #f1f5f9; border: 1px solid #e2e8f0; margin: 0 auto; }
      .amount { font-weight: 600; color: #0f172a; white-space: nowrap; }
      .date-cell { color: #64748b; font-size: 0.75rem; white-space: nowrap; }
      .act-btn { background: none; border: none; cursor: pointer; padding: 5px 7px; border-radius: 7px; color: #64748b; transition: all 0.18s; display: inline-flex; align-items: center; justify-content: center; }
      .act-btn:hover { background: #f1f5f9; color: #3b82f6; }
      .act-btn-green { background: #22c55e; border: none; cursor: pointer; padding: 7px 9px; border-radius: 9px; color: white; display: inline-flex; align-items: center; justify-content: center; }
      .act-btn-green:hover { background: #16a34a; }
      .act-btn-email { background: #3b82f6; border: none; cursor: pointer; padding: 7px 9px; border-radius: 9px; color: white; display: inline-flex; align-items: center; justify-content: center; }
      .act-btn-email:hover { background: #2563eb; }
      .act-btn-green-outline { background: none; border: 1.5px solid #22c55e; cursor: pointer; padding: 5px 7px; border-radius: 7px; color: #22c55e; display: inline-flex; align-items: center; justify-content: center; }
      .act-btn-green-outline:hover { background: #22c55e10; }
      .bearbeiten-cell { display: flex; align-items: center; gap: 6px; white-space: nowrap; }
      .edit-cb { width: 15px; height: 15px; cursor: pointer; accent-color: #22c55e; margin: 0; }
      .edit-icon-btn { background: none; border: none; cursor: pointer; padding: 4px; border-radius: 6px; color: #64748b; display: inline-flex; align-items: center; transition: all 0.18s; }
      .edit-icon-btn:hover:not(:disabled) { background: #f1f5f9; color: #3b82f6; }
      .edit-icon-btn:disabled { color: #d1d5db; cursor: not-allowed; }
      .expand-row { display: none; background: #f9fafb; }
      .expand-row.open { display: table-row; }
      .expand-row td { padding: 0 !important; }
      .expand-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 16px; background: #f9fafb; }
      .expand-item { display: flex; flex-direction: column; }
      .expand-item label { font-size: 0.7rem; color: #64748b; margin-bottom: 3px; }
      .expand-item span { font-size: 0.83rem; font-weight: 500; color: #0f172a; }
      .k-modal-overlay { display: none; position: fixed; z-index:9999; inset: 0; background: rgba(0,0,0,0.45); justify-content: center; align-items: center; }
      .k-modal-overlay.active { display: flex; }
      .k-modal-content { background: white; border-radius: 20px; width: 90%; max-width: 750px; max-height: 85vh; overflow: hidden; display: flex; flex-direction: column; animation: kmodalIn 0.2s ease; }
      .k-modal-sm { max-width: 460px; }
      @keyframes kmodalIn { from { opacity: 0; transform: translateY(-18px); } to { opacity: 1; transform: translateY(0); } }
      .k-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; }
      .k-modal-header h3 { font-size: 1.2rem; font-weight: 700; margin: 0; color: #0f172a; }
      .k-close-btn { background: none; border: none; font-size: 1.4rem; cursor: pointer; color: #94a3b8; line-height: 1; }
      .k-modal-body { flex: 1; overflow-y: auto; padding: 24px; }
      .k-full-select { width: 100%; padding: 11px 14px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 0.9rem; background: white; color: #64748b; }
      .k-full-input { width: 100%; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.85rem; font-family: inherit; }
      .k-full-input:focus { outline: none; border-color: #22c55e; }
      .k-btn-green { background: #22c55e; color: white; border: none; padding: 12px 28px; border-radius: 10px; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: background 0.15s; }
      .k-btn-green:hover { background: #16a34a; }
      .k-btn-outline { background: white; border: 1px solid #e2e8f0; padding: 8px 16px; border-radius: 8px; cursor: pointer; transition: all 0.15s; }
      .k-btn-outline:hover { background: #f8fafc; border-color: #cbd5e1; }
      .k-view-section { margin-bottom: 20px; }
      .k-view-section h4 { font-size: 0.95rem; font-weight: 600; color: #0f172a; margin-bottom: 10px; padding-bottom: 7px; border-bottom: 1px solid #e2e8f0; }
      .k-detail-row { display: flex; padding: 9px 0; border-bottom: 1px solid #f8fafc; }
      .k-detail-label { width: 150px; font-weight: 500; color: #64748b; font-size: 0.83rem; flex-shrink: 0; }
      .k-detail-value { flex: 1; color: #0f172a; font-size: 0.83rem; }
      .empty-state { text-align: center; padding: 40px; color: #94a3b8; font-size: 0.9rem; }
      .empty-notes, .empty-activities { text-align: center; padding: 20px; color: #94a3b8; font-size: 0.85rem; background: #f8fafc; border-radius: 8px; }
      .timeline-container { max-height: 300px; overflow-y: auto; }
      .timeline-item { display: flex; gap: 12px; padding: 12px; border-bottom: 1px solid #f1f5f9; }
      .timeline-icon { width: 32px; height: 32px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
      .timeline-content { flex: 1; }
      .timeline-text { font-size: 0.85rem; color: #0f172a; margin-bottom: 4px; }
      .timeline-meta { display: flex; flex-direction: column; gap: 12px; font-size: 0.7rem; color: #64748b; }
      .timeline-activity{display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: #475569;}
      .timeline-activity-date{display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: #475569;}
      .timeline-author { font-weight: 500; }
      .timeline-date { color: #94a3b8; }
      
      @media (max-width: 1200px) {
        #kunden-table th, #kunden-table td { white-space: normal; word-break: break-word; }
        .expand-grid { grid-template-columns: repeat(2, 1fr); }
      }
      @media (max-width: 768px) { 
        .expand-grid { grid-template-columns: repeat(1, 1fr); } 
        .k-modal-content { width: 96%; } 
        .filter-section { flex-direction: column; align-items: stretch; } 
        .filter-group select, .filter-group input { width: 100%; } 
        .filter-actions { margin-left: 0; }
        .table-wrap { overflow-x: auto; }
        #kunden-table { min-width: 800px; }
      }
    `;
    document.head.appendChild(s);
  }

  function getHTML() {
    return `
      <div class="kunden-container">
        <div class="page-title">Meine Kunden</div>
        <div class="kunden-stats" id="kunden-stats"></div>
        <div id="kunden-filter-pill" style="display:none"></div>
        
        <!-- Filter Section -->
        <div class="filter-section">
          <div class="filter-group">
            <label>Lead Quelle</label>
            <select id="filter-source" onchange="window.applyFilters()">
              <option value="">Alle Quellen</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Ort</label>
            <input type="text" id="filter-ort" placeholder="Ort suchen..." oninput="window.applyFilters()" />
          </div>
          <div class="filter-group">
            <label>Bearbeiter</label>
            <select id="filter-bearbeiter" onchange="window.applyFilters()">
              <option value="">Alle Bearbeiter</option>
              <option value="Philipp">Philipp</option>
              <option value="Martin">Martin</option>
              <option value="André">André</option>
              <option value="Simon">Simon</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Delegieren</label>
            <select id="filter-delegieren" onchange="window.applyFilters()">
              <option value="">Alle Delegieren</option>
            </select>
          </div>
          <div class="filter-actions">
            <button class="reset-filter-btn" onclick="window.resetFilters()">Filter zurücksetzen</button>
          </div>
        </div>
        
        <div class="toolbar">
          <div class="search-box">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" placeholder="Name oder Ort suchen..." id="kunden-search"/>
          </div>
          <div class="spacer"></div>
          <button id="mass-email-btn" class="mass-email-btn" onclick="window.openMassEmailModal()" style="display: none;">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="m22 7-10 7L2 7"/>
            </svg>
            Senden Sie Massen-E-Mails
          </button>
        </div>
        <div class="table-label" id="kunden-selected-count">Wählen Sie Leads aus: 0</div>
        <div class="table-wrap">
          <table id="kunden-table">
            <thead>
              <tr>
                <th><input type="checkbox" class="cb" id="kunden-check-all"/></th>
                <th></th>
                <th>Führen Name</th>
                <th>Ort</th>
                <th>Status</th>
                <th>Lead Quelle</th>
                <th>Bearbeiter</th>
                <th>Delegieren</th>
                <th>Summe Netto</th>
                <th>Datum</th>
                <th>Sicht</th>
                <th>Aktionen</th>
                <th>Bearbeiten</th>
                <th>Karte</th>
              </tr>
            </thead>
            <tbody id="kunden-tbody"></tbody>
          </table>
        </div>
      </div>

      <div id="kundenViewModal" class="k-modal-overlay">
        <div class="k-modal-content">
          <div class="k-modal-header">
            <h3 id="kundenViewTitle">Kunden Details</h3>
            <button class="k-close-btn" id="closeKundenViewModal">&times;</button>
          </div>
          <div class="k-modal-body" id="kundenViewContent"></div>
        </div>
      </div>

      <div id="statusModal" class="k-modal-overlay">
        <div class="k-modal-content k-modal-sm">
          <div class="k-modal-header">
            <h3>Status ändern</h3>
            <button class="k-close-btn" id="closeStatusModal">&times;</button>
          </div>
          <div class="k-modal-body">
            <div class="form-group">
              <select id="statusModalSelect" class="k-full-select">
                <option value="">Status auswählen</option>
                <option value="TNE Offen">TNE Offen</option>
                <option value="in Bearbeitung">in Bearbeitung</option>
                <option value="Nur Info eingeholt">Nur Info eingeholt</option>
                <option value="falscher Kunde">falscher Kunde</option>
              </select>
            </div>
            <div style="text-align:right; margin-top:20px;">
              <button id="statusModalSaveBtn" class="k-btn-green">Speichern</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function init(contentEl, titleElement) {
    contentArea = contentEl;
    titleEl = titleElement;
    addKundenStyles();

    if (titleEl) {
      titleEl.innerHTML = `<h1>Meine Kunden</h1><p>Bestandskunden Übersicht mit Filter</p>`;
      titleEl.style.display = "block";
    }

    if (!contentArea) return;
    contentArea.innerHTML = getHTML();

    loadAllData();

    window.applyFilters = () => {
      applyFilters();
    };
    window.resetFilters = () => {
      resetFilters();
    };

    document.getElementById("kunden-search")?.addEventListener("input", () => {
      renderKunden();
    });

    document
      .getElementById("kunden-check-all")
      ?.addEventListener("change", (e) => {
        document.querySelectorAll(".kunden-cb").forEach((cb) => {
          cb.checked = e.target.checked;
          const id = parseInt(cb.dataset.id);
          if (e.target.checked) selectedKunden.add(id);
          else selectedKunden.delete(id);
        });
        updateCount();
        updateMassEmailButton();
      });

    document
      .getElementById("closeKundenViewModal")
      ?.addEventListener("click", () => {
        document.getElementById("kundenViewModal")?.classList.remove("active");
      });
    document
      .getElementById("kundenViewModal")
      ?.addEventListener("click", (e) => {
        if (e.target === document.getElementById("kundenViewModal"))
          document
            .getElementById("kundenViewModal")
            ?.classList.remove("active");
      });

    document
      .getElementById("closeStatusModal")
      ?.addEventListener("click", () => {
        document.getElementById("statusModal")?.classList.remove("active");
      });
    document.getElementById("statusModal")?.addEventListener("click", (e) => {
      if (e.target === document.getElementById("statusModal"))
        document.getElementById("statusModal")?.classList.remove("active");
    });

    document
      .getElementById("statusModalSaveBtn")
      ?.addEventListener("click", saveStatusUpdate);

    console.log("✅ Kunden page loaded with full API integration (UPDATE, ACTIVITY, NOTES)");
  }

  return { init };
})();

window.kundenPage = kundenPage;
window.customersPage = window.kundenPage;
console.log("kunden.js loaded - window.kundenPage exists with full API integration");



