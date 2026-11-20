# 部署说明

## Cloudflare Pages

本站的 `public/` 是已经生成好的纯静态目录，Cloudflare Pages 可使用以下配置：

- Production branch：`main`
- Framework preset：`None`
- Build command：留空
- Build output directory：`public`

这样线上构建环境不需要安装 Python。每次发布前在本地执行：

```powershell
python build.py
python -m unittest discover -s tests -v
git status --short
# 检查差异后逐项暂存实际改动文件，包含对应源文件和 public 构建产物。
git add public
# 按本轮实际修改补充 git add <源文件路径>
git commit -m "Update website content"
git push
```

Cloudflare Pages 会在推送后自动发布新的 `public/`。

## 随笔互动 API

点赞与留言使用仓库根 `functions/` 和 Cloudflare D1，首次发布前必须创建数据库、执行迁移并在现有 Pages 项目绑定 `VISITOR_DB`，再重新部署。详细步骤、本地模拟和留言维护见 [访客互动说明](docs/visitor-interactions.md)。不要使用 `wrangler.local.jsonc` 中的本地占位 ID 配置线上；预览环境不得连接生产数据库。

普通构建同时更新 `lib/public-notes.js` 和 `public/_routes.json`，发布时需逐项包含这些生成物及实际修改的 `functions/`、`lib/`、`migrations/`、模板和静态资源。构建命令仍留空，输出目录仍为 `public`；Pages 会从根目录编译 Functions。推送成功后还需验证 API 与数据库实际可用。

## 域名

Pages 项目确认可访问后，在 `Custom domains` 中添加：

1. `zhanghaoting.com`
2. `www.zhanghaoting.com`

将 `www.zhanghaoting.com/*` 重定向到 `https://zhanghaoting.com/*`，状态码使用 `301`，并保留路径与查询参数。不要删除域名已有的 MX、SPF、DKIM 或验证用 TXT 记录。

## 发布前检查

- `site.yaml` 中的姓名、当前状态、年份和公开链接准确；
- 不应公开的内容保持 `draft: true`；
- 项目没有泄露保密信息；
- 阅读摘录注明来源；
- 自动测试全部通过；
- 在桌面和手机宽度下预览首页、栏目页和文章详情页。

## 当前版本与工作区

四扇窗口界面基线为 `0631b64`。编辑入口、动效约束和完整验收见 [维护手册](docs/four-windows-maintenance.md)。

发布前运行 `git fetch origin` 并检查 `git status`、`git branch --show-current` 和 `git log HEAD..origin/main --oneline`。在干净且与远端同步的 main 上按上文提交推送；若使用已检查的独立发布分支，使用 `git push origin HEAD:main`，只允许正常快进。远端前进时先整合更新，不强推。工作区含其他未提交改动时可基于 origin/main 新建独立工作区，只带入本次所需文件。

推送后验证根域名的页面和资源已更新；若未更新，检查 Pages 部署状态，不重复覆盖提交或修改 DNS。
