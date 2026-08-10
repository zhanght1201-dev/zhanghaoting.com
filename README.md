# zhanghaoting.com

张浩厅的个人数字档案。网站使用 Markdown 保存长期内容，通过 Python 构建为可直接部署的纯静态页面。

## 本地使用

```powershell
python -m pip install -r requirements.txt
python build.py
python -m http.server 8000 --directory public
```

访问 `http://localhost:8000`。构建结果位于 `public/`，可以直接部署到 Cloudflare Pages。

运行自动检查：

```powershell
python -m unittest discover -s tests -v
```

## 内容结构

```text
content/
  pages/       关于、学校、职业、兴趣、联系等栏目页
  notes/       阅读、思考和生活记录
  projects/    学校或职业栏目下的精选项目
static/        CSS、JavaScript、图标和部署头部配置
templates/     Jinja 页面模板
site.yaml      站点身份、首页文案和公开联系方式
build.py       静态站点生成器
public/        构建产物
```

`draft: true` 的栏目、文章和项目不会生成页面，也不会进入导航、首页或站点地图。当前职业、兴趣、联系和项目内容均保留为草稿模板，等待真实资料后再公开。

## 添加一篇记录

复制 `content/notes/reading-template.md`，修改文件名和 front matter：

```yaml
---
title: 文章标题
summary: 用于首页和文章列表的简短摘要
publishedAt: 2026-08-10
category: reading # reading / thought / life
tags:
  - 阅读
featured: false
draft: false
---
```

正文使用 Markdown。阅读文章如包含摘录，应保留 `source` 信息并清楚区分摘录与个人观点。

## 添加一个精选项目

复制 `content/projects/research-project-template.md`。项目类别支持 `research`、`internship`、`engineering`、`personal`；`section` 必须是 `school` 或 `work`。对应栏目页必须已经公开，项目才允许构建。

每个项目正文按照“问题背景—个人职责—过程与判断—结果证据—复盘”组织。技术栈填写在 `tags`，相关论文、代码和演示填写在 `links`。

## 发布新栏目

完善 `content/pages/` 中对应 Markdown 后，把 `draft` 改为 `false`。导航由 `navOrder` 自动排序；空栏目不需要手工从模板中删除。

每次修改内容或样式后重新运行 `python build.py`，并提交源文件与更新后的 `public/`。
