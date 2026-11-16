// Thin client for the Darija Translator REST API (shared by the side panel).

const DarijaApi = (() => {
  const DEFAULTS = {
    serverUrl: "http://localhost:8080/translator/api",
    username: "student",
    password: "darija2026"
  };

  /** UTF-8 safe base64 (btoa alone fails on non-Latin-1 passwords). */
  function base64(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = "";
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
  }

  function baseUrl(settings) {
    return (settings.serverUrl || DEFAULTS.serverUrl).replace(/\/+$/, "");
  }

  async function readJson(res) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  /**
   * POST /translate. Resolves with the server's JSON, rejects with a readable Error.
   * credentials:"omit" stops Chrome from popping up its own Basic-auth dialog on a 401.
   */
  async function translate(settings, text, { sourceLanguage = "auto", script = "arabic" } = {}) {
    let res;
    try {
      res = await fetch(baseUrl(settings) + "/translate", {
        method: "POST",
        credentials: "omit",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: "Basic " + base64(`${settings.username}:${settings.password}`)
        },
        body: JSON.stringify({ text, sourceLanguage, script })
      });
    } catch (err) {
      throw new Error(`Cannot reach the server at ${baseUrl(settings)}. Is it running?`);
    }
    const data = await readJson(res);
    if (res.status === 401) throw new Error("Wrong username or password (401). Check Server settings.");
    if (!res.ok) throw new Error((data && data.message) || `Server error (HTTP ${res.status})`);
    return data;
  }

  /** GET /health (public). */
  async function health(settings) {
    const res = await fetch(baseUrl(settings) + "/health", { credentials: "omit" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  return { DEFAULTS, base64, translate, health };
})();

if (typeof module !== "undefined") module.exports = DarijaApi; // for Node tests
