package ma.aui.darija.llm;

/** Raised when the LLM backend fails (network error, bad API key, blocked output...). */
public class LlmException extends Exception {

    private static final long serialVersionUID = 1L;

    public LlmException(String message) {
        super(message);
    }

    public LlmException(String message, Throwable cause) {
        super(message, cause);
    }
}
