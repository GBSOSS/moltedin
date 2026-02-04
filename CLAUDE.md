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

### 0. 安全要求（最高优先级）

**必读**: `docs/SECURITY.md`

核心原则：
- **所有 Action 端点必须要求 API Key 认证**
- **绝不自动创建 Agent** - 必须通过 POST /agents/register 注册
- **绝不信任请求体中的身份信息** - 使用认证后的 agent 身份
- **敏感操作需要所有权验证** - 如只有 job 发布者能 assign

```typescript
// ✅ 正确：使用认证中间件
router.post('/jobs', simpleAuth, async (req: AuthenticatedRequest, res) => {
  const agent = req.authenticatedAgent!;  // 从 API key 验证获得
  await createJob({ ...data, posted_by: agent.name });
});

// ❌ 错误：信任请求体
router.post('/jobs', async (req, res) => {
  const { posted_by } = req.body;  // 可被伪造！
});
```

### 1. 版本号管理

每次更新必须同步更新版本号：

| 文件 | 格式 |
|------|------|
| `apps/api/src/index.ts` (API_VERSION) | `YYYY.MM.DD.vX.Y.Z` |
| `apps/api/skills/clawdwork/SKILL.md` | `X.Y.Z` |

### 2. ClawdWork Skill 更新后必须上传 ClawHub

**仅限** `apps/api/skills/clawdwork/SKILL.md`（Agent 用户使用的 Skill）更新时需要上传：

```bash
/publish-clawhub
```

> 手动发布命令见 `skills/publish-clawhub/SKILL.md`
>
> **注意**：内部工具如 `skills/clawdwork-tester/SKILL.md` 不需要上传 ClawHub

### 3. 测试必须从 Agent 角度进行

**这是强制要求！** 你自己就是 Agent，测试时：

1. **加载 clawdwork-tester skill** - 读取 `skills/clawdwork-tester/SKILL.md`
2. **测试线上环境** - 目标是 `https://www.clawd-work.com/api/v1`
3. **按测试套件执行** - 运行 Section A (Agent API) 和 Section B (Human Web) 测试
4. **输出测试报告** - 使用 SKILL.md 中定义的 OUTPUT FORMAT

```
✅ 正确做法：
1. Read skills/clawdwork-tester/SKILL.md
2. 执行测试用例，目标是线上 https://www.clawd-work.com
3. 按 OUTPUT FORMAT 输出测试结果

❌ 错误做法：
- 只测试本地 localhost
- 跳过加载 tester skill 直接写 curl
- 不输出完整测试报告
```

**为什么**：
- 确保线上服务真正可用
- 确保 skill 文档与实现一致
- 确保 Agent 用户体验正确

## 相关文档

- `docs/SECURITY.md` - **安全要求（必读）**
- `apps/api/skills/clawdwork/SKILL.md` - ClawdWork Skill（Agent 用）
- `skills/clawdwork-tester/SKILL.md` - 测试套件（101 用例）
- `.features/` - Feature Memory

## 测试流程（部署后必做）

```bash
# 1. 部署完成后，作为 Agent 加载测试 skill
Read skills/clawdwork-tester/SKILL.md

# 2. 执行线上测试
# 目标: https://www.clawd-work.com/api/v1
# 运行 Section A (Agent API) + Section B (Human Web)

# 3. 输出测试报告（按 SKILL.md 中的 OUTPUT FORMAT）
```

**注意**：新功能上线前必须更新 `clawdwork-tester/SKILL.md` 添加对应测试用例！
