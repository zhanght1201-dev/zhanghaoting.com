from __future__ import annotations

import subprocess
import sys
import unittest
from build import CONTENT, read_markdown
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
from xml.etree import ElementTree


ROOT = Path(__file__).parents[1]
PUBLIC = ROOT / "public"


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[str] = []
        self.title_count = 0
        self.description_count = 0
        self.canonical_count = 0
        self.h1_count = 0
        self.language = ""

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag == "html":
            self.language = values.get("lang") or ""
        elif tag == "title":
            self.title_count += 1
        elif tag == "h1":
            self.h1_count += 1
        elif tag == "meta" and values.get("name") == "description":
            self.description_count += 1
        elif tag == "link" and values.get("rel") == "canonical":
            self.canonical_count += 1
        elif tag in {"a", "link", "script"}:
            target = values.get("href") or values.get("src")
            if target:
                self.links.append(target)


def target_for(url: str) -> Path | None:
    parsed = urlparse(url)
    if parsed.scheme or parsed.netloc or url.startswith(("mailto:", "tel:", "#")):
        return None
    path = parsed.path
    if not path.startswith("/"):
        return None
    if path.endswith("/"):
        return PUBLIC / path.lstrip("/") / "index.html"
    return PUBLIC / path.lstrip("/")


class BuiltSiteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        subprocess.run([sys.executable, "build.py"], cwd=ROOT, check=True)

    def test_every_html_page_has_core_metadata_and_one_heading(self) -> None:
        for path in PUBLIC.rglob("*.html"):
            with self.subTest(path=path.relative_to(PUBLIC)):
                parser = PageParser()
                parser.feed(path.read_text(encoding="utf-8"))
                self.assertEqual(parser.language, "zh-CN")
                self.assertEqual(parser.title_count, 1)
                self.assertEqual(parser.description_count, 1)
                self.assertEqual(parser.canonical_count, 1)
                self.assertEqual(parser.h1_count, 1)

    def test_window_home_and_reading_flow(self) -> None:
        home = (PUBLIC / 'index.html').read_text(encoding='utf-8')
        self.assertNotIn('noindex', home)
        self.assertNotIn('scene-stage', home)
        self.assertNotIn('这里将接入', home)
        for slug in ('about', 'school', 'work', 'notes'):
            self.assertIn(f'data-summary="{slug}"', home)
            self.assertIn(f'data-open="{slug}"', home)
            detail = (PUBLIC / slug / 'index.html').read_text(encoding='utf-8')
            self.assertIn('reading-layout', detail)
            self.assertIn('class="reading-return" href="/"', detail)
        self.assertIn('/notes/why-this-site/', home)

    def test_all_root_relative_links_exist(self) -> None:
        for path in PUBLIC.rglob("*.html"):
            parser = PageParser()
            parser.feed(path.read_text(encoding="utf-8"))
            for link in parser.links:
                target = target_for(link)
                if target is not None:
                    with self.subTest(source=path.relative_to(PUBLIC), link=link):
                        self.assertTrue(target.is_file(), f"Missing target: {target}")

    def test_drafts_do_not_leak_into_public_output(self) -> None:
        public_text = "\n".join(
            path.read_text(encoding="utf-8") for path in PUBLIC.rglob("*.html")
        )
        self.assertNotIn("阅读记录标题", public_text)
        self.assertNotIn("科研项目标题", public_text)
        self.assertTrue((PUBLIC / "work" / "index.html").is_file())
        self.assertFalse((PUBLIC / "interests").exists())
        self.assertFalse((PUBLIC / "contact").exists())

    def test_sitemap_only_lists_built_public_pages(self) -> None:
        root = ElementTree.parse(PUBLIC / "sitemap.xml").getroot()
        namespace = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        urls = [item.text or "" for item in root.findall("sm:url/sm:loc", namespace)]
        self.assertEqual(len(urls), len(set(urls)))
        pages = [read_markdown(p) for p in (CONTENT / 'pages').glob('*.md')]
        notes = [read_markdown(p) for p in (CONTENT / 'notes').glob('*.md')]
        projects = [read_markdown(p) for p in (CONTENT / 'projects').glob('*.md')]
        expected = 1 + sum(not p['draft'] for p in pages) + sum(not p['draft'] for p in projects)
        expected += sum(not p['draft'] for p in notes) + int(any(not p['draft'] for p in notes))
        self.assertEqual(len(urls), expected)
        self.assertFalse(any("reading-template" in url for url in urls))


if __name__ == "__main__":
    unittest.main()
