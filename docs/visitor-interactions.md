# 随笔点赞与留言

## 访客行为

- 每篇公开随笔独立显示喜欢数和留言；同一浏览器可喜欢一次，也可以取消。
- 访客填写昵称（1–30 字）和纯文本留言（1–1000 字）后立即公开，不要求登录或邮箱。
- 浏览器通过本站的 HttpOnly Cookie `visitor_id` 识别，保存一年。清除 Cookie、隐私模式或换浏览器后会成为新访客；这不是每个自然人唯一计数。
- 不支持 HTML 或 Markdown 留言；展示时使用 `textContent`。留言包含昵称、正文、时间，不公开浏览器标识或限流数据。
- 网络失败时保留输入；同一次提交重试使用同一个 requestId，避免重复留言。
- 留言限制为每浏览器 10 分钟 5 条、每网络 IP 10 分钟 20 条，配合隐藏表单字段减少简单垃圾提交。这是轻量防刷，可在后续需要时接入 Turnstile。

## 代码与数据

页面继续由 Python 静态生成。`templates/partials/note-interactions.html`、`static/note-interactions.*` 提供文章末尾的互动区，适配漫画和像素模式。

`functions/api/notes/` 接收 API 请求，`lib/visitor-api.js` 处理 Cookie、校验和数据库操作，Cloudflare D1 绑定名称固定为 `VISITOR_DB`。数据库结构在 `migrations/0001_visitor.sql`。

API 仅允许 `lib/public-notes.js` 中的公开文章。普通 `python build.py` 自动更新这个清单；所有预览构建都关闭互动 UI 且不修改生产清单。文章 slug 是数据键，修改正文或重新发布不会清空互动数据；重命名 slug 前需要处理关联数据。

只有 `/api/notes/*` 和 `/api/note-likes` 调用 Functions，`public/_routes.json` 由普通构建生成；正文和其他静态资源继续直接分发。API 不缓存响应。数据库未配置或不可用时显示暂时不可用，不显示伪造的点赞或留言。

文章列表、首页“思考与记录”简介中的最近随笔、文章头部都标注 `♡ 点赞数`。`/api/note-likes?slugs=...` 一次查询最多 50 个公开文章的计数，不返回留言或设置访客 Cookie。打开页面、恢复到前台或浏览器返回页面时读取当前计数；详情页点赞或取消后立即同步头部数字。加载中或读取失败显示 `—`，只有确认没有点赞才显示 `0`；此展示不是持续轮询的实时推送。

## 本地验证

需要 Python 依赖和 Node.js 22.13+（Node SQLite 测试使用 `node:sqlite`）。

```powershell
python build.py
npm ci
npm run db:local
npm run dev
```

打开 `http://127.0.0.1:8788/notes/why-this-site/`。`python -m http.server` 只能预览静态页面，不能提供互动 API。

`wrangler.local.jsonc` 仅用于本地迁移，包含占位 ID，不能拿它部署远程数据库。开发服务通过 CLI 绑定本地 `VISITOR_DB`，数据库保存在已忽略的 `.wrangler/`；它与正式数据库隔离，测试留言不会上线。

```powershell
python -m unittest discover -s tests -v
npm test
# 本地开发服务已启动后：
$env:CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
npm run test:browser
```

## 首次上线配置

2026-11-20 已为现有 Pages 项目 `zhanghaoting-com` 创建并初始化 D1 数据库 `zhanghaoting-visitors`，生产绑定为 `VISITOR_DB`。Preview 未绑定生产库。后续普通内容发布复用现有绑定即可，无需重复创建数据库；本地模拟仍使用独立的 `.wrangler/` 数据。

继续使用现有 GitHub main → Cloudflare Pages，不新建站点、不改 DNS。仓库根 `functions/` 也须随源文件提交；只上传 `public/` 不足以部署 API。

1. 在现有 Cloudflare 账户创建专用 D1 数据库，例如 `zhanghaoting-visitors`，执行 `migrations/0001_visitor.sql`。可以在 D1 控制台执行，或登录 Wrangler 后按数据库实际名称执行：

   ```powershell
   npx wrangler d1 execute zhanghaoting-visitors --remote --file migrations/0001_visitor.sql
   ```

2. 在现有 Pages 项目的 Settings → Bindings → Add → D1 database，把生产绑定名设为 `VISITOR_DB`，选择这个数据库。不要把本地占位 ID 配到线上。
3. Pages 预览环境不要绑定生产数据库；需要云端 API 预览时创建独立测试数据库并初始化，绑定到 Preview 环境。
4. 完成绑定后再按 `DEPLOYMENT.md` 推送正式版本，并等待 Pages 发布成功。D1 绑定的变更需要重新部署生效。
5. 在线检查两篇文章的数据隔离、喜欢/取消/刷新、留言即刻展示、另一浏览器读取及手机双模式排版。测试留言先在独立预览库验证，避免往公开随笔写演示内容。

本地还没有 Cloudflare 账户授权时，代码和本地模拟可完整验证，但无法创建、绑定生产数据库或声称线上已启用。

## 维护留言

当前不提供公共删除接口或管理页面。站主可以在 Cloudflare D1 控制台按文章查看记录：

```sql
SELECT id, slug, nickname, body, created_at
FROM visitor_comments WHERE slug = 'why-this-site'
ORDER BY created_at DESC, id DESC LIMIT 50;
```

确认具体记录后可用完整 id 删除该条垃圾留言；先导出备份，切勿执行没有 WHERE 的删除：

```sql
DELETE FROM visitor_comments WHERE id = '已核实的留言完整ID';
```

发布和回滚网站代码均不清空 D1 数据。原始 IP 不存入数据库；防刷使用按 UTC 日期变化的 SHA-256 IP 摘要，这是可关联的假名数据，不能视作完全匿名。超过 10 分钟的限流记录会在下一次留言请求时清除；低流量时保留至下次请求。留言表中的浏览器标识用于防重和维护，不对外返回。

官方参考：[本地开发](https://developers.cloudflare.com/pages/functions/local-development/)、[D1 绑定](https://developers.cloudflare.com/pages/functions/bindings/)、[D1 本地数据库隔离](https://developers.cloudflare.com/d1/best-practices/local-development/)。
