import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as Speech from "expo-speech";
import * as Clipboard from "expo-clipboard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_SETTINGS, health, translate } from "./src/api";

const RED = "#c1272d";
const GREEN = "#006233";
const SOURCES = ["auto", "English", "French", "Spanish", "Modern Standard Arabic"];
const SOURCE_LABELS = { auto: "Detect", "Modern Standard Arabic": "Fus7a" };

export default function App() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [text, setText] = useState("");
  const [source, setSource] = useState("auto");
  const [script, setScript] = useState("arabic");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [serverInfo, setServerInfo] = useState({ up: null, label: "checking…" });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load saved settings + history once.
  useEffect(() => {
    (async () => {
      try {
        const [s, h] = await Promise.all([AsyncStorage.getItem("settings"), AsyncStorage.getItem("history")]);
        const loaded = s ? { ...DEFAULT_SETTINGS, ...JSON.parse(s) } : DEFAULT_SETTINGS;
        setSettings(loaded);
        if (h) setHistory(JSON.parse(h));
        checkServer(loaded);
      } catch {
        checkServer(DEFAULT_SETTINGS);
      }
    })();
  }, []);

  const checkServer = useCallback(async (s) => {
    try {
      const h = await health(s);
      setServerInfo({ up: true, label: `${h.provider} / ${h.model}` });
      return true;
    } catch {
      setServerInfo({ up: false, label: "server unreachable" });
      return false;
    }
  }, []);

  const onTranslate = async (scriptOverride) => {
    const value = text.trim();
    if (!value || loading) return;
    const useScript = typeof scriptOverride === "string" ? scriptOverride : script;
    setLoading(true);
    setError("");
    try {
      const r = await translate(settings, value, { sourceLanguage: source, script: useScript });
      setResult(r);
      setServerInfo((prev) => ({ ...prev, up: true }));
      const next = [{ src: r.originalText, dst: r.translation, script: r.script, ts: Date.now() }, ...history].slice(0, 20);
      setHistory(next);
      AsyncStorage.setItem("history", JSON.stringify(next)).catch(() => {});
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const onScript = (value) => {
    setScript(value);
    if (result && text.trim()) onTranslate(value);
  };

  const speak = () => {
    if (!result) return;
    Speech.stop();
    // Arabic voice for Arabic script; Arabizi reads better with a French voice.
    Speech.speak(result.translation, { language: result.script === "arabic" ? "ar" : "fr-FR", rate: 0.95 });
  };

  const copy = async () => {
    if (!result) return;
    await Clipboard.setStringAsync(result.translation);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const pasteInput = async () => {
    const value = await Clipboard.getStringAsync();
    if (value) setText(value);
  };

  const share = () => result && Share.share({ message: result.translation });

  const saveSettings = async (s) => {
    setSettings(s);
    await AsyncStorage.setItem("settings", JSON.stringify(s));
    return checkServer(s);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Darija Translator</Text>
          <Text style={styles.subtitle}>
            <Text style={{ color: serverInfo.up ? "#9ef0bf" : serverInfo.up === false ? "#ffd0d0" : "#f3c623" }}>● </Text>
            {serverInfo.label}
          </Text>
        </View>
        <Pressable onPress={() => setSettingsOpen(true)} hitSlop={10} accessibilityLabel="Settings">
          <Text style={styles.gear}>⚙️</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {SOURCES.map((s) => (
              <Pressable key={s} onPress={() => setSource(s)} style={[styles.chip, source === s && styles.chipActive]}>
                <Text style={[styles.chipText, source === s && styles.chipTextActive]}>{SOURCE_LABELS[s] || s}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.card}>
            <TextInput
              style={styles.input}
              multiline
              placeholder="Type or paste text in any language…"
              placeholderTextColor="#9a958f"
              value={text}
              onChangeText={setText}
              maxLength={5000}
            />
            <View style={styles.row}>
              <Pressable onPress={pasteInput} style={styles.smallBtn}><Text>📋 Paste</Text></Pressable>
              <Pressable onPress={() => { setText(""); setResult(null); setError(""); }} style={styles.smallBtn}>
                <Text>✕ Clear</Text>
              </Pressable>
              <Text style={styles.count}>{text.length}</Text>
            </View>
          </View>

          <View style={[styles.row, { marginVertical: 12 }]}>
            <View style={styles.segment}>
              {[["arabic", "عربية"], ["latin", "3arabizi"]].map(([value, label]) => (
                <Pressable key={value} onPress={() => onScript(value)} style={[styles.seg, script === value && styles.segActive]}>
                  <Text style={[styles.segText, script === value && { color: "#fff" }]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={onTranslate} disabled={loading || !text.trim()}
              style={[styles.primary, (loading || !text.trim()) && { opacity: 0.6 }]}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Translate</Text>}
            </Pressable>
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}

          {result && (
            <View style={styles.card}>
              <Text style={styles.label}>Darija</Text>
              <Text selectable style={[styles.output, result.script === "arabic" && styles.rtl]}>{result.translation}</Text>
              <View style={styles.row}>
                <Pressable onPress={speak} style={styles.smallBtn}><Text>🔊 Listen</Text></Pressable>
                <Pressable onPress={copy} style={styles.smallBtn}><Text>{copied ? "✓ Copied" : "📄 Copy"}</Text></Pressable>
                <Pressable onPress={share} style={styles.smallBtn}><Text>↗ Share</Text></Pressable>
              </View>
              <Text style={styles.meta}>{result.provider} · {result.model} · {result.durationMs} ms</Text>
            </View>
          )}

          {history.length > 0 && (
            <View style={[styles.card, { marginTop: 12 }]}>
              <View style={styles.row}>
                <Text style={styles.label}>History</Text>
                <Pressable onPress={() => { setHistory([]); AsyncStorage.removeItem("history"); }}>
                  <Text style={styles.link}>clear</Text>
                </Pressable>
              </View>
              <FlatList
                scrollEnabled={false}
                data={history}
                keyExtractor={(item) => String(item.ts)}
                renderItem={({ item }) => (
                  <Pressable onPress={() => { setText(item.src); setResult({ originalText: item.src, translation: item.dst, script: item.script, provider: "history", model: "", durationMs: 0 }); }}
                    style={styles.historyItem}>
                    <Text style={styles.historySrc} numberOfLines={1}>{item.src}</Text>
                    <Text style={[styles.historyDst, item.script === "arabic" && styles.rtl]} numberOfLines={2}>{item.dst}</Text>
                  </Pressable>
                )}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <SettingsModal visible={settingsOpen} initial={settings} onClose={() => setSettingsOpen(false)} onSave={saveSettings} />
    </SafeAreaView>
  );
}

function SettingsModal({ visible, initial, onClose, onSave }) {
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (visible) {
      setForm(initial);
      setStatus("");
    }
  }, [visible, initial]);

  const field = (key, label, props = {}) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.field} value={form[key]} autoCapitalize="none" autoCorrect={false}
        onChangeText={(v) => setForm({ ...form, [key]: v })} {...props} />
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { padding: 20 }]}>
        <Text style={[styles.title, { color: "#1f1f1f", marginBottom: 16 }]}>Server settings</Text>
        {field("serverUrl", "API base URL", { keyboardType: "url", placeholder: DEFAULT_SETTINGS.serverUrl })}
        {field("username", "Username")}
        {field("password", "Password", { secureTextEntry: true })}
        <Text style={styles.hint}>
          On a real phone use your computer's IP address (e.g. http://192.168.1.20:8080/translator/api), not localhost.
        </Text>
        {!!status && <Text style={{ marginVertical: 8 }}>{status}</Text>}
        <View style={[styles.row, { marginTop: 12 }]}>
          <Pressable style={styles.smallBtn} onPress={onClose}><Text>Cancel</Text></Pressable>
          <Pressable style={styles.primary} onPress={async () => {
            setStatus("Checking…");
            const ok = await onSave(form);
            setStatus(ok ? "Saved ✓ server reachable" : "Saved, but the server is unreachable");
            if (ok) setTimeout(onClose, 600);
          }}>
            <Text style={styles.primaryText}>Save</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f5f2" },
  header: {
    backgroundColor: RED, paddingHorizontal: 18, paddingTop: Platform.OS === "android" ? 36 : 12, paddingBottom: 14,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  title: { color: "#fff", fontSize: 20, fontWeight: "700" },
  subtitle: { color: "#fff", fontSize: 12, marginTop: 2 },
  gear: { fontSize: 22 },
  body: { padding: 16, paddingBottom: 40 },
  chips: { gap: 8, paddingBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: "#e3ded7", backgroundColor: "#fff" },
  chipActive: { backgroundColor: GREEN, borderColor: GREEN },
  chipText: { color: "#1f1f1f" },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  card: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e3ded7", padding: 12 },
  input: { minHeight: 120, fontSize: 16, textAlignVertical: "top", color: "#1f1f1f" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  smallBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "#e3ded7", backgroundColor: "#fff" },
  count: { color: "#9a958f", marginLeft: "auto" },
  segment: { flexDirection: "row", borderWidth: 1, borderColor: "#e3ded7", borderRadius: 8, overflow: "hidden" },
  seg: { paddingHorizontal: 14, paddingVertical: 9, backgroundColor: "#fff" },
  segActive: { backgroundColor: RED },
  segText: { color: "#1f1f1f" },
  primary: { backgroundColor: GREEN, paddingHorizontal: 22, paddingVertical: 11, borderRadius: 8, minWidth: 110, alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  error: { backgroundColor: "#fde8e8", color: "#8a1c1c", padding: 10, borderRadius: 8, marginBottom: 12 },
  label: { color: GREEN, fontWeight: "700", marginBottom: 6 },
  output: { fontSize: 22, lineHeight: 36, color: "#1f1f1f", marginBottom: 10 },
  rtl: { textAlign: "right", writingDirection: "rtl" },
  meta: { color: "#9a958f", fontSize: 11, marginTop: 8 },
  link: { color: "#6b6b6b", textDecorationLine: "underline" },
  historyItem: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e3ded7" },
  historySrc: { color: "#6b6b6b", fontSize: 12 },
  historyDst: { fontSize: 16, color: "#1f1f1f" },
  fieldLabel: { color: "#6b6b6b", fontSize: 12, marginBottom: 4 },
  field: { borderWidth: 1, borderColor: "#e3ded7", borderRadius: 8, padding: 10, backgroundColor: "#fff", fontSize: 15 },
  hint: { color: "#6b6b6b", fontSize: 12 },
});
