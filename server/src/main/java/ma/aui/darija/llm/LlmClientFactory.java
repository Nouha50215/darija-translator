package ma.aui.darija.llm;

import ma.aui.darija.config.AppConfig;

/** Creates the {@link LlmClient} selected by the LLM_PROVIDER setting (Factory pattern). */
public final class LlmClientFactory {

    private LlmClientFactory() {
    }

    public static LlmClient create(AppConfig config) {
        return switch (config.llmProvider()) {
            case "ollama" -> new OllamaClient(config.ollamaUrl(), config.ollamaModel());
            case "gemini" -> new GeminiClient(config.geminiApiKey(), config.geminiModel());
            default -> throw new IllegalStateException(
                    "Unknown LLM_PROVIDER '" + config.llmProvider() + "' (use 'gemini' or 'ollama')");
        };
    }
}
