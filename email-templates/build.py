#!/usr/bin/env python3
"""
Email template build system.

Combines source files (src/*.html) with a shared base template (_base.html)
to produce final email HTML files.

Usage:
  python build.py              Build all emails from src/ using _base.html
  python build.py migrate      Extract body content from existing emails into src/
  python build.py watch        Build on file changes (requires watchdog: pip install watchdog)
"""

import os
import re
import sys

DIR = os.path.dirname(os.path.abspath(__file__))
BASE_PATH = os.path.join(DIR, '_base.html')
SRC_DIR = os.path.join(DIR, 'src')
OUT_DIR = DIR

# Email files that the migrate command should process
EMAIL_FILES = [
    'a1-code-delivery.html',
    'a2-process-reveal.html',
    'a3-urgency.html',
    'a4-final-night.html',
    'b1-welcome.html',
    'b2-product-showcase.html',
    'b3-expiration-warning.html',
    'b4-last-call.html',
    'c1-coven-letter.html',
    'c2-loyalty-reward.html',
    'c3-social-proof.html',
    'c4-code-expiration.html',
]


def parse_frontmatter(content):
    """Extract frontmatter vars and body from a source file."""
    if not content.startswith('---'):
        return {}, content
    end = content.index('---', 3)
    fm_text = content[3:end].strip()
    body = content[end + 3:].lstrip('\n')
    meta = {}
    for line in fm_text.split('\n'):
        if ':' in line:
            key, val = line.split(':', 1)
            meta[key.strip()] = val.strip()
    return meta, body


def build():
    """Build all emails from src/ files + _base.html."""
    if not os.path.isfile(BASE_PATH):
        print('Error: _base.html not found')
        sys.exit(1)
    if not os.path.isdir(SRC_DIR):
        print('Error: src/ directory not found. Run "python build.py migrate" first.')
        sys.exit(1)

    with open(BASE_PATH, 'r') as f:
        base = f.read()

    count = 0
    for fname in sorted(os.listdir(SRC_DIR)):
        if not fname.endswith('.html'):
            continue
        with open(os.path.join(SRC_DIR, fname), 'r') as f:
            src = f.read()

        meta, body = parse_frontmatter(src)

        out = base
        out = out.replace('<!-- @TITLE -->', meta.get('title', ''))
        out = out.replace('<!-- @PREHEADER -->', meta.get('preheader', ''))
        out = out.replace('<!-- @CONTENT -->', body)

        outpath = os.path.join(OUT_DIR, fname)
        with open(outpath, 'w') as f:
            f.write(out)
        count += 1
        print(f'  Built: {fname}')

    print(f'\n{count} email(s) built.')


def extract_email_parts(html):
    """Extract title, preheader, and body content from an existing email HTML."""
    # Extract title
    title_match = re.search(r'<title>(.*?)</title>', html, re.DOTALL)
    title = title_match.group(1).strip() if title_match else ''

    # Extract preheader (text inside the hidden span, before the &zwnj; padding)
    preheader_match = re.search(
        r'<span[^>]*display:\s*none[^>]*>\s*\n?\s*(.*?)\s*\n?\s*&zwnj;',
        html, re.DOTALL
    )
    preheader = preheader_match.group(1).strip() if preheader_match else ''

    # Find body content boundaries
    # Header ends after the moon divider section, followed by table closing tags
    # and a blank line. Body content starts after that blank line.
    lines = html.split('\n')

    # Find the first &#9790; (moon character in header divider)
    moon_line = None
    for i, line in enumerate(lines):
        if '&#9790;' in line:
            moon_line = i
            break

    if moon_line is None:
        print('  Warning: could not find header moon divider')
        return title, preheader, ''

    # Find first blank line after the moon (marks end of header section)
    body_start = moon_line + 1
    while body_start < len(lines) and lines[body_start].strip() != '':
        body_start += 1
    # Skip blank lines
    while body_start < len(lines) and lines[body_start].strip() == '':
        body_start += 1

    # Find footer marker
    footer_line = None
    for i in range(body_start, len(lines)):
        if '<!-- Footer -->' in lines[i]:
            footer_line = i
            break

    if footer_line is None:
        print('  Warning: could not find <!-- Footer --> marker')
        return title, preheader, ''

    # Walk backwards from footer to skip blank lines
    body_end = footer_line
    while body_end > body_start and lines[body_end - 1].strip() == '':
        body_end -= 1

    body_content = '\n'.join(lines[body_start:body_end])
    return title, preheader, body_content


def migrate():
    """Extract body content from existing email HTML files into src/ directory."""
    os.makedirs(SRC_DIR, exist_ok=True)

    count = 0
    for fname in EMAIL_FILES:
        filepath = os.path.join(DIR, fname)
        if not os.path.isfile(filepath):
            print(f'  Skipped (not found): {fname}')
            continue

        with open(filepath, 'r') as f:
            html = f.read()

        title, preheader, body = extract_email_parts(html)

        if not body:
            print(f'  Skipped (no body extracted): {fname}')
            continue

        src_content = f'---\ntitle: {title}\npreheader: {preheader}\n---\n{body}\n'
        src_path = os.path.join(SRC_DIR, fname)
        with open(src_path, 'w') as f:
            f.write(src_content)

        count += 1
        print(f'  Migrated: {fname}')

    print(f'\n{count} email(s) migrated to src/')
    print('Run "python build.py" to rebuild from source.')


def watch():
    """Watch src/ and _base.html for changes, rebuild automatically."""
    try:
        from watchdog.observers import Observer
        from watchdog.events import FileSystemEventHandler
    except ImportError:
        print('watchdog not installed. Install with: pip install watchdog')
        print('Or just run "python build.py" manually after changes.')
        sys.exit(1)

    class RebuildHandler(FileSystemEventHandler):
        def on_modified(self, event):
            if event.src_path.endswith('.html'):
                print(f'\nChange detected: {os.path.basename(event.src_path)}')
                build()

    observer = Observer()
    observer.schedule(RebuildHandler(), SRC_DIR, recursive=False)
    observer.schedule(RebuildHandler(), DIR, recursive=False)
    observer.start()

    print('Watching for changes... (Ctrl+C to stop)')
    build()  # Initial build

    try:
        import time
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'build'
    if cmd == 'migrate':
        migrate()
    elif cmd == 'watch':
        watch()
    elif cmd == 'build':
        build()
    else:
        print(f'Unknown command: {cmd}')
        print('Usage: python build.py [build|migrate|watch]')
        sys.exit(1)
