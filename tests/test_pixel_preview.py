import hashlib
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


class PixelPreviewTests(unittest.TestCase):
    def test_build_is_isolated(self):
        def snapshot():
            return {str(p): hashlib.sha256(p.read_bytes()).hexdigest()
                    for folder in ('public', '.interaction-preview')
                    for p in (ROOT / folder).rglob('*') if p.is_file()}
        before = snapshot()
        subprocess.run([sys.executable, 'build.py', '--pixel-preview'], cwd=ROOT, check=True)
        self.assertEqual(before, snapshot())
        output = ROOT / '.pixel-preview'
        html = (output / 'pixel-preview/index.html').read_text(encoding='utf-8')
        self.assertEqual(html.count('data-object='), 4)
        self.assertEqual(html.count('data-dossier='), 4)
        self.assertIn('noindex, nofollow', html)
        self.assertNotIn('character-preview.js', html)
        self.assertNotIn('data-scene', html)
        self.assertNotIn('pixel-preview', (output / 'sitemap.xml').read_text())
        self.assertNotIn('pixel-preview.js', (output / 'index.html').read_text(encoding='utf-8'))

    def test_private_content_and_public_projects(self):
        sys.path.insert(0, str(ROOT))
        import build
        with tempfile.TemporaryDirectory() as folder:
            fixture = Path(folder)
            shutil.copytree(ROOT / 'content', fixture / 'content')
            shutil.copyfile(ROOT / 'site.yaml', fixture / 'site.yaml')
            (fixture / 'static').mkdir()
            for name, draft in [('hidden-fixture', 'true'), ('visible-fixture', 'false')]:
                (fixture / 'content/projects').mkdir(exist_ok=True)
                (fixture / f'content/projects/{name}.md').write_text(
                    f'---\ntitle: {name}\nsummary: A project\npublishedAt: 2026-09-05\n'
                    f'category: research\nsection: school\ndraft: {draft}\n---\nBody', encoding='utf-8')
            (fixture / 'content/notes/hidden-note.md').write_text(
                '---\ntitle: hidden-note\nsummary: Private\npublishedAt: 2026-09-05\n'
                'category: thought\ndraft: true\nreviewReady: true\n---\nSecret', encoding='utf-8')
            with patch.multiple(build, ROOT=fixture, CONTENT=fixture / 'content',
                                STATIC=fixture / 'static', OUTPUT=fixture / 'public'):
                build.main(pixel_preview=True)
            html = (fixture / '.pixel-preview/pixel-preview/index.html').read_text(encoding='utf-8')
            self.assertIn('visible-fixture', html)
            self.assertNotIn('hidden-fixture', html)
            self.assertNotIn('hidden-note', html)

    def test_modes_are_exclusive(self):
        for flag in ('--preview', '--interaction-preview'):
            result = subprocess.run([sys.executable, 'build.py', '--pixel-preview', flag], cwd=ROOT, capture_output=True)
            self.assertEqual(result.returncode, 2)
