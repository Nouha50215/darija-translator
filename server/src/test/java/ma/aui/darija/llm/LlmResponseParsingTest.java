package ma.aui.darija.llm;

import jakarta.json.JsonObject;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class LlmResponseParsingTest {

    @Test
    void geminiSuccess() throws LlmException {
        String body = """
                {"candidates":[{"content":{"role":"model","parts":[{"text":"كيداير؟"}]},"finishReason":"STOP"}]}
                """;
        assertEquals("كيداير؟", GeminiClient.parseResponse(200, body));
    }

    @Test
    void geminiApiErrorIsReported() {
        String body = """
                {"error":{"code":400,"message":"API key not valid.","status":"INVALID_ARGUMENT"}}
                """;
        LlmException e = assertThrows(LlmException.class, () -> GeminiClient.parseResponse(400, body));
        assertTrue(e.getMessage().contains("API key not valid"));
    }

    @Test
    void geminiBlockedPrompt() {
        String body = """
                {"promptFeedback":{"blockReason":"SAFETY"}}
                """;
        LlmException e = assertThrows(LlmException.class, () -> GeminiClient.parseResponse(200, body));
        assertTrue(e.getMessage().contains("SAFETY"));
    }

    @Test
    void geminiRequestBodyShape() {
        JsonObject body = GeminiClient.buildRequestBody("SYS", "Hello");
        assertEquals("SYS", body.getJsonObject("systemInstruction")
                .getJsonArray("parts").getJsonObject(0).getString("text"));
        assertEquals("Hello", body.getJsonArray("contents").getJsonObject(0)
                .getJsonArray("parts").getJsonObject(0).getString("text"));
    }

    @Test
    void ollamaSuccessAndError() throws LlmException {
        assertEquals("salam", OllamaClient.parseResponse(200,
                "{\"message\":{\"role\":\"assistant\",\"content\":\"salam\"},\"done\":true}"));
        LlmException e = assertThrows(LlmException.class,
                () -> OllamaClient.parseResponse(404, "{\"error\":\"model 'x' not found\"}"));
        assertTrue(e.getMessage().contains("not found"));
    }
}
