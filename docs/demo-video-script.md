# Demo video script (about 5 minutes)

Record with OBS or the Windows Game Bar (Win+G). Before recording: start the server with a real Gemini key, load the extension, start the PHP server, and open Expo Go on your phone.

| Time | Show | Say (summary) |
|---|---|---|
| 0:00–0:20 | README on GitHub | "Mini Project 2: an LLM-powered REST service that translates into Moroccan Darija, with four clients." |
| 0:20–1:00 | `docs/uml/deployment-diagram.png`, then `class-diagram.png` | Server node vs client nodes; the Gemini/Ollama strategy; resource, then service, then LLM client. |
| 1:00–1:50 | IDE: `TranslatorResource.java`, `TranslationService.buildSystemInstruction`, `GeminiClient.complete` | `translate()` business method; the prompt that forces Darija instead of MSA; the call to the Gemini REST API. |
| 1:50–2:20 | `SecurityConfig.java`, `TranslatorIdentityStore.java`, `web.xml` | Basic auth mechanism, identity store, and the security constraint that requires the translator role. |
| 2:20–2:50 | Terminal: `./run-payara-micro.sh`, then Postman | Run the collection: health 200, translate 200, no credentials 401, empty text 400. |
| 2:50–3:50 | Chrome on a news site | Select a paragraph, right-click, *Translate to Darija*: the side panel opens with the text pasted and translated. Switch to 3arabizi. Click 🔊. Turn on voice-to-voice, click 🎤, say "Where is the nearest pharmacy?", and hear the answer. |
| 3:50–4:15 | Browser `localhost:8000` (PHP), terminal (Python) | Translate one sentence in each. Show the `gui.py` window. |
| 4:15–4:45 | Phone screen (scrcpy or camera) | Type a sentence, translate, Listen, Share. |
| 4:45–5:00 | Terminal: `LLM_PROVIDER=ollama` restart (optional) | "The same service also runs fully offline with a local lightweight model." Wrap up. |

Tip: translate a sentence once before recording so the cache makes the live demo fast. Mention that the `cached` field shows this.
