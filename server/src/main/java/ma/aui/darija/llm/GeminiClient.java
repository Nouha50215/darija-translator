package ma.aui.darija.llm;

import jakarta.json.Json;
import jakarta.json.JsonArray;
import jakarta.json.JsonObject;
import jakarta.json.JsonReader;
import jakarta.json.JsonValue;

import java.io.IOException;
import java.io.StringReader;
import java.net.ProxySelector;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * Calls the Google Gemini "generateContent" REST API.
 * Docs: https://ai.google.dev/api/generate-content
 */
public class GeminiClient implements LlmClient {

    private static final String ENDPOINT =
            "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent";

    private final String apiKey;
    private final String model;
    private final HttpClient http;

    public GeminiClient(String apiKey, String model) {
        this.apiKey = apiKey;
        this.model = model;
        this.http = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .proxy(ProxySelector.getDefault())
                .build();
    }

    @Override
    public String complete(String systemInstruction, String userMessage) throws LlmException {
        if (apiKey == null || apiKey.isBlank()) {
            throw new LlmException("GEMINI_API_KEY is not configured on the server.");
        }

        JsonObject body = buildRequestBody(systemInstruction, userMessage);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(String.format(ENDPOINT, model)))
                .timeout(Duration.ofSeconds(60))
                .header("Content-Type", "application/json; charset=UTF-8")
                .header("x-goog-api-key", apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(body.toString(), StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> response;
        try {
            response = http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        } catch (IOException e) {
            throw new LlmException("Could not reach Gemini: " + e.getMessage(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new LlmException("Gemini request interrupted", e);
        }
        return parseResponse(response.statusCode(), response.body());
    }

    static JsonObject buildRequestBody(String systemInstruction, String userMessage) {
        return Json.createObjectBuilder()
                .add("systemInstruction", Json.createObjectBuilder()
                        .add("parts", Json.createArrayBuilder()
                                .add(Json.createObjectBuilder().add("text", systemInstruction))))
                .add("contents", Json.createArrayBuilder()
                        .add(Json.createObjectBuilder()
                                .add("role", "user")
                                .add("parts", Json.createArrayBuilder()
                                        .add(Json.createObjectBuilder().add("text", userMessage)))))
                .add("generationConfig", Json.createObjectBuilder()
                        .add("temperature", 0.3))
                .build();
    }

    /** Extracts candidates[0].content.parts[*].text, or explains why there is none. */
    static String parseResponse(int status, String body) throws LlmException {
        JsonObject json;
        try (JsonReader reader = Json.createReader(new StringReader(body == null ? "" : body))) {
            json = reader.readObject();
        } catch (RuntimeException e) {
            throw new LlmException("Gemini returned HTTP " + status + " with an unreadable body");
        }

        if (status != 200) {
            String message = json.containsKey("error")
                    ? json.getJsonObject("error").getString("message", "unknown error")
                    : "unknown error";
            throw new LlmException("Gemini error (HTTP " + status + "): " + message);
        }

        JsonArray candidates = json.getJsonArray("candidates");
        if (candidates == null || candidates.isEmpty()) {
            String reason = json.containsKey("promptFeedback")
                    ? json.getJsonObject("promptFeedback").getString("blockReason", "no candidates")
                    : "no candidates";
            throw new LlmException("Gemini returned no translation (" + reason + ")");
        }

        JsonObject first = candidates.getJsonObject(0);
        JsonObject content = first.getJsonObject("content");
        if (content == null || !content.containsKey("parts")) {
            throw new LlmException("Gemini returned no text (finishReason="
                    + first.getString("finishReason", "unknown") + ")");
        }

        StringBuilder text = new StringBuilder();
        for (JsonValue part : content.getJsonArray("parts")) {
            if (part.getValueType() == JsonValue.ValueType.OBJECT) {
                text.append(part.asJsonObject().getString("text", ""));
            }
        }
        if (text.length() == 0) {
            throw new LlmException("Gemini returned an empty answer");
        }
        return text.toString();
    }

    @Override
    public String provider() {
        return "gemini";
    }

    @Override
    public String model() {
        return model;
    }
}
