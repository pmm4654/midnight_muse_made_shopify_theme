#!/usr/bin/env python3
"""Email template preview server with auto-build from src/ + _base.html."""

import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import unquote

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8888
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# Import build function
sys.path.insert(0, DIRECTORY)
from build import build as build_emails, SRC_DIR, BASE_PATH


def needs_rebuild():
    """Check if any src/ file or _base.html is newer than its built output."""
    if not os.path.isdir(SRC_DIR):
        return False
    base_mtime = os.path.getmtime(BASE_PATH) if os.path.isfile(BASE_PATH) else 0
    for fname in os.listdir(SRC_DIR):
        if not fname.endswith('.html'):
            continue
        src_mtime = os.path.getmtime(os.path.join(SRC_DIR, fname))
        out_path = os.path.join(DIRECTORY, fname)
        if not os.path.isfile(out_path):
            return True
        out_mtime = os.path.getmtime(out_path)
        if src_mtime > out_mtime or base_mtime > out_mtime:
            return True
    return False


class EmailServerHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        # Auto-rebuild if source files changed
        if needs_rebuild():
            print('\n[auto-build] Source files changed, rebuilding...')
            build_emails()

        # /raw/<filename> returns raw HTML as plain text
        if self.path.startswith('/raw/'):
            filename = unquote(self.path[5:])
            # Prevent directory traversal
            if '..' in filename or '/' in filename:
                self.send_error(403)
                return
            filepath = os.path.join(DIRECTORY, filename)
            if os.path.isfile(filepath) and filename.endswith('.html'):
                self.send_response(200)
                self.send_header('Content-Type', 'text/plain; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                with open(filepath, 'rb') as f:
                    self.wfile.write(f.read())
            else:
                self.send_error(404)
            return

        # Everything else served as normal static files
        super().do_GET()


if __name__ == '__main__':
    # Initial build
    if os.path.isdir(SRC_DIR):
        print('Building emails from source...')
        build_emails()

    server = HTTPServer(('0.0.0.0', PORT), EmailServerHandler)
    print(f'\nEmail template server running at http://0.0.0.0:{PORT}')
    print(f'Serving from: {DIRECTORY}')
    print(f'Auto-rebuilds when src/ or _base.html change.')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nServer stopped.')
