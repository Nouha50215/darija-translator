<?php
declare(strict_types=1);

/**
 * PHP client for the Darija Translator REST API (uses the cURL extension).
 *
 *   $client = new DarijaClient('http://localhost:8080/translator/api', 'student', 'darija2026');
 *   $result = $client->translate('Good morning', 'English', 'arabic');
 *   echo $result['translation'];
 */
final class DarijaClient
{
    private string $baseUrl;

    public function __construct(
        string $baseUrl,
        private string $username,
        private string $password,
        private int $timeoutSeconds = 60
    ) {
        $this->baseUrl = rtrim($baseUrl, '/');
    }

    /** Builds a client from env vars DARIJA_API_URL, DARIJA_USER, DARIJA_PASSWORD. */
    public static function fromEnv(): self
    {
        return new self(
            getenv('DARIJA_API_URL') ?: 'http://localhost:8080/translator/api',
            getenv('DARIJA_USER') ?: 'student',
            getenv('DARIJA_PASSWORD') ?: 'darija2026'
        );
    }

    /**
     * Calls POST /translate.
     * @return array<string,mixed> decoded JSON (translation, script, provider, model, ...)
     * @throws RuntimeException with a readable message on any failure
     */
    public function translate(string $text, string $sourceLanguage = 'auto', string $script = 'arabic'): array
    {
        $payload = json_encode(
            ['text' => $text, 'sourceLanguage' => $sourceLanguage, 'script' => $script],
            JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
        );
        [$status, $data] = $this->request('POST', '/translate', $payload, true);

        if ($status === 401) {
            throw new RuntimeException('Authentication failed (401): check username and password.');
        }
        if ($status !== 200) {
            throw new RuntimeException($data['message'] ?? "Server returned HTTP $status");
        }
        return $data;
    }

    /** Calls the public GET /health endpoint. */
    public function health(): array
    {
        [$status, $data] = $this->request('GET', '/health', null, false);
        if ($status !== 200) {
            throw new RuntimeException("Health check failed (HTTP $status)");
        }
        return $data;
    }

    /** @return array{0:int,1:array<string,mixed>} */
    private function request(string $method, string $path, ?string $body, bool $auth): array
    {
        $ch = curl_init($this->baseUrl . $path);
        $headers = ['Accept: application/json'];
        $options = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => $method,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT        => $this->timeoutSeconds,
        ];
        if ($auth) {
            $options[CURLOPT_HTTPAUTH] = CURLAUTH_BASIC;
            $options[CURLOPT_USERPWD] = $this->username . ':' . $this->password;
        }
        if ($body !== null) {
            $headers[] = 'Content-Type: application/json; charset=UTF-8';
            $options[CURLOPT_POSTFIELDS] = $body;
        }
        $options[CURLOPT_HTTPHEADER] = $headers;
        curl_setopt_array($ch, $options);

        $raw = curl_exec($ch);
        if ($raw === false) {
            $error = curl_error($ch);
            curl_close($ch);
            throw new RuntimeException("Cannot reach the server at {$this->baseUrl}: $error");
        }
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);

        $data = json_decode((string) $raw, true);
        return [$status, is_array($data) ? $data : []];
    }
}
