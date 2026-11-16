// Side panel UI logic.

const $ = (id) => document.getElementById(id);
const els = {
  input: $("input"), output: $("output"), meta: $("meta"), message: $("message"), status: $("status"),
  sourceLang: $("sourceLang"), charCount: $("charCount"),
  translateBtn: $("translateBtn"), micBtn: $("micBtn"), speakBtn: $("speakBtn"),
  speakSourceBtn: $("speakSourceBtn"), copyBtn: $("copyBtn"), clearBtn: $("clearBtn"),
  pageSelBtn: $("pageSelBtn"), voiceMode: $("voiceMode"), autoTranslate: $("autoTranslate"),
  autoCopy: $("autoCopy"), history: $("history"), clearHistoryBtn: $("clearHistoryBtn"),
  serverUrl: $("serverUrl"), username: $("username"), password: $("password"),
  saveSettingsBtn: $("saveSettingsBtn"), testBtn: $("testBtn")
};

let settings = { ...DarijaApi.DEFAULTS };
let script = "arabic";
let lastResult = null;
let busy = false;

// ---------- startup ----------
init();

async function init() {
  const stored = await chrome.storage.local.get(["settings", "prefs"]);
  settings = { ...DarijaApi.DEFAULTS, ...(stored.settings || {}) };
  const prefs = stored.prefs || {};
  els.serverUrl.value = settings.serverUrl;
  els.username.value = settings.username;
  els.password.value = settings.password;
  els.voiceMode.checked = !!prefs.voiceMode;
  els.autoTranslate.checked = prefs.autoTranslate !== false;
  els.autoCopy.checked = !!prefs.autoCopy;
  if (prefs.sourceLang) els.sourceLang.value = prefs.sourceLang;
  if (prefs.script) setScript(prefs.script);

  renderHistory();
  checkServer();

  // Text selected before the panel was opened (context menu / shortcut).
  const { pendingText } = await chrome.storage.session.get("pendingText");
  if (pendingText && Date.now() - pendingText.ts < 15000) receiveSelection(pendingText.text);

  // Text selected while the panel is already open.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "session" && changes.pendingText && changes.pendingText.newValue) {
      receiveSelection(changes.pendingText.newValue.text);
    }
  });
}

function receiveSelection(text) {
  chrome.storage.session.remove("pendingText");
  els.input.value = text; // the "auto copy & paste" of the selection
  updateCount();
  if (els.autoTranslate.checked) translate();
}

// ---------- translation ----------
async function translate() {
  const text = els.input.value.trim();
  if (!text || busy) {
    if (!text) showMessage("Type, paste, speak or select some text first.", "info");
    return null;
  }
  busy = true;
  els.translateBtn.disabled = true;
  els.translateBtn.textContent = "Translating…";
  els.output.classList.add("loading");
  hideMessage();
  try {
    const result = await DarijaApi.translate(settings, text, {
      sourceLanguage: els.sourceLang.value,
      script
    });
    showResult(result);
    addToHistory(result);
    if (els.autoCopy.checked) copy(result.translation, true);
    setStatus(true);
    return result;
  } catch (err) {
    showMessage(err.message, "error");
    if (/reach/.test(err.message)) setStatus(false);
    return null;
  } finally {
    busy = false;
    els.translateBtn.disabled = false;
    els.translateBtn.textContent = "Translate";
    els.output.classList.remove("loading");
  }
}

function showResult(result) {
  lastResult = result;
  els.output.textContent = result.translation;
  els.output.dir = result.script === "arabic" ? "rtl" : "ltr";
  els.meta.textContent = `${result.provider} · ${result.model} · ${result.durationMs} ms${result.cached ? " · cached" : ""}`;
  els.speakBtn.disabled = false;
  els.copyBtn.disabled = false;
}

// ---------- text to speech (read aloud) ----------
function pickVoice(langPrefix) {
  const voices = speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.toLowerCase() === "ar-ma") ||
    voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix)) ||
    null
  );
}

function speak(text, lang) {
  if (!text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  if (lang === "ar") {
    const voice = pickVoice("ar");
    if (voice) u.voice = voice;
    u.lang = voice ? voice.lang : "ar-MA";
    u.rate = 0.95;
  } else if (lang) {
    u.lang = lang;
  }
  speechSynthesis.speak(u);
}

function speakResult() {
  if (!lastResult) return;
  // Arabizi read by an Arabic voice sounds wrong; use the browser default voice for it.
  speak(lastResult.translation, lastResult.script === "arabic" ? "ar" : "fr-FR");
}

speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();

// ---------- speech to text (voice input / voice-to-voice) ----------
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognizer = null;

async function startListening() {
  if (!Recognition) {
    showMessage("Speech recognition isn't supported in this browser.", "error");
    return;
  }
  if (recognizer) {
    recognizer.stop();
    return;
  }
  // Side panels can't show the microphone prompt, so grant it once in a normal tab.
  const granted = await micPermissionGranted();
  if (!granted) {
    chrome.tabs.create({ url: chrome.runtime.getURL("permission.html") });
    showMessage("Allow the microphone in the tab that just opened, then click 🎤 again.", "info");
    return;
  }

  const option = els.sourceLang.selectedOptions[0];
  recognizer = new Recognition();
  recognizer.lang = (option && option.dataset.speech) || "en-US";
  recognizer.interimResults = true;
  recognizer.maxAlternatives = 1;

  els.micBtn.classList.add("recording");
  showMessage(`Listening (${recognizer.lang})… speak now.`, "info");

  recognizer.onresult = (event) => {
    let transcript = "";
    for (const r of event.results) transcript += r[0].transcript;
    els.input.value = transcript;
    updateCount();
  };
  recognizer.onerror = (event) => {
    showMessage(`Microphone error: ${event.error}`, "error");
  };
  recognizer.onend = async () => {
    els.micBtn.classList.remove("recording");
    recognizer = null;
    if (els.message.classList.contains("info")) hideMessage();
    if (els.input.value.trim()) {
      const result = await translate();
      if (result && els.voiceMode.checked) speakResult(); // voice-to-voice
    }
  };
  recognizer.start();
}

async function micPermissionGranted() {
  try {
    const status = await navigator.permissions.query({ name: "microphone" });
    return status.state === "granted";
  } catch {
    return true; // permissions API unavailable: just try
  }
}

// ---------- page selection on demand ----------
async function useSelectionFromPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection().toString()
    });
    const text = (res && res.result ? res.result : "").trim();
    if (text) receiveSelection(text);
    else showMessage("Nothing is selected on the page.", "info");
  } catch {
    showMessage("Can't read this page. Use right-click → Translate to Darija instead.", "error");
  }
}

// ---------- clipboard ----------
async function copy(text, silent = false) {
  try {
    await navigator.clipboard.writeText(text);
    if (!silent) flash(els.copyBtn, "✓");
  } catch {
    if (!silent) showMessage("Couldn't access the clipboard.", "error");
  }
}

// ---------- history ----------
async function addToHistory(result) {
  const { history = [] } = await chrome.storage.local.get("history");
  history.unshift({ src: result.originalText, dst: result.translation, script: result.script, ts: Date.now() });
  await chrome.storage.local.set({ history: history.slice(0, 20) });
  renderHistory();
}

async function renderHistory() {
  const { history = [] } = await chrome.storage.local.get("history");
  els.history.replaceChildren(
    ...history.map((h) => {
      const li = document.createElement("li");
      const src = document.createElement("div");
      src.className = "h-src";
      src.textContent = h.src;
      const dst = document.createElement("div");
      dst.className = "h-dst";
      dst.dir = h.script === "arabic" ? "rtl" : "ltr";
      dst.textContent = h.dst;
      li.append(src, dst);
      li.title = "Click to reuse";
      li.onclick = () => {
        els.input.value = h.src;
        updateCount();
        showResult({ ...h, translation: h.dst, originalText: h.src, provider: "history", model: "", durationMs: 0 });
      };
      return li;
    })
  );
  if (!history.length) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = "No translations yet.";
    els.history.append(li);
  }
}

// ---------- settings ----------
async function saveSettings() {
  const url = els.serverUrl.value.trim() || DarijaApi.DEFAULTS.serverUrl;
  // Ask for host permission if the server isn't on localhost (must happen in the click handler).
  try {
    const origin = new URL(url).origin + "/*";
    const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/\*$/.test(origin);
    if (!isLocal) {
      const ok = await chrome.permissions.request({ origins: [origin] });
      if (!ok) return showMessage("Permission to reach that server was refused.", "error");
    }
  } catch {
    return showMessage("That URL doesn't look valid.", "error");
  }
  settings = { serverUrl: url, username: els.username.value.trim(), password: els.password.value };
  await chrome.storage.local.set({ settings });
  showMessage("Settings saved.", "success");
  checkServer();
}

async function checkServer() {
  try {
    const h = await DarijaApi.health(settings);
    setStatus(true, `Server up · ${h.provider} / ${h.model}`);
    return h;
  } catch {
    setStatus(false, "Server unreachable");
    return null;
  }
}

async function testConnection() {
  const h = await checkServer();
  if (!h) return showMessage(`No response from ${settings.serverUrl}/health`, "error");
  try {
    await DarijaApi.translate(settings, "Hello", { script });
    showMessage(`Connected and authenticated ✓ (${h.provider} / ${h.model})`, "success");
  } catch (err) {
    showMessage(err.message, "error");
  }
}

function savePrefs() {
  chrome.storage.local.set({
    prefs: {
      voiceMode: els.voiceMode.checked,
      autoTranslate: els.autoTranslate.checked,
      autoCopy: els.autoCopy.checked,
      sourceLang: els.sourceLang.value,
      script
    }
  });
}

// ---------- small UI helpers ----------
function setScript(value) {
  script = value === "latin" ? "latin" : "arabic";
  document.querySelectorAll(".seg").forEach((b) => b.classList.toggle("active", b.dataset.script === script));
}

function setStatus(up, title) {
  els.status.classList.toggle("up", up);
  els.status.classList.toggle("down", !up);
  if (title) els.status.title = title;
}

function showMessage(text, kind) {
  els.message.textContent = text;
  els.message.className = `message ${kind}`;
}

function hideMessage() {
  els.message.className = "message hidden";
}

function flash(button, symbol) {
  const old = button.textContent;
  button.textContent = symbol;
  setTimeout(() => (button.textContent = old), 900);
}

function updateCount() {
  els.charCount.textContent = els.input.value.length;
}

// ---------- events ----------
els.translateBtn.onclick = translate;
els.micBtn.onclick = startListening;
els.speakBtn.onclick = speakResult;
els.speakSourceBtn.onclick = () => {
  const opt = els.sourceLang.selectedOptions[0];
  speak(els.input.value, (opt && opt.dataset.speech) || undefined);
};
els.copyBtn.onclick = () => lastResult && copy(lastResult.translation);
els.clearBtn.onclick = () => {
  els.input.value = "";
  els.output.textContent = "";
  els.meta.textContent = "";
  lastResult = null;
  els.speakBtn.disabled = els.copyBtn.disabled = true;
  updateCount();
  hideMessage();
};
els.pageSelBtn.onclick = useSelectionFromPage;
els.input.addEventListener("input", updateCount);
els.input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) translate();
});
document.querySelectorAll(".seg").forEach((b) =>
  b.addEventListener("click", () => {
    setScript(b.dataset.script);
    savePrefs();
    if (els.input.value.trim() && lastResult) translate();
  })
);
[els.voiceMode, els.autoTranslate, els.autoCopy, els.sourceLang].forEach((el) => el.addEventListener("change", savePrefs));
els.saveSettingsBtn.onclick = saveSettings;
els.testBtn.onclick = testConnection;
els.clearHistoryBtn.onclick = async () => {
  await chrome.storage.local.set({ history: [] });
  renderHistory();
};
