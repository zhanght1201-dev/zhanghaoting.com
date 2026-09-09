"""The opt-in character preview must never publish draft content or alter public output."""
import hashlib
from pathlib import Path
import subprocess
import sys
import unittest
import yaml
import shutil
import tempfile
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


def snapshot_public():
    return {str(p.relative_to(ROOT / 'public')): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in (ROOT / 'public').rglob('*') if p.is_file()}


class InteractionPreviewTests(unittest.TestCase):
    def test_preview_is_opt_in_and_excludes_review_drafts(self):
        before = snapshot_public()
        subprocess.run([sys.executable, 'build.py', '--interaction-preview'], cwd=ROOT, check=True)
        self.assertEqual(before, snapshot_public())
        preview = ROOT / '.interaction-preview'
        html = (preview / 'interaction-preview/index.html').read_text(encoding='utf-8')
        self.assertIn('data-research-dialog', html)
        self.assertIn('noindex, nofollow', html)
        self.assertIn('整理学习路径、研究问题、校园经历', html)
        for source in (ROOT / 'content/notes').glob('*.md'):
            metadata = yaml.safe_load(source.read_text(encoding='utf-8').split('---', 2)[1])
            if metadata.get('draft'):
                self.assertNotIn('/notes/' + source.stem + '/', html)
                self.assertFalse((preview / 'notes' / source.stem / 'index.html').exists())
        self.assertNotIn('character-preview.js', (preview / 'index.html').read_text(encoding='utf-8'))
        self.assertNotIn('interaction-preview', (preview / 'sitemap.xml').read_text(encoding='utf-8'))

    def test_draft_exclusion_with_isolated_fixture(self):
        sys.path.insert(0, str(ROOT))
        import build
        with tempfile.TemporaryDirectory() as folder:
            fixture = Path(folder)
            shutil.copytree(ROOT / 'content', fixture / 'content')
            shutil.copyfile(ROOT / 'site.yaml', fixture / 'site.yaml')
            (fixture / 'static').mkdir()
            (fixture / 'content/notes/private-fixture.md').write_text(
                '---\ntitle: Private fixture\nsummary: Never publish this\n'
                'publishedAt: 2026-09-05\ncategory: thought\ndraft: true\nreviewReady: true\n---\nSecret',
                encoding='utf-8')
            with patch.multiple(build, ROOT=fixture, CONTENT=fixture / 'content',
                                STATIC=fixture / 'static', OUTPUT=fixture / 'public'):
                build.main(interaction_preview=True)
            preview = fixture / '.interaction-preview'
            self.assertFalse((preview / 'notes/private-fixture/index.html').exists())
            self.assertNotIn('private-fixture', (preview / 'interaction-preview/index.html').read_text(encoding='utf-8'))

    def test_review_and_interaction_flags_are_mutually_exclusive(self):
        result = subprocess.run([sys.executable, 'build.py', '--preview', '--interaction-preview'],
                                cwd=ROOT, capture_output=True)
        self.assertEqual(result.returncode, 2)


if __name__ == '__main__':
    unittest.main()
