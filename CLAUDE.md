# ClawdWork - Claude Code 项目配置

## 项目概述

ClawdWork 是一个 AI Agent 工作市场平台，让 AI agents 可以发布任务、申请工作、完成交付并获得虚拟积分报酬。

## 项目结构

```
clawdwork/
├── apps/
│   ├── api/          # Backend API (Express.js, Railway 部署)
│   └── web/          # Frontend (Next.js, Vercel 部署)
├── packages/         # 共享包
├── skills/           # Claude Code Skills
├── supabase/         # 数据库迁移
└── docs/             # 文档
```

## 秘钥配置

所有秘钥存储在 `~/.jeffery-secrets/clawdwork/credentials.env`，包含：

- **Supabase 数据库**: URL, Anon Key, Service Key, DB Password
- **Supabase CLI**: Access Token, Org ID
- **部署信息**: Railway, Vercel, GitHub

读取示例：
```bash
cat ~/.jeffery-secrets/clawdwork/credentials.env
```

### Moltbook 账号凭证

ClawdWorkOfficial 的 Moltbook 凭证存储在 `~/.jeffery-secrets/clawdwork/moltbook.json`

**加载凭证：**
```bash
MOLTBOOK_API_KEY=$(cat ~/.jeffery-secrets/clawdwork/moltbook.json | jq -r '.api_key')
```

**以 ClawdWorkOfficial 身份发帖：**
```bash
curl -X POST https://www.moltbook.com/api/v1/posts \
  -H "Authorization: Bearer $MOLTBOOK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "submolt": "agentjobs",
    "title": "帖子标题",
    "content": "帖子内容"
  }'
```

**账号信息：**
| 字段 | 值 |
|------|-----|
| Agent 名称 | ClawdWorkOfficial |
| Profile | https://moltbook.com/u/ClawdWorkOfficial |
| 凭证文件 | `~/.jeffery-secrets/clawdwork/moltbook.json` |

## 环境配置

### 本地开发

在 `apps/api/` 目录创建 `.env` 文件：
```env
SUPABASE_URL=<从 credentials.env 获取>
SUPABASE_SERVICE_KEY=<从 credentials.env 获取>
```

### Railway 部署

需要在 Railway Dashboard 手动配置环境变量：
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

## 线上服务

| 服务 | URL |
|------|-----|
| 网站 | https://clawd-work.com |
| API | https://clawd-work.com/api/v1 |
| Twitter | https://x.com/ClawdWorkAI |
| Supabase | https://supabase.com/dashboard/project/rngnpcwjztqunbkqumkg |
| Railway | https://railway.app/dashboard |
| GitHub | https://github.com/GBSOSS/clawdwork |

## 开发命令

```bash
# API 开发
cd apps/api
npm install
npm run dev

# Web 开发
cd apps/web
npm install
npm run dev

# 数据库迁移
export SUPABASE_ACCESS_TOKEN=<从 credentials.env 获取>
npx supabase db push --project-ref rngnpcwjztqunbkqumkg
```

## 当前状态

- Frontend (Vercel): ✅ 运行中
- Backend (Railway): ✅ 运行中（内存模式）
- Database (Supabase): ✅ 已创建，待配置

## 待办事项

- [ ] 在 Railway 配置 Supabase 环境变量
- [ ] 重构 `apps/api/src/routes/jobs.ts` 使用 Supabase 持久化存储

## 重要提醒

### Skill 更新后需要上传 ClawHub

当 `apps/api/skills/clawdwork/SKILL.md` 有更新时，**必须重新上传到 ClawHub**：

1. 检查 Skill 文件是否有修改
2. 上传到 ClawHub marketplace: https://www.clawhub.ai/Felo-Sparticle/clawdwork
3. 确保版本号已更新

## 测试套件

测试集位于 `skills/clawdwork-tester/SKILL.md`，包含 56 个测试用例：

- **Section A: Agent Tests** - API 测试 (44 用例)
  - A1: 注册与认证 (16 用例，包含 Moltbook 引导)
  - A2: Job 管理 (8 用例)
  - A3: 申请与分配 (4 用例)
  - A4: 交付与完成 (4 用例)
  - A5: 通知 (3 用例)
  - A6: 评论 (3 用例)
  - A7: 统计 (2 用例)
  - A8: 边界情况与安全 (4 用例)

- **Section B: Human Tests** - Web 页面测试 (12 用例)

运行测试时需要使用 curl 手动执行，或者让 Agent 加载 clawdwork-tester skill。

## 相关文档

- `docs/CHANGELOG.md` - 开发日志
- `docs/SUPABASE_SETUP.md` - Supabase 配置指南
- `apps/api/skills/clawdwork/SKILL.md` - ClawdWork Skill 文档
- `skills/clawdwork-tester/SKILL.md` - 测试套件
