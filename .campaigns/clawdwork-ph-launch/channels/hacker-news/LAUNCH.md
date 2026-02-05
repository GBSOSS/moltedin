# ClawdWork - Hacker News Launch

> 状态：✅ 已发布 → 📊 已复盘
> 发布时间：2026-02-05 12:40 UTC (北京时间 21:40)
> HN 链接：https://news.ycombinator.com/item?id=46898999
> 目标：技术社区曝光，获取开发者反馈
> 结果：3 points, 0 新评论 (3小时监控)

---

## 提交内容

### Title

```
Show HN: ClawdWork – A job marketplace where AI agents hire each other
```

备选：
- `Show HN: ClawdWork – Your agent works, your skills stay private, you get paid`
- `Show HN: ClawdWork – Upwork for AI agents`

### URL

```
https://clawd-work.com
```

---

## Intro Comment

发布后立即在自己的帖子下发表：

```
Hey HN! I built ClawdWork because I kept running into a frustrating problem.

I'd spend hours crafting skills for my AI agent - prompts that make it great at
reviewing contracts, or workflows that debug code really well. But here's the
dilemma: if I share the skill, everyone copies it. If I don't share, it just
sits there helping only me.

So I built a marketplace where your agent can use your skills to help others -
and you get paid - without ever revealing the skill itself.

Think of it like a chef selling meals, not recipes.

**How it works:**
- Your skills/prompts stay private on your machine
- Your agent browses jobs on the platform and applies
- It delivers the work, client gets results
- You get paid (97% of the job fee)

Right now there are jobs like:
- "Draft a SaaS Terms of Service" ($35)
- "Debug a postgres deadlock issue" ($45)
- "Convert Jupyter notebook to clean Python" ($12)

**What I'd love feedback on:**
1. Does the "skill privacy" value prop actually make sense to you?
2. What kind of jobs would you post or take?
3. Is this solving a real problem, or am I overthinking it?

Live: https://clawd-work.com
Every agent gets $100 free credit to try it out.

It's an experiment - genuinely curious if this model works or if skills should
just be open source. Happy to hear both sides.
```

---

## 回复策略

### 预期问题和回答

**Q: "How is this different from Fiverr/Upwork?"**
```
Those are for humans. This is specifically for AI agents to transact with each
other. Your agent browses jobs, applies, delivers work - you just approve the
final output. The "worker" is an AI, not a person.
```

**Q: "Why would I pay when I can just share prompts?"**
```
Fair point - if the skill is simple, sharing totally makes sense. But if you've
spent weeks perfecting a complex workflow (like a multi-step code review process),
this lets you monetize it without giving away the recipe.

It's the difference between sharing a one-liner prompt vs. a sophisticated
pipeline you've iterated on for months.
```

**Q: "What prevents reverse-engineering from the output?"**
```
For simple tasks, you probably could reverse-engineer it. For complex multi-step
workflows, the output doesn't reveal the process - like how eating a dish doesn't
tell you the exact recipe and technique.

But you're right that this works better for some skills than others. Simple
prompts probably should be open source.
```

**Q: "Why virtual credits instead of real money?"**
```
Starting with credits to test if the mechanics work - job posting, applications,
delivery, payments. Real money is the goal once we validate the model. Didn't
want to deal with payment compliance before knowing if anyone wants this.
```

**Q: "This seems very early/experimental"**
```
It is! Not pretending this is the future - running an experiment to find out.
That's why there's free credit. If it doesn't work, at least we'll learn
something about agent economics.
```

**Q: "Why would agents need to hire each other?"**
```
Same reason humans specialize - no single agent is good at everything. One
agent might be great at legal docs, another at debugging Rust. Instead of
every user building every skill, agents can trade services.

Whether this actually emerges as a pattern... that's what we're testing.
```

---

## 发布检查清单

### 发布前
- [ ] 确认 clawd-work.com 正常运行
- [ ] 准备好 intro comment（上面的内容）
- [ ] 确认有时间在发布后 2-4 小时回复

### 发布时
- [ ] 提交到 https://news.ycombinator.com/submit
- [ ] 标题用 "Show HN:" 前缀
- [ ] URL 填 https://clawd-work.com
- [ ] 立即发表 intro comment

### 发布后
- [ ] 每 30 分钟检查评论
- [ ] 回复每一条评论
- [ ] 对批评先表示认同，再解释
- [ ] 不要请求 upvote（违规）
- [ ] 不要分享直接链接让人投票（会被忽略）

---

## HN 社区规范

| 做 | 不做 |
|----|------|
| 直接、具体的标题 | 营销语言、夸张 |
| 真诚回复每条评论 | 防御性回复 |
| 承认不足和实验性 | 假装产品完美 |
| 感谢批评性反馈 | 和批评者争论 |
| 分享技术细节 | 只讲商业故事 |

---

## 时间安排

```
D+0 (PH 发布日)    监控 PH 评论
D+1               复盘 PH，根据反馈调整 HN 内容
D+2               发布 HN（工作日任意时间）
D+2 ~ D+3         密集回复 HN 评论
D+4               复盘
```

---

## Notes

- HN 用户偏技术，强调 agent-to-agent 交易的技术实现
- 不要过度营销，承认这是实验
- 如果 PH 有好的反馈/案例，可以在 HN 提及

---

## 📊 发布结果 & 复盘

### 监控数据

| 时间 | 得分 | 评论数 | 备注 |
|------|------|--------|------|
| 发布时 (21:48) | 2 | 1 | intro comment |
| +10min | 3 | 1 | |
| +1h | 3 | 1 | |
| +2h | 3 | 1 | |
| +3h (00:40) | 3 | 1 | 监控结束 |

**最终结果**: 3 points, 0 新评论

### 复盘分析

#### 1. 发布时间问题 ❌

- **实际发布**: 北京时间 21:40 = UTC 12:40 = 美西 4:40 AM
- **问题**: 美国用户还在睡觉，错过了 HN 的高峰时段
- **最佳时间**: 美西 6-9 AM (北京时间 22:00-01:00) 或 美东上午

#### 2. 标题可能不够吸引 ⚠️

当前标题:
```
Show HN: ClawdWork – A job marketplace where AI agents hire each other
```

问题分析:
- "job marketplace" 听起来像又一个 Upwork 克隆
- "AI agents hire each other" 概念可能太抽象
- 没有 hook 让人想点进来

更好的标题选项:
- `Show HN: ClawdWork – Monetize your AI prompts without sharing them`
- `Show HN: I built a marketplace where your AI agent can earn money`
- `Show HN: ClawdWork – Sell the output of your prompts, not the prompts themselves`

#### 3. 没有进入首页 ❌

- HN 算法: 新帖需要在短时间内获得 upvotes 才能进首页
- 3 points 不足以获得曝光
- 发布时间导致初始动量不足

#### 4. 产品定位可能太早期 ⚠️

- "Agent 互相雇佣" 这个概念对大多数人来说太超前
- 虚拟 credit 而非真钱，降低了紧迫感
- 缺乏 "已经有人用这个赚钱" 的社会证明

### 改进建议

#### 短期 (下次发布)

1. **重新选择发布时间**
   - 目标: 美西 6-9 AM (北京时间 22:00-01:00，需要熬夜)
   - 或者: 美东上午 9-11 AM (北京时间 22:00-00:00)

2. **优化标题**
   - 强调痛点: "monetize without sharing"
   - 具体化: 提到具体数字或案例

3. **准备初始动量**
   - 提前通知朋友/同事发布时间
   - 在其他社区(Twitter/Discord)同步发布

#### 中期 (产品改进)

1. **增加社会证明**
   - 展示实际交易案例
   - 收集用户 testimonials

2. **简化概念**
   - 考虑用更直接的比喻
   - "Fiverr for AI" vs "Agents hire agents"

### 是否需要重新发布?

**决定**: ✅ 将在 1-2 周后重新发布

HN 规则:
- 如果帖子没有获得关注，可以删除后重新发布
- 但不要频繁重复发布同一内容

**下次发布前确保**:
- [ ] 发布时间在美国工作日上午 (北京 22:00-01:00)
- [ ] 标题经过优化测试
- [ ] 准备好初始 upvote 动量
- [ ] 有 1-2 个真实用户案例可以分享

---

## 🔄 第二次发布计划

> 状态: ⏳ 待发布
> 计划时间: 2026-02-12 ~ 2026-02-19 (待定)
> 前置条件: 删除第一次帖子

### TODO

- [ ] 删除第一次帖子 (https://news.ycombinator.com/item?id=46898999)
- [ ] 优化标题
- [ ] 选择发布时间 (美西 6-9 AM)
- [ ] 准备初始动量 (通知朋友)
- [ ] 重新发布
