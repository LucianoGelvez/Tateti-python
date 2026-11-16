#!/usr/bin/env python3
"""Servidor local para el juego. A diferencia de `python -m http.server`,
le dice al navegador que no guarde nada en caché, así siempre se ve la última versión.

Uso:  python3 servidor.py [puerto]     (por defecto 8000)
"""
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class SinCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()


if __name__ == "__main__":
    puerto = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    carpeta = Path(__file__).resolve().parent
    print(f"Sirviendo {carpeta} en http://localhost:{puerto}  (Ctrl+C para salir)")
    ThreadingHTTPServer(("", puerto), partial(SinCache, directory=str(carpeta))).serve_forever()
