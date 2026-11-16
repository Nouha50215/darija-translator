// REST client for the Darija Translator API (React Native).
import { Platform } from "react-native";

// Android emulator reaches the host machine through 10.0.2.2; iOS simulator through localhost.
// On a physical phone use your computer's LAN IP, e.g. http://192.168.1.20:8080/translator/api
export const DEFAULT_SETTINGS = {
  serverUrl:
    Platform.OS === "android"
      ? "http://10.0.2.2:8080/translator/api"
      : "http://localhost:8080/translator/api",
  username: "student",
  password: "darija2026",
};

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function utf8Bytes(str) {
  const bytes = [];
  for (const ch of str) {
    const cp = ch.codePointAt(0);
    if (cp < 0x80) bytes.push(cp);
    else if (cp < 0x800) bytes.push(0xc0 | (cp >> 6), 0x80 | (cp & 63));
    else if (cp < 0x10000) bytes.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
    else bytes.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
  }
  return bytes;
}

/** UTF-8 safe base64 encoder (no dependency on btoa/Buffer). */
export function base64(str) {
  const bytes = utf8Bytes(str);
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const [a, b = 0, c = 0] = [bytes[i], bytes[i + 1], bytes[i + 2]];
    const n = (a << 16) | (b << 8) | c;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    out += i + 1 < bytes.length ? B64[(n >> 6) & 63] : "=";
    out += i + 2 < bytes.length ? B64[n & 63] : "=";
  }
  return out;
}

function baseUrl(settings) {
  return (settings.serverUrl || DEFAULT_SETTINGS.serverUrl).replace(/\/+$/, "");
}

async function fetchWithTimeout(url, options, ms = 60000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function translate(settings, text, { sourceLanguage = "auto", script = "arabic" } = {}) {
  let res;
  try {
    res = await fetchWithTimeout(baseUrl(settings) + "/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: "Basic " + base64(`${settings.username}:${settings.password}`),
      },
      body: JSON.stringify({ text, sourceLanguage, script }),
    });
  } catch (e) {
    throw new Error(`Cannot reach ${baseUrl(settings)}. Check the server URL and that your phone is on the same network.`);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON body
  }
  if (res.status === 401) throw new Error("Wrong username or password (401).");
  if (!res.ok) throw new Error((data && data.message) || `Server error (HTTP ${res.status})`);
  return data;
}

export async function health(settings) {
  const res = await fetchWithTimeout(baseUrl(settings) + "/health", {}, 8000);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
