from __future__ import annotations

import argparse
import mimetypes
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


DIST_DIR = Path("/frontend/dist")


class SpaHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST_DIR), **kwargs)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self) -> None:
        requested_path = self.path.split("?", 1)[0]
        file_path = (DIST_DIR / requested_path.lstrip("/")).resolve()

        if not str(file_path).startswith(str(DIST_DIR.resolve())):
            self.send_error(403)
            return

        if requested_path != "/" and file_path.is_file():
            return super().do_GET()

        self.path = "/index.html"
        return super().do_GET()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()

    mimetypes.add_type("application/javascript", ".js")
    mimetypes.add_type("text/css", ".css")
    server = ThreadingHTTPServer((args.host, args.port), SpaHandler)
    server.serve_forever()


if __name__ == "__main__":
    main()
