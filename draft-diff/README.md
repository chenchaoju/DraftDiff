# 文稿对照 DraftDiff

一款用于文章版本对比和内容差异分析的工具。用户从文章库选择参考文章，再粘贴或导入待对比文章，系统按字、句、段进行比对，并用颜色高亮新增、删除、修改内容。

## 技术栈

- **前端**：原生 HTML / CSS / JavaScript（无框架依赖）
- **后端**：Cloudflare Pages Functions（Workers）
- **数据库**：Cloudflare D1（SQLite）
- **部署**：从 GitHub 自动部署到 Cloudflare Pages

## 项目结构

```
draft-diff/
├── public/                  # 静态前端
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── app.js           # 主应用
│       ├── api.js           # API 客户端
│       └── diff.js          # 对比算法
├── functions/api/           # Pages Functions（API 路由）
│   ├── articles.js          # GET/POST /api/articles
│   ├── articles/[id].js     # GET/PUT/DELETE /api/articles/:id
│   └── categories.js        # GET /api/categories
├── schema.sql               # D1 数据库表结构
├── wrangler.toml            # Cloudflare 配置
└── package.json
```

## 部署步骤

### 前置条件

1. 注册 [Cloudflare 账号](https://dash.cloudflare.com/sign-up)
2. 安装 [Node.js](https://nodejs.org/) 18+
3. 安装 Wrangler：`npm install -g wrangler`
4. 登录：`wrangler login`

### 一、本地开发

```bash
# 1. 克隆项目
git clone <your-repo-url> draft-diff
cd draft-diff

# 2. 安装依赖
npm install

# 3. 创建本地 D1 数据库
npm run db:create
# 复制输出的 database_id，填到 wrangler.toml 的 database_id 处

# 4. 初始化数据库表（本地）
npm run db:init:local

# 5. 启动本地开发服务器
npm run dev
# 访问 http://localhost:8788
```

### 二、部署到 Cloudflare Pages

#### 方式 A：通过 GitHub 自动部署（推荐）

1. **把代码推送到 GitHub**

```bash
git init
git add .
git commit -m "init: draft-diff"
git branch -M main
git remote add origin https://github.com/你的用户名/draft-diff.git
git push -u origin main
```

2. **创建生产 D1 数据库**

```bash
# 创建远程数据库
wrangler d1 create draft-diff-db
# 把输出的 database_id 填到 wrangler.toml

# 初始化远程数据库
wrangler d1 execute draft-diff-db --file=./schema.sql --remote
```

3. **在 Cloudflare Dashboard 创建 Pages 项目**

   - 进入 [Cloudflare Dashboard](https://dash.cloudflare.com/) → Pages
   - 点击 "Create a project" → "Connect to Git"
   - 选择你的 GitHub 仓库
   - 配置：
     - **Project name**: draft-diff（或自定义）
     - **Build command**: 留空
     - **Build output directory**: `public`
     - **Root directory**: 留空
   - 点击 "Save and Deploy"

4. **绑定 D1 数据库**

   - 项目创建后，进入 Settings → Functions
   - 找到 "D1 database bindings"
   - 添加绑定：
     - **Variable name**: `DB`
     - **D1 database**: 选择 `draft-diff-db`
   - 保存

5. **触发重新部署**

   - 进入 Deployments → 最新部署 → "Retry deployment"

6. **访问你的网站**

   形如 `https://draft-diff.pages.dev`

#### 方式 B：直接命令行部署

```bash
# 部署到生产环境
wrangler pages deploy public --project-name=draft-diff
```

## 核心功能

### 1. 文章库（左侧）

- 搜索：按标题、内容、来源搜索
- 分类筛选
- 显示：标题、来源、字数、添加时间、标签
- 支持：新增、编辑、删除、批量导入

### 2. 对比工作区（中间 + 右侧）

- 参考文章：从文章库选择或直接粘贴
- 待对比文章：粘贴内容或上传 .txt / .md 文件

### 3. 对比模式

- **逐字**：检查错别字、标点
- **逐句**（默认）：适合公众号文章、说明文
- **逐段**：适合整篇文章结构调整

### 4. 差异高亮

| 类型 | 颜色 | 含义 |
|------|------|------|
| 新增 | 🟢 绿色 | 待对比文章中新增的内容 |
| 删除 | 🔴 红色 | 参考文章中删除的内容 |
| 修改 | 🟡 黄色 | 内容被修改 |
| 位置变化 | 🔵 蓝色 | 段落位置发生移动 |
| 相同 | ⚪ 灰色 | 未发生变化 |

### 5. 统计信息

- **文本相似度**：内容重合程度（不是抄袭率）
- **新增 / 删除**：字符数
- **修改**：句子/段落数
- **位置变化**：移动的段数

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/articles?search=&category=` | 文章列表 |
| POST | `/api/articles` | 新增文章 |
| POST | `/api/articles/bulk` | 批量导入 |
| GET | `/api/articles/:id` | 获取单篇 |
| PUT | `/api/articles/:id` | 更新 |
| DELETE | `/api/articles/:id` | 删除 |
| GET | `/api/categories` | 分类列表 |

## 批量导入格式

```
title: 文章标题
source: 来源
category: 分类
tags: 标签1, 标签2
这是文章内容...
可以多行。

---
title: 第二篇文章
内容...
```

## 后续可扩展功能

- [ ] AI 总结差异
- [ ] 标题/开头/结尾相似度检测
- [ ] 改写建议
- [ ] 历史版本管理
- [ ] 导出带高亮的 Word / PDF
- [ ] 多篇文章批量对比
- [ ] 从文章库自动找最相似文章

## 费用

Cloudflare 免费额度完全够用：
- Pages：无限请求、无限带宽
- D1：每天 500 万次读、10 万次写、5GB 存储
- Workers：每天 10 万次请求

个人/小团队使用基本不花钱。

## 许可

MIT
