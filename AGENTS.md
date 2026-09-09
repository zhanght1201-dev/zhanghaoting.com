# 项目协作说明

开始编辑前阅读 `docs/four-windows-maintenance.md`，发布前阅读 `DEPLOYMENT.md`。已确认风格为“四扇窗口”卡牌首页 + 栏目简介 dialog + 01 展签阅读详情页。

- 正式首页是 `templates/window-home.html`；`templates/home.html` 是历史档案室预览模板。
- 姓名、栏目编号、正文与素材来源以维护手册和 `site.yaml` 为准。保持已有 URL 与静态生成框架。
- 首页与阅读布局编号须同步；不要把临时示意文字或未经确认的经历写入公开内容。
- 修改源文件后构建 `public/`，运行相关测试；正式发布必须使用普通构建，不使用含待审草稿的预览目录。
- 发布沿用 GitHub main → Cloudflare Pages。用户要求发布时执行完整流程并验证线上；普通编辑不自动部署。
- 检查当前工作区与远端关系，保留已有未提交改动，不盲目 `git add .`、reset/clean 或 force push。
