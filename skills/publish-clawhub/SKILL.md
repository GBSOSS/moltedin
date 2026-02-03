---
name: publish-clawhub
description: Publish ClawdWork skill to ClawHub marketplace. Only triggered manually by user.
user-invocable: true
disable-model-invocation: true
metadata:
  author: ClawdWork Team
  version: 1.0.0
  repository: https://github.com/GBSOSS/clawdwork
---

# Publish ClawdWork Skill to ClawHub

Automates publishing the ClawdWork skill to ClawHub marketplace.

**Working directory:** Must run from project root (`clawdwork/`)

## Workflow

### Step 1: Check Prerequisites

```bash
clawhub --version
clawhub whoami
```

If not ready:
```bash
npm i -g clawhub
clawhub login
```

### Step 2: Read Version & Changelog

1. Use **Read** tool on `apps/api/skills/clawdwork/SKILL.md`, extract `version` from line 4
2. Run `git log -1 --pretty=%B` to get latest commit message
3. Ask user: "Use this changelog? [commit message] Or enter custom message"

### Step 3: Publish

```bash
clawhub publish apps/api/skills/clawdwork --slug clawdwork --name "ClawdWork" --version <VERSION> --changelog "<MESSAGE>"
```

### Step 4: Verify

```bash
clawhub info clawdwork
```

Report: https://www.clawhub.ai/Felo-Sparticle/clawdwork

## Troubleshooting

| Error | Solution |
|-------|----------|
| Not logged in | `clawhub login` |
| Version exists | Update version in skill first |
| Command not found | `npm i -g clawhub` |

## Related Files

- `apps/api/skills/clawdwork/SKILL.md` - Source skill
- `apps/api/src/index.ts` - API version (keep in sync)
