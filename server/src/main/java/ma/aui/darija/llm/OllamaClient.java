package ma.aui.darija.llm;

import jakarta.json.Json;
import jakarta.json.JsonObject;
import jakarta.json.JsonReader;

import java.io.IOException;
import java.io.StringReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * Calls a lightweight LLM deployed locally with Ollama (https://ollama.com),
 * e.g. {@code ollama pull qwen2.5:3b}. No API key, no data leaves the machine.
 */
public class OllamaClient implements LlmClient {

    private final String baseUrl;
    private final String model;
    private final HttpClient http;

    public OllamaClient(String baseUrl, String model) {
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.model = model;
        this.http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    }

    @Override
    public String complete(String systemInstruction, String userMessage) throws LlmException {
        JsonObject body = Json.createObjectBuilder()
                .add("model", model)
                .add("stream", false)
                .add("messages", Json.createArrayBuilder()
                        .add(Json.createObjectBuilder().add("role", "system").add("content", systemInstruction))
                        .add(Json.createObjectBuilder().add("role", "user").add("content", userMessage)))
                .add("options", Json.createObjectBuilder().add("temperature", 0.2))
                .build();

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/api/chat"))
                .timeout(Duration.ofSeconds(120))
                .header("Content-Type", "application/json; charset=UTF-8")
                .POST(HttpRequest.BodyPublishers.ofString(body.toString(), StandardCharsets.UTF_8))
                .build();

        try {
            HttpResponse<String> response =
                    http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            return parseResponse(response.statusCode(), response.body());
        } catch (IOException e) {
            throw new LlmException("Could not reach Ollama at " + baseUrl + ": " + e.getMessage(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new LlmException("Ollama request interrupted", e);
        }
    }

    /** Extracts message.content from Ollama's /api/chat response. */
    static String parseResponse(int status, String body) throws LlmException {
        JsonObject json;
        try (JsonReader reader = Json.createReader(new StringReader(body == null ? "" : body))) {
            json = reader.readObject();
        } catch (RuntimeException e) {
            throw new LlmException("Ollama returned HTTP " + status + " with an unreadable body");
        }
        if (status != 200) {
            throw new LlmException("Ollama error (HTTP " + status + "): " + json.getString("error", "unknown error"));
        }
        JsonObject message = json.getJsonObject("message");
        String content = message == null ? "" : message.getString("content", "");
        if (content.isBlank()) {
            throw new LlmException("Ollama returned an empty answer");
        }
        return content;
    }

    @Override
    public String provider() {
        return "ollama";
    }

    @Override
    public String model() {
        return model;
    }
}
