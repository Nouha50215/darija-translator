package ma.aui.darija.service;

/** The client sent something we can't translate (empty text, text too long, bad option). */
public class InvalidTranslationRequestException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public InvalidTranslationRequestException(String message) {
        super(message);
    }
}
