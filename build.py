from __future__ import annotations

import math
import argparse
import re
import shutil
from datetime import date, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

import markdown
import yaml
from jinja2 import Environment, FileSystemLoader, select_autoescape


ROOT = Path(__file__).parent.resolve()
CONTENT = ROOT / "content"
TEMPLATES = ROOT / "templates"
STATIC = ROOT / "static"
OUTPUT = ROOT / "public"

CATEGORY_LABELS = {
    "reading": "阅读",
    "thought": "思考",
    "life": "生活",
    "research": "科研项目",
    "internship": "实习项目",
    "engineering": "工程项目",
    "personal": "个人项目",
}


def read_markdown(path: Path) -> dict[str, Any]:
    raw = path.read_text(encoding="utf-8")
    match = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", raw, re.DOTALL)
    if not match:
        raise ValueError(f"{path.relative_to(ROOT)} 缺少 YAML front matter")

    metadata = yaml.safe_load(match.group(1)) or {}
    body = match.group(2).strip()
    metadata.update(
        {
            "slug": path.stem,
            "source_path": str(path.relative_to(ROOT)),
            "body": body,
            "html": markdown.markdown(
                body,
                extensions=["extra", "sane_lists", "smarty"],
                output_format="html5",
            ),
        }
    )
    return metadata


def require_fields(item: dict[str, Any], fields: tuple[str, ...]) -> None:
    missing = [field for field in fields if item.get(field) in (None, "")]
    if missing:
        raise ValueError(f"{item['source_path']} 缺少字段：{', '.join(missing)}")


def iso_date(value: Any) -> str:
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return str(value)


def display_date(value: Any) -> str:
    if isinstance(value, datetime):
        value = value.date()
    if isinstance(value, date):
        return f"{value.year} 年 {value.month} 月 {value.day} 日"
    parsed = datetime.strptime(str(value), "%Y-%m-%d").date()
    return f"{parsed.year} 年 {parsed.month} 月 {parsed.day} 日"


def reading_time(text: str) -> int:
    chinese_chars = len(re.findall(r"[\u3400-\u9fff]", text))
    latin_words = len(re.findall(r"\b[A-Za-z0-9][A-Za-z0-9'-]*\b", text))
    return max(1, math.ceil(chinese_chars / 350 + latin_words / 200))


def absolute_url(site_url: str, path: str) -> str:
    return urljoin(site_url.rstrip("/") + "/", path.lstrip("/"))


def write_text(relative_path: str, content: str) -> None:
    target = OUTPUT / relative_path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8", newline="\n")


def main(preview: bool = False, interaction_preview: bool = False, pixel_preview: bool = False) -> None:
    global OUTPUT
    OUTPUT = ROOT / ('.pixel-preview' if pixel_preview else '.interaction-preview' if interaction_preview else '.preview' if preview else 'public')
    config = yaml.safe_load((ROOT / "site.yaml").read_text(encoding="utf-8"))
    site = config["site"]
    home = config["home"]
    social = config.get("social", {})

    pages = [read_markdown(path) for path in sorted((CONTENT / "pages").glob("*.md"))]
    notes = [read_markdown(path) for path in sorted((CONTENT / "notes").glob("*.md"))]
    if preview:
        candidates = {n['slug']: n for n in notes}
        for path in sorted((ROOT / 'reviews' / 'notes').glob('*.md')):
            candidate = read_markdown(path)
            candidates[candidate['slug']] = candidate
        notes = list(candidates.values())
    projects = [read_markdown(path) for path in sorted((CONTENT / "projects").glob("*.md"))]

    for page in pages:
        require_fields(page, ("title", "summary", "navOrder", "draft"))
        page["url"] = f"/{page['slug']}/"

    for note in notes:
        require_fields(note, ("title", "summary", "publishedAt", "category", "draft"))
        if note["category"] not in {"reading", "thought", "life"}:
            raise ValueError(f"{note['source_path']} 的文章 category 无效")
        note["publishedAtIso"] = iso_date(note["publishedAt"])
        note["publishedAtDisplay"] = display_date(note["publishedAt"])
        note["year"] = int(note["publishedAtIso"][:4])
        note["categoryLabel"] = CATEGORY_LABELS[note["category"]]
        note["readingTime"] = reading_time(note["body"])
        note["url"] = f"/notes/{note['slug']}/"

    for project in projects:
        require_fields(project, ("title", "summary", "publishedAt", "category", "section", "draft"))
        if project["category"] not in {"research", "internship", "engineering", "personal"}:
            raise ValueError(f"{project['source_path']} 的项目 category 无效")
        if project["section"] not in {"school", "work"}:
            raise ValueError(f"{project['source_path']} 的 section 必须是 school 或 work")
        project["publishedAtIso"] = iso_date(project["publishedAt"])
        project["publishedAtDisplay"] = display_date(project["publishedAt"])
        project["categoryLabel"] = CATEGORY_LABELS[project["category"]]
        project["url"] = f"/{project['section']}/{project['slug']}/"

    public_pages = sorted((p for p in pages if not p["draft"]), key=lambda p: p["navOrder"])
    public_notes = sorted(
        (n for n in notes if not n["draft"] or (preview and n.get('reviewReady'))),
        key=lambda n: n["publishedAtIso"],
        reverse=True,
    )
    public_projects = sorted(
        (p for p in projects if not p["draft"]),
        key=lambda p: p["publishedAtIso"],
        reverse=True,
    )

    page_slugs = {page["slug"] for page in public_pages}
    for project in public_projects:
        if project["section"] not in page_slugs:
            raise ValueError(f"{project['source_path']} 对应的栏目页仍是草稿")

    navigation = [
        {"title": page.get("navTitle", page["title"]), "url": page["url"], "slug": page["slug"]}
        for page in public_pages
    ]
    if public_notes:
        navigation.append({"title": "思考与记录", "url": "/notes/", "slug": "notes"})

    env = Environment(
        loader=FileSystemLoader(TEMPLATES),
        autoescape=select_autoescape(["html", "xml"]),
        trim_blocks=True,
        lstrip_blocks=True,
    )
    env.filters["display_date"] = display_date

    def render(template: str, **context: Any) -> str:
        return env.get_template(template).render(
            site=site,
            home=home,
            social=social,
            navigation=navigation,
            category_labels=CATEGORY_LABELS,
            archive_home="/",
            **context,
        )

    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    shutil.copytree(STATIC, OUTPUT)

    home_sections = {p["slug"]: p for p in public_pages if p["slug"] in ("about", "school", "work")}
    if public_notes:
        home_sections["notes"] = {"title": "思考与记录", "url": "/notes/", "summary": "记录正在形成的想法，以及阅读、生活与持续探索。"}

    featured_pages = [p for p in public_pages if p.get("featured") and p["slug"] != "contact"]
    featured_projects = [p for p in public_projects if p.get("featured")][:2]
    write_text(
        "index.html",
        render(
            "window-home.html",
            sections=home_sections,
            section_projects={slug: [p for p in public_projects if p["section"] == slug] for slug in ("school", "work")},
            active="home",
            canonical=absolute_url(site["url"], "/"),
            page_title=site["title"],
            page_description=site["description"],
            featured_pages=featured_pages,
            featured_projects=featured_projects,
            recent_notes=public_notes[:3],
        ),
    )

    for page in public_pages:
        page_projects = [p for p in public_projects if p["section"] == page["slug"]]
        write_text(
            f"{page['slug']}/index.html",
            render(
                "section.html",
                active=page["slug"],
                canonical=absolute_url(site["url"], page["url"]),
                page_title=f"{page['title']} · {site['name']}",
                page_description=page["summary"],
                page=page,
                projects=page_projects,
            ),
        )

    # Explicit opt-in preview, kept out of the production build and sitemap.
    if pixel_preview:
        sections = {p['slug']: p for p in public_pages if p['slug'] in ('about', 'school', 'work')}
        if public_notes:
            sections['notes'] = {'title': '思考与记录', 'url': '/notes/', 'summary': '记录正在形成的想法，以及阅读、生活与持续探索。'}
        write_text('pixel-preview/index.html', render('pixel-preview.html',
            active='home', canonical=absolute_url(site['url'], '/'),
            page_title=f"像素物件预览 · {site['name']}", page_description=site['description'],
            sections=sections, recent_notes=public_notes[:3],
            section_projects={slug: [p for p in public_projects if p['section'] == slug] for slug in ('school', 'work')}))

        card_sections = dict(sections)
        card_sections.setdefault('notes', {'title': '思考与记录', 'url': '/notes/', 'summary': '记录正在形成的想法，以及阅读、生活与持续探索。'})
        write_text('card-preview/index.html', render('card-preview.html',
            sections=card_sections, recent_notes=public_notes[:3],
            section_projects={slug: [p for p in public_projects if p['section'] == slug] for slug in ('school', 'work')}))

    if interaction_preview:
        school_page = next((p for p in public_pages if p["slug"] == "school"), None)
        if school_page:
            write_text(
                "interaction-preview/index.html",
                render(
                    "interaction-preview.html",
                    active="home",
                    canonical=absolute_url(site["url"], "/"),
                    page_title=f"人物交互预览 · {site['name']}",
                    page_description="科研终端人物交互预览。",
                    featured_pages=featured_pages,
                    featured_projects=featured_projects,
                    recent_notes=public_notes[:3],
                    school_page=school_page,
                    school_projects=[p for p in public_projects if p["section"] == "school"],
                ),
            )

    if public_notes:
        years = sorted({note["year"] for note in public_notes}, reverse=True)
        write_text(
            "notes/index.html",
            render(
                "notes.html",
                active="notes",
                canonical=absolute_url(site["url"], "/notes/"),
                page_title=f"思考与记录 · {site['name']}",
                page_description="阅读、思考与经过筛选的生活记录。",
                notes=public_notes,
                years=years,
            ),
        )
        for note in public_notes:
            write_text(
                f"notes/{note['slug']}/index.html",
                render(
                    "note-detail.html",
                    active="notes",
                    canonical=absolute_url(site["url"], note["url"]),
                    page_title=f"{note['title']} · {site['name']}",
                    page_description=note["summary"],
                    note=note,
                ),
            )

    for project in public_projects:
        write_text(
            f"{project['section']}/{project['slug']}/index.html",
            render(
                "project-detail.html",
                active=project["section"],
                canonical=absolute_url(site["url"], project["url"]),
                page_title=f"{project['title']} · {site['name']}",
                page_description=project["summary"],
                project=project,
            ),
        )

    write_text(
        "404.html",
        render(
            "404.html",
            active="",
            canonical=absolute_url(site["url"], "/404.html"),
            page_title=f"页面未找到 · {site['name']}",
            page_description="请求的页面不存在。",
        ),
    )

    urls = ["/"] + [page["url"] for page in public_pages]
    if public_notes:
        urls.append("/notes/")
    urls.extend(note["url"] for note in public_notes)
    urls.extend(project["url"] for project in public_projects)
    sitemap = env.get_template("sitemap.xml").render(site=site, urls=urls)
    write_text("sitemap.xml", sitemap)

    print(
        f"Built {len(urls)} public pages "
        f"({len(public_pages)} sections, {len(public_notes)} notes, {len(public_projects)} projects)."
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    preview_mode = parser.add_mutually_exclusive_group()
    preview_mode.add_argument('--preview', action='store_true', help='Build review-ready notes into .preview, never public')
    preview_mode.add_argument('--interaction-preview', action='store_true', help='Build character demo into .interaction-preview, never public')
    preview_mode.add_argument('--pixel-preview', action='store_true', help='Build object demo into .pixel-preview, never public')
    args = parser.parse_args()
    main(preview=args.preview, interaction_preview=args.interaction_preview, pixel_preview=args.pixel_preview)

