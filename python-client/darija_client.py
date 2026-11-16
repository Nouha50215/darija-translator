#!/usr/bin/env python3
"""
Python client for the Darija Translator REST API. Standard library only.

Examples
    python darija_client.py "Good morning, my friend"
    python darija_client.py --latin "See you tomorrow"
    python darija_client.py -i                       # interactive mode
    echo "Where is the station?" | python darija_client.py

Configuration (flags or environment variables)
    --url       DARIJA_API_URL   default http://localhost:8080/translator/api
    --user      DARIJA_USER      default student
    --password  DARIJA_PASSWORD  default darija2026
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass


class TranslatorError(Exception):
    """Readable error raised for any failure talking to the API."""


@dataclass
class Translation:
    original_text: str
    translation: str
    script: str
    provider: str
    model: str
    duration_ms: int
    cached: bool = False

    @classmethod
    def from_json(cls, data: dict) -> "Translation":
        return cls(
            original_text=data.get("originalText", ""),
            translation=data.get("translation", ""),
            script=data.get("script", "arabic"),
            provider=data.get("provider", ""),
            model=data.get("model", ""),
            duration_ms=int(data.get("durationMs", 0)),
            cached=bool(data.get("cached", False)),
        )


class DarijaClient:
    def __init__(self, base_url: str, username: str, password: str, timeout: float = 60):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        token = base64.b64encode(f"{username}:{password}".encode("utf-8")).decode("ascii")
        self._auth_header = f"Basic {token}"

    @classmethod
    def from_env(cls) -> "DarijaClient":
        return cls(
            os.environ.get("DARIJA_API_URL", "http://localhost:8080/translator/api"),
            os.environ.get("DARIJA_USER", "student"),
            os.environ.get("DARIJA_PASSWORD", "darija2026"),
        )

    def translate(self, text: str, source_language: str = "auto", script: str = "arabic") -> Translation:
        """POST /translate and return the parsed result."""
        body = json.dumps({"text": text, "sourceLanguage": source_language, "script": script},
                          ensure_ascii=False).encode("utf-8")
        data = self._request("POST", "/translate", body, auth=True)
        return Translation.from_json(data)

    def health(self) -> dict:
        """GET /health (no authentication needed)."""
        return self._request("GET", "/health", None, auth=False)

    def _request(self, method: str, path: str, body: bytes | None, auth: bool) -> dict:
        req = urllib.request.Request(self.base_url + path, data=body, method=method)
        req.add_header("Accept", "application/json")
        if body is not None:
            req.add_header("Content-Type", "application/json; charset=UTF-8")
        if auth:
            req.add_header("Authorization", self._auth_header)
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as res:
                return json.loads(res.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 401:
                raise TranslatorError("Authentication failed (401): check username and password.") from None
            try:
                message = json.loads(e.read().decode("utf-8")).get("message")
            except Exception:
                message = None
            raise TranslatorError(message or f"Server returned HTTP {e.code}") from None
        except urllib.error.URLError as e:
            raise TranslatorError(f"Cannot reach the server at {self.base_url}: {e.reason}") from None
        except (TimeoutError, OSError) as e:
            raise TranslatorError(f"Network error: {e}") from None


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Translate text to Moroccan Darija.")
    p.add_argument("text", nargs="*", help="text to translate (or pipe it on stdin)")
    p.add_argument("--latin", action="store_true", help="answer in 3arabizi (Latin letters)")
    p.add_argument("--source", default="auto", help="source language, e.g. English (default: auto)")
    p.add_argument("-i", "--interactive", action="store_true", help="translate line by line until Ctrl+D")
    p.add_argument("-v", "--verbose", action="store_true", help="show provider/model/time")
    p.add_argument("--url", default=os.environ.get("DARIJA_API_URL", "http://localhost:8080/translator/api"))
    p.add_argument("--user", default=os.environ.get("DARIJA_USER", "student"))
    p.add_argument("--password", default=os.environ.get("DARIJA_PASSWORD", "darija2026"))
    args = p.parse_args(argv)

    client = DarijaClient(args.url, args.user, args.password)
    script = "latin" if args.latin else "arabic"

    def run(text: str) -> bool:
        try:
            t = client.translate(text, args.source, script)
        except TranslatorError as e:
            print(f"Error: {e}", file=sys.stderr)
            return False
        print(t.translation)
        if args.verbose:
            print(f"  ({t.provider} / {t.model}, {t.duration_ms} ms{', cached' if t.cached else ''})", file=sys.stderr)
        return True

    if args.interactive:
        print("Darija translator - type a sentence, Ctrl+D (Ctrl+Z on Windows) to quit.", file=sys.stderr)
        for line in sys.stdin if not sys.stdin.isatty() else iter(lambda: input("> "), None):
            if line.strip():
                run(line.strip())
        return 0

    text = " ".join(args.text).strip()
    if not text and not sys.stdin.isatty():
        text = sys.stdin.read().strip()
    if not text:
        p.print_usage(sys.stderr)
        return 2
    return 0 if run(text) else 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (KeyboardInterrupt, EOFError):
        print(file=sys.stderr)
        sys.exit(0)
