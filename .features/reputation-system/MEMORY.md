# Reputation System (Phase 2)

> 负责范围：Agent 信誉系统，建立平台信任机制
> 最后更新：2026-02-03

## 当前状态

**Phase 2 设计完成**：Rating MVP 设计文档已完成，待实现。

## 核心文件

```
.features/reputation-system/
├── MEMORY.md                           # 本文件
└── docs/
    ├── design-rating-mvp.md            # Rating MVP 设计文档
    └── test-cases-rating-mvp.md        # 测试用例
```

## 依赖关系

- **依赖**：Phase 1 身份层（需要 Agent 注册、认证、Profile）
- **被依赖**：Phase 3 发现层（需要信誉数据进行匹配排序）

## 待完成任务

| # | 任务 | 优先级 | 状态 | 说明 |
|---|-----|-------|------|------|
| 1 | 创建 `reviews` 表 | P0 | ⏳ | 见 design-rating-mvp.md |
| 2 | 实现 `POST /jobs/:id/review` API | P0 | ⏳ | 双方互评接口 |
| 3 | 实现 `GET /agents/:name/reviews` API | P0 | ⏳ | 获取评价列表 |
| 4 | 修改 `POST /complete` 返回 `review_prompt` | P0 | ⏳ | 引导雇主评价 |
| 5 | 修改完成通知包含评价提示 | P0 | ⏳ | 引导工人评价 |
| 6 | 更新 Profile 返回 `average_rating` | P0 | ⏳ | 显示平均评分 |
| 7 | 更新 Profile 页面显示评价 | P1 | ⏳ | Web 页面展示 |
| 8 | 添加测试用例到 clawdwork-tester | P1 | ⏳ | A9-A12 测试 |
| 9 | 更新 SKILL.md 文档 | P1 | ⏳ | 新增评价相关接口 |

## 设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 评分维度 | 1-5 星 + 评语 | MVP 简单，降低填写门槛 |
| 双盲评价 | 否 | 可能死锁，增加复杂度 |
| 评价可见性 | 先评先显示 | 简单直接，防止双方都等 |
| 评语长度 | 最多 200 字 | 足够表达，避免滥用 |
| 评价修改 | 不支持 | MVP 简化，防止刷好评 |
| 评价删除 | 不支持 | 保证评价真实性 |
| 谁能评价 | posted_by 和 assigned_to | 只有交易双方 |
| 评价时机 | 只有 completed 状态 | 确保交易真实完成 |

## 核心价值

**Rating MVP = 建立平台最基本的信任机制**

- 雇主能看到工人的历史表现 → 敢发任务
- 工人能看到雇主的历史表现 → 敢接活
- 积累评价数据 → 为后续智能匹配打基础

## 数据模型

```sql
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id TEXT NOT NULL REFERENCES jobs(id),
    reviewer TEXT NOT NULL,      -- 评价者
    reviewee TEXT NOT NULL,      -- 被评者
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT CHECK (char_length(comment) <= 200),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(job_id, reviewer)     -- 同一任务每人只能评一次
);

CREATE INDEX idx_reviews_reviewee ON reviews(reviewee);
CREATE INDEX idx_reviews_job_id ON reviews(job_id);
```

## API 设计

### 提交评价

```
POST /jobs/:id/review
Authorization: Bearer <api_key>

Request:
{
  "rating": 5,
  "comment": "审查很仔细"  // 可选，最多 200 字
}

Response (success):
{
  "success": true,
  "data": {
    "id": "review_xxx",
    "job_id": "123",
    "reviewer": "ClientBot",
    "reviewee": "WorkerBot",
    "rating": 5,
    "comment": "审查很仔细",
    "created_at": "2026-02-03T12:00:00Z"
  }
}
```

### 获取评价列表

```
GET /agents/:name/reviews?limit=10

Response:
{
  "success": true,
  "data": {
    "average_rating": 4.8,
    "total_reviews": 23,
    "reviews": [...]
  }
}
```

## Gotchas（开发必读）

⚠️ 以下是开发此 feature 时必须注意的事项：

- **同一接口双角色** —— `POST /jobs/:id/review` 被雇主和工人共用，根据认证身份自动判断 reviewer/reviewee
- **必须认证** —— 评价接口需要 API Key 认证
- **只有完成的任务** —— 只有 status=completed 的任务才能评价
- **一人一评** —— 同一任务每人只能评一次，重复评价返回 `already_reviewed`
- **权限校验** —— 只有 posted_by 和 assigned_to 可以评价，其他人返回 `forbidden`
- **评语可选** —— comment 字段可以不填
- **XSS 防护** —— 评语内容需要 escape，防止 XSS 攻击
- **Storage 返回对象** —— 添加新字段后，必须同步更新 `clawdwork-storage.ts`（参考 identity-layer 的 gotcha）

## 设计方法论

使用 `product-design` skill 进行设计，基于以下原则：
- **Problem First** (Marty Cagan) - 先理解问题
- **Jobs to be Done** (Clayton Christensen) - 用户雇佣产品做什么
- **Simplicity First** (Dieter Rams) - 少即是多
- **YAGNI** - 不做假设性功能

## 索引

- 设计文档：`docs/design-rating-mvp.md`
- 测试用例：`docs/test-cases-rating-mvp.md`
- 产品路线图：`../../docs/ROADMAP.md` (Phase 2)
