package ma.aui.darija.service;

import ma.aui.darija.llm.LlmClient;
import ma.aui.darija.llm.LlmException;
import ma.aui.darija.model.TranslationRequest;
import ma.aui.darija.model.TranslationResponse;
import org.junit.jupiter.api.Test;

import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

class TranslationServiceTest {

    /** Fake LLM that records what it was asked and returns a canned answer. */
    static class FakeLlm implements LlmClient {
        final AtomicInteger calls = new AtomicInteger();
        String lastSystem;
        String lastUser;
        String answer = "صباح الخير";

        @Override
        public String complete(String systemInstruction, String userMessage) {
            calls.incrementAndGet();
            lastSystem = systemInstruction;
            lastUser = userMessage;
            return answer;
        }

        @Override
        public String provider() {
            return "fake";
        }

        @Override
        public String model() {
            return "fake-1";
        }
    }

    @Test
    void translatesAndFillsResponse() throws LlmException {
        FakeLlm llm = new FakeLlm();
        TranslationService service = new TranslationService(llm, 100);

        TranslationResponse r = service.translate(new TranslationRequest("  Good morning ", null, null));

        assertEquals("Good morning", r.getOriginalText());
        assertEquals("صباح الخير", r.getTranslation());
        assertEquals("arabic", r.getScript());
        assertEquals("auto", r.getSourceLanguage());
        assertEquals("fake", r.getProvider());
        assertEquals("Good morning", llm.lastUser);
        assertTrue(llm.lastSystem.contains("Arabic script"));
        assertFalse(r.isCached());
    }

    @Test
    void latinScriptChangesPrompt() throws LlmException {
        FakeLlm llm = new FakeLlm();
        new TranslationService(llm, 100).translate(new TranslationRequest("Hi", "English", "latin"));
        assertTrue(llm.lastSystem.contains("Latin letters"));
        assertTrue(llm.lastSystem.contains("written in English"));
    }

    @Test
    void secondIdenticalRequestIsCached() throws LlmException {
        FakeLlm llm = new FakeLlm();
        TranslationService service = new TranslationService(llm, 100);
        service.translate(new TranslationRequest("Hello", null, null));
        TranslationResponse second = service.translate(new TranslationRequest("Hello", null, null));
        assertEquals(1, llm.calls.get());
        assertTrue(second.isCached());
    }

    @Test
    void rejectsEmptyTooLongAndBadScript() {
        TranslationService service = new TranslationService(new FakeLlm(), 5);
        assertThrows(InvalidTranslationRequestException.class,
                () -> service.translate(new TranslationRequest("   ", null, null)));
        assertThrows(InvalidTranslationRequestException.class,
                () -> service.translate(new TranslationRequest("too long text", null, null)));
        assertThrows(InvalidTranslationRequestException.class,
                () -> service.translate(new TranslationRequest("ok", null, "klingon")));
        assertThrows(InvalidTranslationRequestException.class, () -> service.translate(null));
    }

    @Test
    void cleansModelOutput() {
        assertEquals("labas", TranslationService.cleanOutput("  \"labas\"  "));
        assertEquals("labas", TranslationService.cleanOutput("```\nlabas\n```"));
        assertEquals("labas", TranslationService.cleanOutput("```text\nlabas\n```"));
        assertEquals("\"a\" w \"b\"", TranslationService.cleanOutput("\"a\" w \"b\""));
        assertEquals("مرحبا", TranslationService.cleanOutput("«مرحبا»"));
    }
}
