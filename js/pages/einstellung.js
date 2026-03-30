const einstellungPage = (function () {

  let contentArea = null;
  let titleEl = null;

  // ── In-memory users store ─────────────────────────────────────────────────
  let users = [
    { id: 1, vorname: 'Martin',  nachname: 'Schwaak', email: 'admin@msdach.com',   passwort: '********', rolle: 'admin' },
    { id: 2, vorname: 'André',   nachname: 'Philipp',  email: 'andre@msdach.com',   passwort: '********', rolle: 'user'  },
    { id: 3, vorname: 'Philipp', nachname: 'Kruse',    email: 'philipp@msdach.com', passwort: '********', rolle: 'user'  },
  ];
  let nextId = 4;
  let editingId = null; // null = create mode, number = edit mode

  // ── HTML shell ────────────────────────────────────────────────────────────
  const getHTML = () => `
    <div class="es-container">

      <!-- Header row -->
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

      <!-- User list -->
      <div id="es-user-list"></div>
    </div>

    <!-- ── Create / Edit Modal ── -->
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
              <option value="admin">admin</option>
              <option value="user">user</option>
            </select>
          </div>
        </div>
        <div class="es-modal-footer">
          <button class="es-cancel-btn" id="es-cancel-btn">Stornieren</button>
          <button class="es-create-btn" id="es-submit-btn">Benutzer erstellen</button>
        </div>
      </div>
    </div>
  `;

  // ── CSS ───────────────────────────────────────────────────────────────────
  function addStyles() {
    if (document.getElementById('einstellung-styles')) return;
    const s = document.createElement('style');
    s.id = 'einstellung-styles';
    s.textContent = `
      /* ── Container ── */
      .es-container { width: 100%; max-width: 1100px; }

      /* ── Header ── */
      .es-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 28px;
        flex-wrap: wrap;
        gap: 16px;
      }
      .es-title {
        font-size: 1.45rem;
        font-weight: 700;
        color: #0f172a;
        margin-bottom: 4px;
      }
      .es-sub {
        font-size: 0.85rem;
        color: #64748b;
      }
      .es-add-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: #22c55e;
        color: white;
        border: none;
        padding: 13px 24px;
        border-radius: 10px;
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s;
        white-space: nowrap;
      }
      .es-add-btn:hover { background: #16a34a; }

      /* ── Gesamt count ── */
      .es-gesamt {
        font-size: 1rem;
        font-weight: 700;
        color: #0f172a;
        margin-bottom: 16px;
      }
      .es-gesamt span { font-weight: 400; }

      /* ── Empty state ── */
      .es-empty {
        text-align: center;
        padding: 60px 20px;
        color: #94a3b8;
        font-size: 0.95rem;
      }

      /* ── User cards ── */
      .es-user-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: white;
        border: 1px solid #e8edf4;
        border-radius: 14px;
        padding: 20px 24px;
        margin-bottom: 14px;
        transition: box-shadow 0.15s;
      }
      .es-user-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.06); }

      .es-user-info { display: flex; flex-direction: column; gap: 3px; }
      .es-user-name {
        font-size: 1.05rem;
        font-weight: 700;
        color: #0f172a;
      }
      .es-user-email {
        font-size: 0.85rem;
        color: #64748b;
      }

      .es-user-actions {
        display: flex;
        align-items: center;
        gap: 14px;
        flex-shrink: 0;
      }

      /* Role badge */
      .es-role-badge {
        padding: 5px 16px;
        border-radius: 20px;
        font-size: 0.82rem;
        font-weight: 500;
        background: #dcfce7;
        color: #166534;
        border: 1px solid #bbf7d0;
      }
      .es-role-badge.admin {
        background: #dcfce7;
        color: #15803d;
        border-color: #86efac;
      }

      /* Edit / Delete buttons */
      .es-icon-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 6px;
        border-radius: 7px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s;
      }
      .es-edit-btn { color: #22c55e; }
      .es-edit-btn:hover { background: #f0fdf4; }
      .es-delete-btn { color: #ef4444; }
      .es-delete-btn:hover { background: #fef2f2; }

      /* ── Modal ── */
      .es-modal-overlay {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.45);
        z-index: 4000;
        justify-content: center;
        align-items: center;
        z-index:99999;
      }
      .es-modal-overlay.active { display: flex; }

      .es-modal-box {
        background: white;
        border-radius: 20px;
        width: 90%;
        max-width: 580px;
        max-height: 90vh;
        overflow-y: auto;
        animation: esModalIn 0.2s ease;
        box-shadow: 0 20px 60px rgba(0,0,0,0.18);
      }
      @keyframes esModalIn {
        from { opacity:0; transform:translateY(-20px); }
        to   { opacity:1; transform:translateY(0); }
      }

      .es-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 28px 32px 0;
      }
      .es-modal-title {
        font-size: 1.3rem;
        font-weight: 700;
        color: #0f172a;
        margin-bottom: 4px;
      }
      .es-modal-sub {
        font-size: 0.85rem;
        color: #64748b;
      }
      .es-modal-close {
        background: none;
        border: none;
        font-size: 1.4rem;
        cursor: pointer;
        color: #94a3b8;
        line-height: 1;
        padding: 4px;
        margin-top: -4px;
      }
      .es-modal-close:hover { color: #475569; }

      .es-modal-body {
        padding: 24px 32px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .es-field { display: flex; flex-direction: column; gap: 7px; }
      .es-field label {
        font-size: 0.92rem;
        font-weight: 600;
        color: #0f172a;
      }
      .es-field input,
      .es-field select {
        width: 100%;
        padding: 13px 16px;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        font-size: 0.92rem;
        color: #0f172a;
        background: white;
        box-sizing: border-box;
        transition: border-color 0.15s;
      }
      .es-field input:focus,
      .es-field select:focus {
        outline: none;
        border-color: #22c55e;
        box-shadow: 0 0 0 3px rgba(34,197,94,0.1);
      }
      .es-field input::placeholder { color: #cbd5e1; }
      .es-field select { color: #94a3b8; }
      .es-field select.has-value { color: #0f172a; }

      .es-modal-footer {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 0 32px 28px;
      }
      .es-cancel-btn {
        background: white;
        color: #0f172a;
        border: 1.5px solid #e2e8f0;
        padding: 12px 28px;
        border-radius: 10px;
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
      }
      .es-cancel-btn:hover { background: #f8fafc; border-color: #cbd5e1; }

      .es-create-btn {
        background: #22c55e;
        color: white;
        border: none;
        padding: 12px 28px;
        border-radius: 10px;
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s;
      }
      .es-create-btn:hover { background: #16a34a; }

      /* Error state */
      .es-field input.error,
      .es-field select.error { border-color: #ef4444; }
      .es-err-msg { font-size: 0.78rem; color: #ef4444; margin-top: -4px; }

      @media (max-width: 600px) {
        .es-modal-header { padding: 20px 20px 0; }
        .es-modal-body   { padding: 18px 20px; }
        .es-modal-footer { padding: 0 20px 22px; }
        .es-user-card    { padding: 16px; flex-wrap: wrap; gap: 12px; }
      }
    `;
    document.head.appendChild(s);
  }

  // ── Render user list ──────────────────────────────────────────────────────
  function renderUsers() {
    const wrap = document.getElementById('es-user-list');
    if (!wrap) return;

    if (!users.length) {
      wrap.innerHTML = `<div class="es-empty">Noch keine Benutzer angelegt.<br>Klicken Sie auf „Neuen Benutzer hinzufügen".</div>`;
      return;
    }

    let html = `<div class="es-gesamt"><strong>Gesamt:</strong> ${users.length}</div>`;
    users.forEach(u => {
      const displayName = u.vorname + u.nachname;
      html += `
        <div class="es-user-card">
          <div class="es-user-info">
            <div class="es-user-name">${esc(displayName)}</div>
            <div class="es-user-email">${esc(u.email)}</div>
          </div>
          <div class="es-user-actions">
            <span class="es-role-badge ${u.rolle === 'admin' ? 'admin' : ''}">${esc(u.rolle)}</span>
            <button class="es-icon-btn es-edit-btn" onclick="window.esEditUser(${u.id})" title="Bearbeiten">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="es-icon-btn es-delete-btn" onclick="window.esDeleteUser(${u.id})" title="Löschen">
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
    });
    wrap.innerHTML = html;
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────
  function openModal(mode, userId) {
    editingId = mode === 'edit' ? userId : null;

    const titleEl2 = document.getElementById('es-modal-title');
    const submitBtn = document.getElementById('es-submit-btn');

    if (mode === 'edit') {
      const u = users.find(x => x.id === userId);
      if (!u) return;
      titleEl2.textContent = 'Benutzer bearbeiten';
      submitBtn.textContent = 'Änderungen speichern';
      document.getElementById('es-vorname').value  = u.vorname;
      document.getElementById('es-nachname').value = u.nachname;
      document.getElementById('es-email').value    = u.email;
      document.getElementById('es-passwort').value = '';
      const rolSel = document.getElementById('es-rolle');
      rolSel.value = u.rolle;
      rolSel.classList.add('has-value');
    } else {
      titleEl2.textContent = 'Neuen Benutzer hinzufügen';
      submitBtn.textContent = 'Benutzer erstellen';
      document.getElementById('es-vorname').value  = '';
      document.getElementById('es-nachname').value = '';
      document.getElementById('es-email').value    = '';
      document.getElementById('es-passwort').value = '';
      document.getElementById('es-rolle').value    = '';
      document.getElementById('es-rolle').classList.remove('has-value');
    }

    clearErrors();
    document.getElementById('es-modal').classList.add('active');
  }

  function closeModal() {
    document.getElementById('es-modal').classList.remove('active');
    editingId = null;
  }

  function clearErrors() {
    document.querySelectorAll('.es-err-msg').forEach(e => e.remove());
    document.querySelectorAll('.error').forEach(e => e.classList.remove('error'));
  }

  function showError(inputId, msg) {
    const el = document.getElementById(inputId);
    if (!el) return;
    el.classList.add('error');
    const err = document.createElement('div');
    err.className = 'es-err-msg';
    err.textContent = msg;
    el.insertAdjacentElement('afterend', err);
  }

  function validateForm() {
    clearErrors();
    let ok = true;
    const vn = document.getElementById('es-vorname').value.trim();
    const nn = document.getElementById('es-nachname').value.trim();
    const em = document.getElementById('es-email').value.trim();
    const pw = document.getElementById('es-passwort').value.trim();
    const rl = document.getElementById('es-rolle').value;

    if (!vn) { showError('es-vorname',  'Vorname ist erforderlich');  ok = false; }
    if (!nn) { showError('es-nachname', 'Nachname ist erforderlich'); ok = false; }
    if (!em || !/\S+@\S+\.\S+/.test(em)) { showError('es-email', 'Gültige E-Mail erforderlich'); ok = false; }
    if (!editingId && !pw) { showError('es-passwort', 'Passwort ist erforderlich'); ok = false; }
    if (!rl) { showError('es-rolle', 'Bitte eine Rolle wählen'); ok = false; }

    return ok ? { vn, nn, em, pw, rl } : null;
  }

  // ── Submit (create or update) ─────────────────────────────────────────────
  function handleSubmit() {
    const data = validateForm();
    if (!data) return;

    if (editingId) {
      // Update
      const idx = users.findIndex(u => u.id === editingId);
      if (idx !== -1) {
        users[idx] = {
          ...users[idx],
          vorname:  data.vn,
          nachname: data.nn,
          email:    data.em,
          rolle:    data.rl,
          ...(data.pw ? { passwort: data.pw } : {})
        };
      }
    } else {
      // Create
      users.push({
        id:       nextId++,
        vorname:  data.vn,
        nachname: data.nn,
        email:    data.em,
        passwort: data.pw,
        rolle:    data.rl,
      });
    }

    closeModal();
    renderUsers();
  }

  // ── Global window functions ───────────────────────────────────────────────
  window.esEditUser = (id) => openModal('edit', id);
  window.esDeleteUser = (id) => {
    const u = users.find(x => x.id === id);
    if (!u) return;
    if (confirm(`Benutzer „${u.vorname} ${u.nachname}" wirklich löschen?`)) {
      users = users.filter(x => x.id !== id);
      renderUsers();
    }
  };

  // ── Escape helper ─────────────────────────────────────────────────────────
  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init(contentEl, titleElement) {
    contentArea = contentEl;
    titleEl     = titleElement;

    addStyles();

    if (titleEl) {
      titleEl.innerHTML = `<h1>Einstellung</h1><p>Benutzerverwaltung</p>`;
      titleEl.style.display = 'block';
    }

    if (!contentArea) return;
    contentArea.innerHTML = getHTML();
    renderUsers();

    // Open create modal
    document.getElementById('es-open-create')?.addEventListener('click', () => openModal('create'));

    // Close modal
    document.getElementById('es-modal-close')?.addEventListener('click', closeModal);
    document.getElementById('es-cancel-btn')?.addEventListener('click', closeModal);
    document.getElementById('es-modal')?.addEventListener('click', e => {
      if (e.target === document.getElementById('es-modal')) closeModal();
    });

    // Submit
    document.getElementById('es-submit-btn')?.addEventListener('click', handleSubmit);

    // Role select color
    document.getElementById('es-rolle')?.addEventListener('change', e => {
      e.target.classList.toggle('has-value', !!e.target.value);
    });

    console.log('✅ Einstellung page loaded');
  }

  return { init };
})();

window.einstellungPage = einstellungPage;
// Alias for English route naming
window.settingsPage = window.einstellungPage;
console.log('einstellung.js loaded - window.einstellungPage exists:', !!window.einstellungPage);