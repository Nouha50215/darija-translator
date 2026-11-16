#!/usr/bin/env python3
"""
Desktop GUI (Tkinter) for the Darija Translator API.
    python gui.py
Uses the same DARIJA_API_URL / DARIJA_USER / DARIJA_PASSWORD settings as darija_client.py.
"""
import threading
import tkinter as tk
from tkinter import messagebox, ttk

from darija_client import DarijaClient, TranslatorError

RED, GREEN = "#c1272d", "#006233"


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Darija Translator · Python client")
        self.geometry("620x520")
        self.client = DarijaClient.from_env()

        header = tk.Frame(self, bg=RED)
        header.pack(fill="x")
        tk.Label(header, text="Darija Translator", bg=RED, fg="white",
                 font=("Segoe UI", 16, "bold")).pack(side="left", padx=12, pady=10)
        self.status = tk.Label(header, text="● checking…", bg=RED, fg="#f3c623")
        self.status.pack(side="right", padx=12)

        body = tk.Frame(self, padx=12, pady=12)
        body.pack(fill="both", expand=True)

        tk.Label(body, text="Text (any language)").pack(anchor="w")
        self.input = tk.Text(body, height=7, wrap="word", font=("Segoe UI", 12))
        self.input.pack(fill="both", expand=True)
        self.input.bind("<Control-Return>", lambda e: self.translate())

        controls = tk.Frame(body, pady=8)
        controls.pack(fill="x")
        self.script = tk.StringVar(value="arabic")
        ttk.Radiobutton(controls, text="Arabic script", variable=self.script, value="arabic").pack(side="left")
        ttk.Radiobutton(controls, text="3arabizi", variable=self.script, value="latin").pack(side="left", padx=8)
        self.button = tk.Button(controls, text="Translate", bg=GREEN, fg="white",
                                font=("Segoe UI", 11, "bold"), command=self.translate)
        self.button.pack(side="right")
        tk.Button(controls, text="Copy", command=self.copy).pack(side="right", padx=6)

        tk.Label(body, text="Darija", fg=GREEN, font=("Segoe UI", 11, "bold")).pack(anchor="w")
        self.output = tk.Text(body, height=6, wrap="word", font=("Segoe UI", 15), state="disabled", bg="#faf8f5")
        self.output.pack(fill="both", expand=True)
        self.output.tag_configure("rtl", justify="right")
        self.meta = tk.Label(body, text="", fg="#6b6b6b")
        self.meta.pack(anchor="w")

        threading.Thread(target=self.check_health, daemon=True).start()

    def check_health(self):
        try:
            h = self.client.health()
            text, color = f"● {h['provider']} / {h['model']}", "#9ef0bf"
        except TranslatorError:
            text, color = "● server unreachable", "#ffd0d0"
        self.after(0, lambda: self.status.config(text=text, fg=color))

    def translate(self):
        text = self.input.get("1.0", "end").strip()
        if not text:
            return
        self.button.config(state="disabled", text="…")
        script = self.script.get()

        def work():
            try:
                result = self.client.translate(text, "auto", script)
                self.after(0, lambda: self.show(result))
            except TranslatorError as e:
                msg = str(e)
                self.after(0, lambda: messagebox.showerror("Translation failed", msg))
            finally:
                self.after(0, lambda: self.button.config(state="normal", text="Translate"))

        threading.Thread(target=work, daemon=True).start()   # keep the UI responsive

    def show(self, result):
        self.output.config(state="normal")
        self.output.delete("1.0", "end")
        self.output.insert("1.0", result.translation, ("rtl",) if result.script == "arabic" else ())
        self.output.config(state="disabled")
        self.meta.config(text=f"{result.provider} · {result.model} · {result.duration_ms} ms")

    def copy(self):
        self.clipboard_clear()
        self.clipboard_append(self.output.get("1.0", "end").strip())


if __name__ == "__main__":
    App().mainloop()
