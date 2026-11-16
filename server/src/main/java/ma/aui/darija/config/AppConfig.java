package ma.aui.darija.config;

import jakarta.enterprise.context.ApplicationScoped;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.logging.Logger;

/**
 * Central configuration. Every value is read from an environment variable first,
 * then from a JVM system property with the same name, then a default.
 *
 * <pre>
 *   LLM_PROVIDER      gemini | ollama            (default: gemini)
 *   GEMINI_API_KEY    your Google AI Studio key  (required for gemini)
 *   GEMINI_MODEL      e.g. gemini-2.5-flash      (default: gemini-2.5-flash)
 *   OLLAMA_URL        e.g. http://localhost:11434
 *   OLLAMA_MODEL      e.g. qwen2.5:3b
 *   TRANSLATOR_USERS  user:password[,user2:password2]
 *   MAX_TEXT_LENGTH   max characters per request (default: 5000)
 * </pre>
 */
@ApplicationScoped
public class AppConfig {

    private static final Logger LOG = Logger.getLogger(AppConfig.class.getName());

    public static final String DEFAULT_USERS = "student:darija2026";

    public String get(String key, String defaultValue) {
        String value = System.getenv(key);
        if (value == null || value.isBlank()) {
            value = System.getProperty(key);
        }
        return (value == null || value.isBlank()) ? defaultValue : value.trim();
    }

    public String llmProvider() {
        return get("LLM_PROVIDER", "gemini").toLowerCase();
    }

    public String geminiApiKey() {
        return get("GEMINI_API_KEY", "");
    }

    public String geminiModel() {
        return get("GEMINI_MODEL", "gemini-2.5-flash");
    }

    public String ollamaUrl() {
        return get("OLLAMA_URL", "http://localhost:11434");
    }

    public String ollamaModel() {
        return get("OLLAMA_MODEL", "qwen2.5:3b");
    }

    public int maxTextLength() {
        try {
            return Integer.parseInt(get("MAX_TEXT_LENGTH", "5000"));
        } catch (NumberFormatException e) {
            return 5000;
        }
    }

    /** Parses TRANSLATOR_USERS ("alice:pw1,bob:pw2") into a username -> password map. */
    public Map<String, String> users() {
        String raw = get("TRANSLATOR_USERS", DEFAULT_USERS);
        if (DEFAULT_USERS.equals(raw)) {
            LOG.warning("TRANSLATOR_USERS not set - using the demo account 'student'. "
                    + "Set TRANSLATOR_USERS before deploying anywhere public.");
        }
        return parseUsers(raw);
    }

    public static Map<String, String> parseUsers(String raw) {
        Map<String, String> users = new LinkedHashMap<>();
        if (raw == null) {
            return users;
        }
        for (String entry : raw.split(",")) {
            int idx = entry.indexOf(':');
            if (idx > 0 && idx < entry.length() - 1) {
                users.put(entry.substring(0, idx).trim(), entry.substring(idx + 1).trim());
            }
        }
        return users;
    }
}
