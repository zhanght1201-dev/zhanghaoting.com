# 四扇窗口：已确认设计与编辑手册

## 当前显示模式（2026-09-14）

- 正式网站支持 **漫画 / 像素** 两种显示模式；首次访问默认漫画，所有页面右上角可切换。`localStorage` 的 `four-windows-ui` 保存 `comic` / `pixel`；无有效偏好时回到漫画。公开模式名称统一为“漫画”。
- 两种模式共用正文、原生简介 dialog、静态生成框架与独立 URL；以下旧视觉规范描述的是像素模式，漫画模式规范见文末。

## 当前基线

- 网站：https://zhanghaoting.com/；姓名以 `site.yaml` 为准：**张浩厅**，英文 Haoting Zhang。
- 已上线视觉版本：`0631b64`（2026-09-09）；这是界面发布基线，不代表后续文档提交号。
- 使用 Python + Jinja + Markdown 构建纯静态页面；保留现有 URL、Markdown 字段、公开/草稿规则。
- 首页为四张统一卡牌；点击卡牌或顶部栏目进入同一原生 dialog 简介，简介内切换栏目或通过详情链接进入独立页面。
- 独立详情页采用已选定的 **01 展签阅读**：桌面左侧固定场景、目录，右侧纵向阅读；手机目录置顶并收起场景侧栏。

## 视觉规范

| 编号 | 栏目 / slug | 英文 | 场景 |
| --- | --- | --- | --- |
| 01 | 关于我 / about | IDENTITY | 人物站在门前、晨光与远景 |
| 02 | 学校与科研 / school | RESEARCH | 望远镜、星空与轨道图 |
| 03 | 职业与实践 / work | PRACTICE | 桥梁施工、吊机和工作灯 |
| 04 | 思考与记录 / notes | NOTES | 窗边台灯、笔记本与夜景 |

卡牌共用比例、边框、编号位置和文字层级，以卡内图案区分。保留深色背景、大留白、暖色细线与像素图形；不恢复旧档案室全屏背景或人物行走导航。

- 首页背景 `#080b10`，阅读背景 `#090d12`，标题为米白/暖灰，强调色为低饱和金黄（约 `#d9b77d`）。具体值以 CSS 为准。
- 字体 A：Fusion Pixel 12px proportional zh-hans；标题、导航和编号使用像素字体，长正文使用系统无衬线字体，桌面约 16px、行高 1.95。
- 首页卡面文字通过 HTML 生成；原合成图只作为场景来源，裁切时不可露出原图中的重复编号、外框和标题。
- 正文不添加持续闪烁、悬浮物件或人物行走。像素图像不能拉伸失真，表格和代码块在自身容器内滚动。

## 动作与访问规则

- 卡牌悬停/键盘聚焦有轻微上浮与点亮；点击立即打开简介，不等待装饰动画。
- 科研星轨运行一圈；关于我为门光渐亮；记录为灯光与纸面星点。
- 实践使用原画构件裁片 + 局部修补天空 + SVG 吊索。最大上提 28 场景像素，上提 2.8 秒、返回 1.8 秒；吊索随构件收短，只有一套吊装结构。
- 实际动画在 `static/card-preview.js`、`static/card-preview.css`，素材与裁片在 `templates/partials/window-art.html`。
- `prefers-reduced-motion` 取消位移与动画；后台不推进吊装。无 JavaScript 时卡牌与导航直接进入栏目，修饰键点击保留浏览器行为。
- 简介支持 Escape、焦点约束、关闭后恢复触发项焦点，手机首次点击直接进入。
- 当前门光/星轨/纸面仍是叠加效果，**未完成真实书页翻动、完整场景拆层和电影式整屏变形转场**，不要把它们描述为已实现。

## 编辑入口

| 修改内容 | 文件 |
| --- | --- |
| 姓名、站点介绍、身份 | `site.yaml` |
| 关于/科研/实践正文及摘要 | `content/pages/about.md`、`school.md`、`work.md` |
| 文章与标签 | `content/notes/*.md` |
| 项目 | `content/projects/*.md`，section 为 school 或 work |
| 正式首页、卡面标题、简介及导航 | `templates/window-home.html` |
| 场景裁片、修补区、SVG ID | `templates/partials/window-art.html` |
| 首页排版/交互 | `static/card-preview.css`、`static/card-preview.js`（名称带 preview，实际正式首页也使用） |
| 统一详情布局与编号 | `templates/reading-base.html` |
| 栏目、记录列表、文章、项目模板 | `templates/section.html`、`notes.html`、`note-detail.html`、`project-detail.html` |
| 阅读样式、目录与表格容器 | `static/reading.css`、`static/reading.js` |
| 数据筛选、模板上下文、输出 | `build.py` |

`templates/home.html` 是旧档案室模板，仍供历史交互预览使用，**不是正式首页入口**。旧预览路由仅显式构建，不应进入 sitemap。`templates/card-preview.html` 继承正式首页但添加 noindex。

目前编号映射分别存在 `window-home.html` 和 `reading-base.html`，改栏目时务必同步；首页简介摘要来自构建数据。记录简介的回退文案目前在 `build.py`，调整时检查所有构建模式。

## 内容与素材

- 使用当前公开摘要、项目和最近三篇公开文章；无项目时仅呈现简介与详情入口。
- `draft: true` 默认不发布。`--preview` 可以包含 reviewReady 草稿，仅用于本地检查；不得将 `.preview` 当成线上产物。
- 当前栏目正文保留了一些待补充项，应由真实经历替换，不编造项目、岗位、指标。
- 卡牌素材在 `static/images/window-cards/`：`concept.png` 为原四卡图，`clean-plate.png` 为吊装背景修补图。每个 SVG 实例使用独立 clip/mask ID，避免首页与 dialog 互相影响。
- 字体与 OFL 许可证在 `static/fonts/`。不要只修改 `public/` 中的副本，下一次构建会覆盖。

## 常规更新与发布

先查看 `git status`、当前分支和远端 main；工作区有未提交改动时不要 reset/clean、整库暂存或强推。逐项暂存本轮文件，包含源文件及 `public/` 生成物。

```powershell
python build.py
python -m unittest discover -s tests -v
python -m http.server 8000 --bind 127.0.0.1 --directory public
```

确认用户要求发布后，按 `DEPLOYMENT.md` 更新 GitHub main。Cloudflare Pages：生产分支 main，框架 None，构建命令为空，输出目录 public。无需在 Cloudflare 安装 Python，也不要另建托管站点或修改 DNS。

发布后检查 https://zhanghaoting.com/，不能把“git push 成功”当作线上已经完成。验证根目录是四卡首页，四个简介正确，详情与返回入口可用，资源无 404，手机无横向溢出。

## 验收最小集

1. 1440、1024、768、390、360 宽度；卡牌标题可辨认，详情长文/表格无页面横向溢出。
2. 卡牌与顶部导航进入同一简介；简介切换、关闭、Escape、焦点恢复。
3. 四栏目完整路径：首页 → 简介 → 详情 → 返回首页；记录文章链接和列表筛选。
4. 吊装不重复，进入/离开可复位；减少动态、无 JS 和移动触摸路径正常。
5. 测试验证 metadata、单一 h1、内部链接、草稿排除和 sitemap；预览构建不改动正式输出。

## 本轮本地工作区说明

2026-09-09 发布使用了 `artifacts/publish-four-windows` 独立 Git worktree，分支 `codex/publish-four-windows`，基于最新远端提交；从该分支推送 HEAD:main。原始工作区仍保留完整设计过程和未提交文件，未被清理。后续更新前先查看 `git worktree list` 与 `git status`，不可直接从旧本地 main 覆盖远端。

之前的 file:// 效果比较页是本机视觉草案，不是生产依赖；不需要把这些绝对路径写入网站。

## 2026-09-10 已确认互动更新

首页固定镜头，移除整卡位移及旧打光叠层。`static/window-motion.js` 驱动门扇轻开、四颗错峰像素流星、吊装上提与书签/断续像素星线；望远镜和书页保持原形。`notes-quiet.png` 是用户授权代码局部修补的低密度静态星点底图，原图 `concept.png` 保留；`motion-clean.png` 用于门扇遮挡背景。简介和阅读场景同步低密度书页。触屏及减少动态保持静态，预览调试按钮不进入生产。

动画偏好补充：默认尊重系统减少动态；首页显示状态及“启用本次动画 / 暂停动画”按钮。用户主动启用后先演示一轮，再响应悬停；sessionStorage 保存当前标签页选择，触屏仍保持静态。验证须覆盖 reduce 环境下的默认暂停、主动启用、暂停及刷新恢复。

最新确认：PC 和手机均默认启用动画，不再由系统减少动态或触屏条件自动禁用。素材就绪后展示一轮，PC 继续响应悬停；手机点击立即打开简介。两端均显示暂停开关，保留用户在当前标签页主动暂停的选择。此条替代上述默认暂停及触屏静态规则。

## 2026-09-11 正式视觉更新
已确认 02 蓝紫城市夜景 + 03 雨夜动态，黑色卡牌主体配局部紫色及像素切角。首页使用 `neon-home.css`、`neon-city.js`；简介与阅读页共用 `neon-shared.css`。阅读页背景静态且压暗。正式页面不包含方案切换、仅看背景、重播、最终预览等调试控件；仅保留统一动画启停按钮，同时控制卡牌和城市。正式链接维持原路径。`static/design-preview/city-motion/` 为独立历史预览，不是生产页依赖，不进入 sitemap。

## 2026-09-14 全画面雨景
正式首页采用明显写实雨势；`neon-city.js` 绘制完整背景雨景，`glass-rain.js` 绘制全屏不规则撞击水迹，内容层覆盖特效且不拦截点击。统一暂停同时控制三层动画；正式界面无雨势选项、溅雨开关、预览描述。废弃在线预览从部署文件移除（Git 历史可恢复）；其余已确认清单中的 19 个本地预览目录已获明确授权并清理，正式素材保留。


## 水痕优化（已确认发布）
玻璃撞击由 32 组、5–9 秒间隔改为 22 组、9–13 秒间隔，平均频率约降低 56%。移除周边悬浮白点，改为低对比薄水膜和断续明暗折射轮廓；背景雨势不变。`glass-rain.js?v=rain3`。


## 2026-09-14 漫画模式正式接入

漫画首页保留四卡大框架，01 关于我为黄、02 学校与科研为蓝、03 职业与实践为橙、04 思考与记录为青；简介与阅读页采用 C 分镜档案方案，以栏目色配白灰底、斜切封面和章节编号。像素模式保留蓝紫夜景、雨夜、卡内像素互动与 01 展签阅读。

- 漫画背景是三张白灰漫画图，每轮 **7000ms**，依次城市机械、雨城街景、山海探索。分镜错峰滑切，保留定格时间；打开简介、转场、切换像素、后台及手动暂停时不推进。
- 首页悬停/键盘聚焦使用跨格拟声字与物件动作，点击仍立即打开简介；触屏第一次点击直接进入。暂停按钮同时控制漫画背景、悬停效果与进入转场。
- 简介中进入栏目或文章时，五个不规则分镜逐一拼成完整漫画页；随后跳转原有静态 URL，在目标页用十二块不规则碎片撕开并显示正文。转场标题与漫画页都保持白灰，主题色不进入漫画故事图。Escape/跳过、图片失败及超时均可继续；无 JS 时链接直接导航。
- 最终漫画页选择：关于我 03，学校与科研 B，职业与实践 B，思考与记录 B。`static/images/comic/story-*-final.png` 为对应确认的完整图；不以设计中的虚构叙事替换任何真实经历正文。
- 素材来源为本轮用户已确认的 `artifacts/comic-slide-preview` 预览成果：卡面 `reference.png`、三幅 `background*.png` 与四幅最终漫画页。正式资源均复制到 `static/images/comic/`；生产不依赖预览服务、绝对本机路径、sections.json 或 hash 模拟路由。

新增入口：`templates/partials/ui-head.html`、`ui-switch.html`、`comic-art.html`、`comic-background.html`；`static/ui-mode.js` 在首次绘制前恢复风格。`comic-ui.css` 只在 `html[data-ui=comic]` 下覆盖已有视觉；`comic-home.js` 控制 7 秒背景，`comic-fx.*` 控制跨格反馈，`comic-transition.*` 控制分镜与撕页。过渡使用一次性 `sessionStorage` 数据（路径、栏目、时间），不改 URL，也不缓存正文。

验收：普通 `python build.py`、`python -m unittest discover -s tests -v`；另以 Playwright 运行 `tests/verify-comic.cjs`，通过环境变量 `SITE_URL` 指向本地正式 public 服务或线上域名，`PLAYWRIGHT_PATH` / `CHROME_PATH` 可指定现有运行时。覆盖两模式持久化、四栏目 5 分镜/12 碎片、暂停与跳过、焦点恢复、文章链接、1440/1024/768/390/360 宽度、素材失败与无 JS 路径。

本轮发布使用 `artifacts/publish-comic-mode` 独立 worktree，基于 `origin/main` 创建，保留原始工作区的设计过程和未提交改动。发布仍采用普通构建与 GitHub main → Cloudflare Pages。


## iPhone Safari 转场兼容修复
漫画图片在打开栏目简介时提前加载，并等待图片解码。分镜使用实际 img 元素，移除不必要的 perspective/backface 图层组合；画板明确设置宽高，避免旧版 Safari 的 flex/aspect-ratio 空画板。冷加载期间使用已显示的灰度栏目卡面与加载提示，不再只显示白底；20 秒失败保护与跳过入口仍可直接导航。转场资源版本 `mobile2`。验收增加 WebKit iPhone 触摸、慢加载、画面像素检查和四栏目目标页碎片。
