# zhanghaoting.com

张昊庭的纯静态个人主页，可直接部署到 Cloudflare Pages。

## 部署前需要修改

打开 `public/index.html`，搜索 `TODO`，替换以下内容：

1. 个人简介和教育经历；
2. 三个研究方向；
3. 两至四个代表项目；
4. GitHub、邮箱、Google Scholar 等真实链接；
5. 页脚年份和最近更新时间。

## 本地预览

在仓库目录运行：

```powershell
python -m http.server 8000 --directory public
```

浏览器打开：

```text
http://localhost:8000
```

## 上传到 GitHub

先在 GitHub 创建一个空仓库，例如 `zhanghaoting.com`，然后在本目录运行：

```powershell
git init
git add .
git commit -m "Initial personal website"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_NAME/zhanghaoting.com.git
git push -u origin main
```

将 `YOUR_GITHUB_NAME` 替换为你的 GitHub 用户名。

## 部署到 Cloudflare Pages

1. 打开 Cloudflare 控制台；
2. 进入 `Workers & Pages`；
3. 选择 `Create application` → `Pages` → `Connect to Git`；
4. 授权 GitHub 并选择 `zhanghaoting.com` 仓库；
5. Production branch 填 `main`；
6. Framework preset 选择 `None`；
7. Build command 留空；
8. Build output directory 填 `public`；
9. 点击 `Save and Deploy`。

先确认自动生成的 `*.pages.dev` 地址可以访问。

## 绑定正式域名

在 Pages 项目中进入 `Custom domains`：

1. 首先添加 `zhanghaoting.com`；
2. Cloudflare 会自动创建 Pages DNS 记录；
3. 确认根域可以访问后，再添加 `www.zhanghaoting.com`；
4. 现有指向 Squarespace 的 `www` CNAME 需要在切换时移除或替换；
5. 不要删除 NS、MX、SPF、DKIM 和域名验证 TXT 记录。

最后在 Cloudflare Redirect Rules 中设置：

```text
www.zhanghaoting.com/* → https://zhanghaoting.com/*
状态码：301
保留路径和查询参数
```

## 后续更新

每次修改完成后运行：

```powershell
git add .
git commit -m "Update website"
git push
```

Cloudflare Pages 会自动重新部署。
