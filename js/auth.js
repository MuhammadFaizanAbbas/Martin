const MSDachAuth = (function () {
  const USERS_STORAGE_KEY = "msdach-users-v1";
  const SESSION_STORAGE_KEY = "msdach-session-v1";
  const AUTH_LOCK_STORAGE_KEY = "msdach-auth-lock-v1";
  const LOCAL_DEV_API_ORIGIN = "http://127.0.0.1:3001";

  const DEFAULT_USERS = [
    { id: 1, vorname: "Martin", nachname: "Schwaak", email: "admin@msdach.com", passwort: "admin123", rolle: "admin", active: true, delegatedTo: "" },
    { id: 2, vorname: "Andre", nachname: "Philipp", email: "andre@msdach.com", passwort: "user123", rolle: "backoffice", active: true, delegatedTo: "" },
    { id: 3, vorname: "Philipp", nachname: "Kruse", email: "philipp@msdach.com", passwort: "user123", rolle: "teamlead", active: true, delegatedTo: "" },
  ];

  function normalizeUser(user) {
    return {
      id: user.id,
      vorname: String(user.vorname || "").trim(),
      nachname: String(user.nachname || "").trim(),
      email: String(user.email || "").trim().toLowerCase(),
      passwort: String(user.passwort || ""),
      rolle: String(user.rolle || "backoffice").trim() || "backoffice",
      active: user.active !== false,
      delegatedTo: String(user.delegatedTo || "").trim(),
    };
  }

  function loadUsers() {
    try {
      const raw = localStorage.getItem(USERS_STORAGE_KEY);
      if (!raw) {
        saveUsers(DEFAULT_USERS);
        return DEFAULT_USERS.map(normalizeUser);
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.length) {
        saveUsers(DEFAULT_USERS);
        return DEFAULT_USERS.map(normalizeUser);
      }

      return parsed.map(normalizeUser);
    } catch {
      saveUsers(DEFAULT_USERS);
      return DEFAULT_USERS.map(normalizeUser);
    }
  }

  function saveUsers(users) {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users.map(normalizeUser)));
    } catch {}
  }

  function getDisplayName(user) {
    return [user?.vorname, user?.nachname].filter(Boolean).join(" ").trim() || user?.email || "Benutzer";
  }

  function getInitial(user) {
    return (String(user?.vorname || user?.email || "M").trim().charAt(0) || "M").toUpperCase();
  }

  function getSessionUser() {
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (session?.user) return normalizeUser(session.user);
      const email = String(session?.email || "").trim().toLowerCase();
      if (!email) return null;
      return loadUsers().find((user) => user.email === email && user.active !== false) || null;
    } catch {
      return null;
    }
  }

  function setSession(user) {
    try {
      const normalizedUser = normalizeUser(user);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ email: normalizedUser.email, role: normalizedUser.rolle, user: normalizedUser, signedInAt: new Date().toISOString() }));
      localStorage.removeItem(AUTH_LOCK_STORAGE_KEY);
    } catch {}
  }

  function clearSession() {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {}
  }

  function setMessage(message, type = "error") {
    const el = document.getElementById("authMessage");
    if (!el) return;
    el.textContent = message || "";
    el.classList.toggle("success", type === "success");
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

  function applyCurrentUserToShell() {
    const user = getSessionUser();
    if (!user) return;

    document.querySelectorAll(".sidebar-footer .user-name, .user-name").forEach((el) => {
      el.textContent = getDisplayName(user);
    });
    document.querySelectorAll(".avatar").forEach((el) => {
      el.textContent = getInitial(user);
    });

    document.body.dataset.userRole = user.rolle;
    window.currentMSDachUser = user;
  }

  function showApp() {
    document.body.classList.remove("auth-locked");
    applyCurrentUserToShell();
    window.dispatchEvent(new CustomEvent("msdach:auth-ready"));
  }

  function showAuth() {
    document.body.classList.add("auth-locked");
    window.currentMSDachUser = null;
  }

  async function loginViaApi(email, password) {
    const response = await fetch(`${resolveApiUrl("/api/auth_users")}?action=login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.status === "error") {
      throw new Error(data.message || `HTTP ${response.status}`);
    }

    return data.user;
  }

  async function handleLogin(event) {
    event.preventDefault();
    const email = String(document.getElementById("loginEmail")?.value || "").trim().toLowerCase();
    const password = String(document.getElementById("loginPassword")?.value || "");

    if (!email || !password) {
      setMessage("Bitte E-Mail und Passwort eingeben.");
      return;
    }

    const submitBtn = document.querySelector("#loginForm .auth-primary-btn");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Wird angemeldet...";
    }

    try {
      const apiUser = await loginViaApi(email, password);
      setSession(apiUser);
      setMessage("Login erfolgreich.", "success");
      showApp();
      return;
    } catch (apiError) {
      const user = loadUsers().find((item) => item.email === email);
      const isDefaultMaskedPassword = user?.passwort === "********" && user?.rolle === "admin" && password === "admin123";
      if (!user || user.active === false || (user.passwort !== password && !isDefaultMaskedPassword)) {
        setMessage(apiError?.message || "E-Mail oder Passwort ist falsch.");
        return;
      }

      setSession(user);
      setMessage("Login erfolgreich.", "success");
      showApp();
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Login";
      }
    }
  }

  function logout() {
    clearSession();
    try {
      localStorage.setItem(AUTH_LOCK_STORAGE_KEY, "1");
    } catch {}
    showAuth();
    setMessage("");
  }

  function init() {
    loadUsers();

    document.getElementById("loginForm")?.addEventListener("submit", handleLogin);

    setMessage("");
    if (getSessionUser()) {
      showApp();
      return;
    }

    let shouldShowLogin = false;
    try {
      shouldShowLogin = localStorage.getItem(AUTH_LOCK_STORAGE_KEY) === "1";
    } catch {}

    if (shouldShowLogin) {
      showAuth();
    } else {
      document.body.classList.remove("auth-locked");
    }
  }

  return {
    init,
    logout,
    isAuthenticated: () => !!getSessionUser(),
    getCurrentUser: getSessionUser,
    applyCurrentUserToShell,
    loadUsers,
    saveUsers,
  };
})();

window.MSDachAuth = MSDachAuth;

document.addEventListener("DOMContentLoaded", () => {
  MSDachAuth.init();
});
