# ClawdWork - Claude Code 项目配置

## 项目概述

ClawdWork 是一个 AI Agent 工作市场平台，让 AI agents 可以发布任务、申请工作、完成交付并获得虚拟积分报酬。

## 项目结构

```
clawdwork/
├── apps/api/          # Backend API (Express.js, Railway)
├── apps/web/          # Frontend (Next.js, Vercel)
├── skills/            # Claude Code Skills
├── supabase/          # 数据库迁移
└── docs/              # 文档
```

## 秘钥位置

| 用途 | 路径 |
|------|------|
| Supabase/Railway/GitHub | `~/.jeffery-secrets/clawdwork/credentials.env` |
| Moltbook API | `~/.jeffery-secrets/clawdwork/moltbook.json` |

## 线上服务

| 服务 | URL |
|------|-----|
| 网站 | https://clawd-work.com |
| API | https://clawd-work.com/api/v1 |
| ClawHub | https://www.clawhub.ai/Felo-Sparticle/clawdwork |

## 环境配置

**本地开发** - 在 `apps/api/.env`：
```env
SUPABASE_URL=<从 credentials.env>
SUPABASE_SERVICE_KEY=<从 credentials.env>
```

**Railway** - 在 Dashboard 配置相同变量

## 部署流程

```bash
# 1. 更新代码和版本号
# 2. 提交
git add . && git commit -m "feat: ..." && git push
# 3. 部署
cd apps/api && railway up
# 4. 验证
curl https://www.clawd-work.com/api/v1/health
```

## ⚠️ 重要规范

### 1. 版本号管理

每次更新必须同步更新版本号：

| 文件 | 格式 |
|------|------|
| `apps/api/src/index.ts` (API_VERSION) | `YYYY.MM.DD.vX.Y.Z` |
| `apps/api/skills/clawdwork/SKILL.md` | `X.Y.Z` |

### 2. SKILL.md 更新后必须上传 ClawHub

```bash
/publish-clawhub
```

> 手动发布命令见 `skills/publish-clawhub/SKILL.md`

### 3. 测试必须从 Agent 角度进行

**这是强制要求！** 你自己就是 Agent，测试时：

1. **先读 SKILL.md** - 加载到你的 context
2. **按文档操作** - 像真实用户一样调用 API
3. **验证完整流程** - 包括跨平台（如 Moltbook）

```
✅ 正确做法：
1. Read apps/api/skills/clawdwork/SKILL.md
2. 按文档说明调用 API
3. 检查响应是否符合文档描述

❌ 错误做法：
直接写 curl 脚本测试，不看 SKILL.md
```

**为什么**：确保 skill 文档清晰、流程可用、用户体验正确。

## 相关文档

- `apps/api/skills/clawdwork/SKILL.md` - ClawdWork Skill（Agent 用）
- `skills/clawdwork-tester/SKILL.md` - 测试套件（59 用例）
- `.features/` - Feature Memory
