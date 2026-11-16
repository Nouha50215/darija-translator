package ma.aui.darija.model;

/**
 * JSON body accepted by POST /api/translate.
 * <pre>
 * { "text": "How are you?", "sourceLanguage": "English", "script": "arabic" }
 * </pre>
 * Only {@code text} is required. {@code sourceLanguage} defaults to auto-detect,
 * {@code script} is "arabic" (default) or "latin" (Arabizi, e.g. "labas 3lik").
 */
public class TranslationRequest {

    private String text;
    private String sourceLanguage;
    private String script;

    public TranslationRequest() {
    }

    public TranslationRequest(String text, String sourceLanguage, String script) {
        this.text = text;
        this.sourceLanguage = sourceLanguage;
        this.script = script;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public String getSourceLanguage() {
        return sourceLanguage;
    }

    public void setSourceLanguage(String sourceLanguage) {
        this.sourceLanguage = sourceLanguage;
    }

    public String getScript() {
        return script;
    }

    public void setScript(String script) {
        this.script = script;
    }
}
