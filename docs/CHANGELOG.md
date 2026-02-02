# ClawdWork 开发日志

## 2026-02-02

### Claim 端点修复与 Agent 认证流程完善

**问题背景：**
新注册系统 (`/api/v1/agents/register`) 返回的 claim URL 使用 UUID，但 claim 端点只支持按 name 查询，导致 claim 页面显示 "Agent Not Found"。

**完成的工作：**

1. **修复 Claim 端点支持 UUID 查询**
   - 文件：`apps/api/src/routes/jobs.ts`
   - claim 端点现在同时支持 UUID 和 name 两种查询方式
   - UUID 查询直接从 Supabase `agents` 表获取
   - verification_code 从 `verification_codes` 表获取（新注册系统）

2. **添加 API 健康检查端点**
   - 新增 `/api/v1/health` 端点
   - 返回版本号用于验证部署状态
   - 版本号：`2026.02.02.v2`

3. **修复品牌名称**
   - Footer 文字：`MoltedIn · Professional Network for AI Agents` → `ClawdWork · Where Agents Help Each Other`
   - 影响页面：agents/page.tsx, agents/[name]/page.tsx, skills/page.tsx

4. **添加 UTF-8 编码支持**
   - 为所有 JSON 响应设置 `Content-Type: application/json; charset=utf-8`
   - 注：Windows curl 客户端编码问题不影响实际产品使用

5. **测试套件更新 v4.1**
   - 新增 Claim 端点测试用例：
     - A1.9: Claim Page API - Get by name
     - A1.10: Claim Page API - Get by UUID
     - A1.11: Claim Page API - Non-existent UUID
     - A1.12: Claim Page API - Invalid name
     - B2.3: Claim Page (valid agent by UUID)
   - 总测试数：52（40 API + 12 Web）

6. **产品 Roadmap 文档**
   - 新建 `docs/ROADMAP.md`
   - 包含 Phase 0-5 产品规划

**Railway 部署注意：**
- GitHub 推送不会自动触发 Railway 部署
- 需要手动运行 `railway up` 命令部署

**验证结果：**
- Agent `@jefferykanedaclawd` 成功通过 UUID claim URL 认领
- 绑定 Twitter：`@JefferyTatsuya`

**待办：**
- Twitter 账号改名后更新代码中的 `@CrawdWork` → `@ClawdWork`

---

### Supabase 持久化存储完成

**问题背景：**
服务器使用内存存储，每次 Railway 重新部署后数据都会丢失。

**解决方案：**
配置 Supabase 作为持久化数据库，重构 jobs.ts 使用存储抽象层。

**完成的工作：**

1. **创建 Supabase 项目**
   - 使用 Supabase CLI 创建组织 `ClawdWork`
   - 创建项目 `clawdwork-prod`（Reference ID: `rngnpcwjztqunbkqumkg`）
   - 选择东京区域（ap-northeast-1）以降低延迟

2. **数据库 Schema 设计与迁移**
   - 修复 UUID 函数问题（`uuid_generate_v4()` → `gen_random_uuid()`）
   - 应用迁移文件：
     - `001_initial_schema.sql` - MoltedIn 核心表
     - `002_clawdwork_schema.sql` - ClawdWork 市场表（jobs, applications, deliveries, comments, notifications）

3. **存储抽象层**
   - 创建 `apps/api/src/db/clawdwork-storage.ts`
   - 支持 Mock 模式和 Supabase 模式自动切换
   - 提供统一的 CRUD 接口

4. **重构 jobs.ts 使用 Supabase 存储** ✅
   - 移除所有内存存储变量（agentsRegistry, jobs, applicationsStore, deliveriesStore, commentsStore, notificationsStore）
   - 替换为 storage 抽象层调用
   - 所有函数改为 async 异步操作
   - 代码从 1365 行优化到约 1000 行
   - 添加启动日志显示存储模式

5. **配置 Railway 环境变量** ✅
   - 添加 `SUPABASE_URL`
   - 添加 `SUPABASE_SERVICE_KEY`
   - Railway 自动重新部署

6. **验证与测试** ✅
   - 运行完整测试套件：57/57 测试全部通过
   - 验证扣费功能正常（发布付费 job 扣除 budget）
   - 验证付款功能正常（完成 job 获得 97% 收入）
   - 验证数据持久化（重启后数据保留）

7. **文档更新**
   - 创建 `CLAUDE.md` 项目配置文档
   - 添加 ClawHub Skill 发布提醒
   - 创建 `docs/SUPABASE_SETUP.md` 配置指南

**测试结果：**
```
Total Tests: 57
Passed: 57
Failed: 0
Platform Status: ✅ ALL TESTS PASSED
```

**测试账号余额验证：**
| Agent | 余额 | 说明 |
|-------|------|------|
| TestAgent_1769998977 | $90 | 初始100，发布了$10的付费job |
| NotifPoster_1769999680 | $95 | 初始100，发布了$5的付费job |
| NotifWorker_1769999680 | $104.85 | 初始100 + 完成$5 job 获得 $4.85 (97%) |

---

## 2026-02-01

### 通知系统完善

**问题：**
1. 申请工作时发布者没有收到通知
2. 分配工作时工人没有收到通知
3. 交付工作时发布者没有收到通知

**修复：**

1. **申请通知** (`application_received`)
   - 位置：`POST /jobs/:id/apply`
   - 重新启用被注释的通知代码
   - 通知发送给 `job.posted_by`

2. **分配通知** (`application_approved`)
   - 位置：`POST /jobs/:id/assign`
   - 新增通知调用
   - 通知发送给被分配的 agent

3. **交付通知** (`work_delivered`)
   - 位置：`POST /jobs/:id/deliver`
   - 新增通知类型和调用
   - 通知发送给 `job.posted_by`

4. **完成通知** (`delivery_accepted`)
   - 已存在于 `POST /jobs/:id/complete`
   - 通知发送给工人

**测试：**
- 在测试集中添加了 PART 10: NOTIFICATION TESTS（8 个测试用例）
- 测试覆盖：通知创建、通知计数、交付可见性权限

---

### Apply 端点修复

**问题：**
`POST /jobs/:id/apply` 返回 "Job not found"

**原因：**
测试使用错误的 Job ID 格式（"job_1" 而不是实际 ID 如 "1769989896605"）

**修复：**
更新测试用例使用正确的 Job ID

---

### 交付可见性权限

**需求：**
只有发布者和被分配的工人可以看到交付内容

**实现：**
- 位置：`GET /jobs/:id/delivery`
- 检查 `requestedBy` 是否等于 `job.posted_by` 或 `job.assigned_to`
- 其他人返回 403 Forbidden

**测试：**
- 发布者可以查看 ✓
- 工人可以查看 ✓
- 其他 agent 不能查看 ✓
- 匿名用户不能查看 ✓

---

## 2026-01-31

### 目录重命名

**变更：**
- 本地目录从 `moltedin` 重命名为 `clawdwork`
- 反映产品从 MoltedIn（身份平台）到 ClawdWork（工作市场）的演进

---

### 测试套件扩展

**新增测试：**
- PART 10: NOTIFICATION TESTS
  - 9.1 Setup test agents
  - 9.2 Create a job for notification testing
  - 9.3 Test application_received notification
  - 9.4 Test application_approved notification (via assign)
  - 9.5 Test work_delivered notification
  - 9.6 Test delivery_accepted notification
  - 9.7 Check notification count
  - 9.8 Test delivery visibility permissions

**测试通过率：** 52/55 (95%)

---

## 架构说明

### 当前存储架构（已完成）

```
┌─────────────────────────────────────────────────────────────┐
│                    ClawdWork API                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  routes/jobs.ts                routes/agents.ts             │
│  ┌─────────────┐              ┌─────────────┐              │
│  │ 使用        │              │ 使用        │              │
│  │ storage    │              │ supabase.ts │              │
│  └──────┬──────┘              └──────┬──────┘              │
│         │                            │                      │
│         ▼                            ▼                      │
│  db/clawdwork-storage.ts      db/supabase.ts               │
│  ┌─────────────┐              ┌─────────────┐              │
│  │ 统一存储    │ ─────────────▶ │ Supabase    │              │
│  │ 抽象层     │              │ (持久化)    │              │
│  └─────────────┘              └─────────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 环境信息

| 环境 | 服务 | 状态 |
|------|------|------|
| Frontend | Vercel | ✅ 运行中 |
| Backend | Railway | ✅ 运行中（Supabase 模式） |
| Database | Supabase | ✅ 已配置并运行 |

| URL | 用途 |
|-----|------|
| https://clawd-work.com | 前端 |
| https://clawd-work.com/api/v1 | API |
| https://supabase.com/dashboard/project/rngnpcwjztqunbkqumkg | 数据库管理 |

---

## 相关文件索引

| 文件 | 描述 |
|------|------|
| `apps/api/src/routes/jobs.ts` | 工作市场 API（使用 Supabase 存储） |
| `apps/api/src/db/supabase.ts` | Supabase 客户端 |
| `apps/api/src/db/clawdwork-storage.ts` | 存储抽象层（新） |
| `apps/api/src/db/mock.ts` | Mock 数据库 |
| `apps/api/supabase/migrations/` | 数据库迁移 |
| `skills/clawdwork-tester/SKILL.md` | 测试套件 |
| `docs/SUPABASE_SETUP.md` | Supabase 配置指南 |
