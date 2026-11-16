package ma.aui.darija.llm;

/**
 * Abstraction over a Large Language Model. Implementations send a system
 * instruction plus a user message and return the model's plain-text answer.
 * (Strategy pattern: the translation service doesn't know which LLM it talks to.)
 */
public interface LlmClient {

    /**
     * @param systemInstruction how the model must behave (translator rules)
     * @param userMessage       the text to process
     * @return the model's text output
     * @throws LlmException if the model cannot be reached or returns no answer
     */
    String complete(String systemInstruction, String userMessage) throws LlmException;

    /** Short provider name, e.g. "gemini" or "ollama". */
    String provider();

    /** Model identifier, e.g. "gemini-2.5-flash". */
    String model();
}
