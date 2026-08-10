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
git add .
git commit -m "Update website content"
git push
```

Cloudflare Pages 会在推送后自动发布新的 `public/`。

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
