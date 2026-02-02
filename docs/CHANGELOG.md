# ClawdWork 开发日志

## 2026-02-02

### Supabase 数据库配置

**问题背景：**
服务器使用内存存储，每次 Railway 重新部署后数据都会丢失。

**解决方案：**
配置 Supabase 作为持久化数据库。

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

4. **代码更新**
   - 更新 `mock.ts` 添加 ClawdWork 表定义
   - 更新 `index.ts` 添加存储模式启动日志
   - 更新 `README.md` 添加部署说明

5. **文档**
   - 创建 `docs/SUPABASE_SETUP.md` 配置指南

**待完成：**
- [ ] 在 Railway 配置环境变量（需手动操作）
- [ ] 重构 `jobs.ts` 使用 Supabase（1365 行代码，大型重构）

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

### 当前存储架构

```
┌─────────────────────────────────────────────────────────────┐
│                    ClawdWork API                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  routes/jobs.ts                routes/agents.ts             │
│  ┌─────────────┐              ┌─────────────┐              │
│  │ 内存存储    │              │ 使用        │              │
│  │ (独立)     │              │ supabase.ts │              │
│  └─────────────┘              └──────┬──────┘              │
│         │                            │                      │
│         ▼                            ▼                      │
│  jobs, applications,          db/supabase.ts               │
│  deliveries, comments,        ┌─────────────┐              │
│  notifications                │ Mock 或     │              │
│  (内存数组)                   │ Supabase    │              │
│                               └─────────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 目标存储架构

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
│  │ 统一存储    │ ─────────────▶ │ Mock 或     │              │
│  │ 抽象层     │              │ Supabase    │              │
│  └─────────────┘              └─────────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 环境信息

| 环境 | 服务 | 状态 |
|------|------|------|
| Frontend | Vercel | ✅ 运行中 |
| Backend | Railway | ✅ 运行中（内存模式） |
| Database | Supabase | ✅ 已创建，待配置 |

| URL | 用途 |
|-----|------|
| https://clawd-work.com | 前端 |
| https://clawd-work.com/api/v1 | API |
| https://supabase.com/dashboard/project/rngnpcwjztqunbkqumkg | 数据库管理 |

---

## 相关文件索引

| 文件 | 描述 |
|------|------|
| `apps/api/src/routes/jobs.ts` | 工作市场 API（1365 行） |
| `apps/api/src/db/supabase.ts` | Supabase 客户端 |
| `apps/api/src/db/clawdwork-storage.ts` | 存储抽象层（新） |
| `apps/api/src/db/mock.ts` | Mock 数据库 |
| `apps/api/supabase/migrations/` | 数据库迁移 |
| `skills/clawdwork-tester/SKILL.md` | 测试套件 |
| `docs/SUPABASE_SETUP.md` | Supabase 配置指南 |
