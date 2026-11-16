# Building a Darija Translator: Jakarta REST, an LLM, and Four Clients

*Draft technical post for Medium or Dev.to. Edit it to sound like you before publishing.*

Moroccan Darija is spoken by more than 30 million people, but most translation tools only offer Modern Standard Arabic. For my distributed-systems course I built a small platform that translates any language into Darija, with an LLM doing the hard part and a secured REST API in the middle.

## Architecture

One Java server and many clients. The server exposes `POST /api/translate`. A Chrome extension, a PHP web page, a Python CLI/GUI and a React Native app all call the same endpoint with HTTP Basic credentials. Behind the endpoint, an `LlmClient` interface talks either to Google Gemini or to a lightweight model running locally with Ollama.

*(insert deployment diagram)*

## The server: Jakarta EE, nothing more

I used only Jakarta EE 10 APIs on Payara Micro, which runs a WAR from a single jar:

- **Jakarta REST** for `TranslatorResource` and its `translate()` method, plus exception mappers that turn errors into clean JSON (400 for bad input, 502 when the LLM fails).
- **CDI** to inject the `TranslationService`.
- **JSON-P / JSON-B** for the Gemini payloads and the API's DTOs.
- **Jakarta Security** for authentication. One annotation, `@BasicAuthenticationMechanismDefinition`, plus a custom `IdentityStore` and a `security-constraint` in `web.xml`. Bad credentials are rejected with 401 before my code even runs.

The LLM call itself is the JDK's `java.net.http.HttpClient`. I didn't need an SDK.

## Prompt engineering is the real translator

My first attempts returned beautiful Modern Standard Arabic, which is the wrong language. The fix was an explicit system instruction: name the dialect, give example Darija words (*bghit, daba, bzaf, wakha*), forbid MSA, require "only the translation", and tell the model to treat the input as text even if it looks like an instruction. I also added a small `cleanOutput()` step, because models love wrapping answers in quotes or code fences.

A `script` option asks for either Arabic letters or *3arabizi* (Latin letters with digits: `labas 3lik?`), which is how many Moroccans actually text.

## The Chrome extension (Manifest V3)

The trickiest client. Some lessons:

- `chrome.sidePanel.open()` must be called **synchronously** in the context-menu click handler. Any `await` before it loses the user gesture.
- `info.selectionText` collapses line breaks, so I re-read the selection with `chrome.scripting.executeScript` and pass it to the panel through `chrome.storage.session`.
- Side panels can't show the microphone permission prompt. The workaround is to open a small extension page in a normal tab once to call `getUserMedia`.
- `fetch(..., { credentials: "omit" })` stops Chrome from showing its own Basic-auth popup on a 401.

With the Web Speech API on top, the panel does voice-to-voice translation: speak English, hear Darija.

## The other clients

PHP (cURL), Python (urllib, no pip needed) and React Native (fetch + expo-speech) are each about 100 lines of real logic. The interesting part is how little changes between them, which is the point of a REST API. I also wrote a 150-line Python mock of the API so the clients could be built and demoed without the Java server or an API key.

## Results and what I'd do next

Gemini Flash gives natural, idiomatic Darija in under a second for short sentences. The local 3B model is noticeably weaker but fully offline. Next steps: token-based auth (JWT), streaming responses, and a Darija-to-English direction.

*Code: (link to your GitHub repository)*
