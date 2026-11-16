#!/usr/bin/env python3
"""
Mock of the Darija Translator REST API (same URLs, same JSON, same Basic auth).

Lets you develop and demo the clients without Java, Payara or a Gemini key.
It only knows a handful of phrases; anything else comes back tagged [mock].

    python3 tools/mock_server.py            # http://localhost:8080/translator/api
    python3 tools/mock_server.py --port 9090 --users student:darija2026
"""
import argparse
import base64
import json
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

PREFIX = "/translator/api"

PHRASES = {
    "hello": ("سلام", "salam"),
    "good morning": ("صباح الخير", "sba7 lkhir"),
    "how are you": ("كيداير؟", "kidayr?"),
    "how are you?": ("كيداير؟", "kidayr?"),
    "thank you": ("شكرا بزاف", "choukran bzaf"),
    "i am hungry": ("أنا جيعان", "ana ji3an"),
    "where is the station?": ("فين كاينة المحطة؟", "fin kayna lm7atta?"),
    "i love morocco": ("كنبغي المغرب", "kanbghi lmghrib"),
    "see you tomorrow": ("نتلاقاو غدا", "ntla9aw ghedda"),
}


class Handler(BaseHTTPRequestHandler):
    users = {}

    def _send(self, status, payload, extra_headers=None):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json;charset=UTF-8")
        self.send_header("Content-Length", str(len(body)))
        origin = self.headers.get("Origin")
        self.send_header("Access-Control-Allow-Origin", origin or "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept")
        self.send_header("Access-Control-Allow-Credentials", "true")
        for k, v in (extra_headers or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def _error(self, status, error, message, extra_headers=None):
        self._send(status, {"status": status, "error": error, "message": message}, extra_headers)

    def _authorized(self):
        header = self.headers.get("Authorization", "")
        if not header.startswith("Basic "):
            return False
        try:
            user, _, pw = base64.b64decode(header[6:]).decode("utf-8").partition(":")
        except Exception:
            return False
        return self.users.get(user) == pw

    def do_OPTIONS(self):
        self._send(200, {})

    def do_GET(self):
        url = urlparse(self.path)
        if url.path == PREFIX + "/health":
            return self._send(200, {"status": "UP", "service": "darija-translator",
                                    "provider": "mock", "model": "mock-phrasebook"})
        if url.path == PREFIX + "/translate":
            q = parse_qs(url.query)
            first = lambda k: q.get(k, [None])[0]
            return self._translate({"text": first("text"), "sourceLanguage": first("sourceLanguage"),
                                    "script": first("script")})
        self._error(404, "Not Found", "No resource at " + url.path)

    def do_POST(self):
        url = urlparse(self.path)
        if url.path != PREFIX + "/translate":
            return self._error(404, "Not Found", "No resource at " + url.path)
        length = int(self.headers.get("Content-Length") or 0)
        try:
            data = json.loads(self.rfile.read(length).decode("utf-8") or "null")
        except ValueError:
            return self._error(400, "Bad Request", 'Malformed JSON body. Expected {"text": "..."}')
        self._translate(data if isinstance(data, dict) else {})

    def _translate(self, req):
        if not self._authorized():
            return self._error(401, "Unauthorized", "Valid credentials are required",
                               {"WWW-Authenticate": 'Basic realm="darija-translator"'})
        start = time.time()
        text = (req.get("text") or "").strip()
        if not text:
            return self._error(400, "Bad Request", "'text' must not be empty")
        script = (req.get("script") or "arabic").lower()
        if script not in ("arabic", "latin"):
            return self._error(400, "Bad Request", "'script' must be 'arabic' or 'latin'")
        hit = PHRASES.get(text.lower().rstrip(".!"))
        translation = (hit[0] if script == "arabic" else hit[1]) if hit else "[mock] " + text
        self._send(200, {
            "originalText": text, "translation": translation,
            "sourceLanguage": req.get("sourceLanguage") or "auto",
            "targetLanguage": "Moroccan Arabic (Darija)", "script": script,
            "provider": "mock", "model": "mock-phrasebook", "cached": False,
            "durationMs": int((time.time() - start) * 1000),
        })

    def log_message(self, fmt, *args):
        print("[mock] " + fmt % args)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--port", type=int, default=8080)
    p.add_argument("--users", default="student:darija2026", help="user:pass[,user2:pass2]")
    args = p.parse_args()
    Handler.users = dict(u.split(":", 1) for u in args.users.split(",") if ":" in u)
    print(f"Mock Darija API on http://localhost:{args.port}{PREFIX}  (users: {', '.join(Handler.users)})")
    ThreadingHTTPServer(("0.0.0.0", args.port), Handler).serve_forever()


if __name__ == "__main__":
    main()
