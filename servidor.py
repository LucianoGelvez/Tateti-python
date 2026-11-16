#!/usr/bin/env python3
"""Servidor local para el juego. A diferencia de `python -m http.server`,
le dice al navegador que no guarde nada en caché, así siempre se ve la última versión.

Uso:  python3 servidor.py [puerto]     (por defecto 8000)
"""
import json
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


def listar_modelos(carpeta):
    """Escribe modelos/index.json con los modelos 3D que haya en la carpeta `modelos`:
    archivos .glb sueltos, o carpetas con un .gltf dentro (como los .zip de Sketchfab descomprimidos)."""
    modelos = carpeta / "modelos"
    modelos.mkdir(exist_ok=True)
    encontrados = sorted(modelos.glob("*.glb")) + sorted(modelos.glob("*.gltf")) + sorted(modelos.glob("*/*.glb")) + sorted(modelos.glob("*/*.gltf"))
    lista = []
    for f in encontrados:
        base = f.stem if f.parent == modelos or f.stem.lower() not in ("scene", "model") else f.parent.name
        nombre = " ".join(base.replace("_", " ").replace("-", " ").split()).strip().capitalize()
        lista.append({"file": f.relative_to(modelos).as_posix(), "name": nombre, "mb": round(f.stat().st_size / 1e6, 1)})
    (modelos / "index.json").write_text(json.dumps(lista, ensure_ascii=False, indent=1), encoding="utf-8")
    return lista


class SinCache(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.split("?")[0].endswith("/modelos/index.json"):
            listar_modelos(Path(self.directory))  # siempre al día, sin reiniciar el servidor
        super().do_GET()


    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()


if __name__ == "__main__":
    puerto = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    carpeta = Path(__file__).resolve().parent
    for m in listar_modelos(carpeta):
        print(f"  modelo: {m['name']}  ({m['file']}, {m['mb']} MB)")
    print(f"Sirviendo {carpeta} en http://localhost:{puerto}  (Ctrl+C para salir)")
    ThreadingHTTPServer(("", puerto), partial(SinCache, directory=str(carpeta))).serve_forever()
