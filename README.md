# 计算机专业名词大全（工具站）

面向计算机/人工智能/软件工程专业本科与研究生的**名词速查工具站**：689 个词条、57 组易混淆辨析，支持搜索（中文/英文/拼音）、按章节与场景筛选、列表/卡片双视图、弹层刷词、分享直达链接。

线上地址：https://cs-dict.pages.dev/

## 文件说明

| 文件 | 说明 |
|------|------|
| `template.html` | 页面结构与全部 CSS（含亮/暗主题、打印样式） |
| `app.js` | 全部交互逻辑（搜索、筛选、弹层、辨析、hash 分享、键盘导航） |
| `terms.json` | 词条与辨析数据（689 词条 / 57 混淆组） |
| `build.js` | 构建脚本：合并以上三者为自包含单文件 HTML |
| `wx-qr.jpg` | 公众号二维码（构建时 base64 内嵌，缺失时自动隐藏二维码位） |
| `计算机专业名词大全_工具站.html` | 构建产物（可直接双击打开） |

## 构建

```bash
node build.js
```

产物输出为 `计算机专业名词大全_工具站.html`。更换二维码图片请覆盖 `wx-qr.jpg` 后重新构建。

## 部署

```bash
# 1. 构建
node build.js
# 2. 复制产物为部署目录入口（Cloudflare Pages 需要 index.html）
mkdir deploy && cp 计算机专业名词大全_工具站.html deploy/index.html
# 3. 部署到 Cloudflare Pages
npx wrangler pages deploy deploy --project-name cs-dict
```

## 功能速览

- 搜索：中文名 / 英文 / 拼音缩写 / 拼音全拼 / 释义全文，防抖 150ms
- 章节：7 个主按钮（彩色）+「更多章节」下拉（含 57 组易混淆辨析）
- 场景筛选：面试刷词 / 新手入门 / 升学保研 / 职场黑话 / 2026 前沿
- 分享直达：`#?q=词&ch=ch5&s=场景`，打开链接即恢复视图
- 无障碍：WCAG AA 对比度、focus-visible 键盘导航、Enter 全交互
- 底部公众号卡片：内嵌「计算机突围」二维码
