# HANDOFF 评审清单 — 待补充

> 生成日期：2026-09-18
>
> 评审对象：`docs/HANDOFF.md`（以及其引用的相关 docs / scripts）
>
> 目的：把接手文档里「写不清 / 对不上 / 按文档做不下去」的点列出来，方便同事直接补文档或补脚本。
>
> 使用方式：逐条勾选；补完后可在本文件底部「已处理」区记一笔，或直接删除对应条目。

---

## 0. 结论（给补充者）

`HANDOFF.md` 作为架构接手文档整体可用：不变量、审批红线、License、临时测试数据都清楚。

真正缺的是 **「下一步 Preview 样本迁移」的可执行桥梁**。同事若只靠 §16 开工，会在「小样本导出」和「Preview Worker 怎么配」两处卡住。

优先补：**§16 可执行 checklist**、**小样本导出怎么做**、**Preview 部署入口**。其余多为一致性与踩坑说明。

---

## 1. 阻塞级 — 按文档做不下去

### 1.1 「小样本导出」没有实现入口

**HANDOFF 原文（§16）要求：**

- 只导出 Drift Boss / Drive Mad / Eggy Car
- 加上 Drift Boss 中文 locale fixture
- 只要 Preview 所需的最小 categories / site settings

**现状：**

- `scripts/export-driftboss-v2-sql.ts` 仅支持：
  - `--domain=...`
  - `--featured=...`
- **没有** `--games=` / `--sample=` 一类过滤
- cutover audit 才有 `--game=`，那是验收参数，不是导出过滤

**需要补充者决定并写清其一：**

| 方案                                                           | 文档要写什么                                                          | 可能还要改代码 |
| -------------------------------------------------------------- | --------------------------------------------------------------------- | -------------- |
| A. 给导出脚本加 `--games=drift-boss,drive-mad,eggy-car`        | HANDOFF §16 给出完整命令                                              | 是             |
| B. 暂不改脚本：先整站 domain 导出，Preview 只人工验这 3 个游戏 | 删除「deliberately small sample」措辞，改成「domain 全量 + 人工抽检」 | 否             |
| C. 导出后手工裁剪 SQL                                          | 写明裁剪规则与风险（外键 / extras 依赖）                              | 否             |

**建议：** 选 A 或 B，并在 HANDOFF §16 写死推荐命令，不要只写自然语言目标。

---

### 1.2 `--domain` 仍会全量导入全局 catalog

**现状（脚本行为）：**

- `--domain=driftbossgame.org` 只限制 `site_game` / 站点侧挂载
- `game_catalog` / `game_category` 仍会导入 legacy 里全部 ~3.9k games（及全部 categories）

**文档缺口：**

- HANDOFF 把「小样本」说得像只有 3 个游戏进库
- 实际 Preview D1 可能仍有完整全局 catalog（只是多数未挂到本站）

**需要补充：**

1. 在 HANDOFF 或 migration runbook 明确写：domain 过滤 ≠ catalog 过滤。
2. 若 Preview 也要「库里只有这几个 game」，必须再加 catalog 过滤（与 1.1 同一批脚本改动）。

---

### 1.3 Preview 部署路径过虚

**HANDOFF §16 写了：**

> Create/use a Preview D1 database … Deploy a Preview Worker …

**但未点名现有入口：**

- `scripts/configure-game-site-worker.ts`
- `.claude/skills/deploy-game-site/SKILL.md`
- `wrangler.example.jsonc` → 本地 gitignored `wrangler.jsonc`

**策略冲突（需对齐）：**

| 来源                     | 说法                                           |
| ------------------------ | ---------------------------------------------- |
| HANDOFF §16              | Create/use a **Preview D1**                    |
| `deploy-game-site` skill | 倾向 **复用共享 Game Engine D1**，不要每站新建 |

**需要补充者写清：**

1. Preview 用独立 D1，还是共享 D1 + `DEPLOY_ENV=preview`？
2. 推荐命令顺序（configure → migrations apply → import → deploy）。
3. 链到 skill / script，避免下一位从零猜 Cloudflare 流程。

---

### 1.4 §16 推荐序列漏掉强制步骤

其他 runbook（尤其 `docs/driftboss-v2-migration-runbook.md`）已强调、但 HANDOFF §16 未列入：

| 缺失项                                                        | 为什么重要                                    | 参考                                  |
| ------------------------------------------------------------- | --------------------------------------------- | ------------------------------------- |
| `LEGACY_DATABASE_URL`                                         | 导出脚本硬依赖                                | export / audit scripts                |
| `pnpm game:migrate:driftboss:reset-stats`                     | legacy 全局 view 不能当站点计数；§12 只讲原则 | driftboss-v2-migration-runbook §6     |
| `pnpm game:migrate:apply` 或 wrangler `d1 execute` 的具体用法 | 「Import the sample」太抽象                   | driftboss-migration.md / runbook      |
| fresh D1 后的 `rbac:init` + 管理员账号                        | 否则无法用 Admin 验内容                       | package.json `rbac:init`              |
| Worker secrets（`AUTH_SECRET` 等）                            | Preview 也要能跑 auth/admin                   | deploy-game-site skill / .env.example |

**建议：** 把 §16 改成可复制 checklist（见文末模板）。

---

## 2. 一致性 — 文档之间互相打架

### 2.1 生成 SQL 文件名不统一

不同文档出现：

- `data/migrations/driftboss-v2.sql`
- `data/migrations/driftbossgame-v2.sql`
- extras / reset-stats 同理

**需要：** 选定一套命名（建议与 package script 默认 `--out` 一致：`driftboss-v2*.sql`），全局改齐。

涉及文件至少包括：

- `docs/HANDOFF.md`
- `docs/driftboss-migration.md`
- `docs/driftboss-v2-migration-runbook.md`
- `docs/game-site-engine-v2-runbook.md`

---

### 2.2 命令写法不统一

同一件事有两种写法：

```bash
pnpm game:migrate:driftboss:extras -- --domain=... --out=...
```

```bash
pnpm tsx scripts/export-driftboss-v2-extras-sql.ts --domain=... --out=...
```

**需要：** HANDOFF 与 runbook 统一优先用 `package.json` scripts；`tsx scripts/...` 仅作实现说明。

---

### 2.3 表名 / 章节标题易误导

| 文档                        | 问题                                                 |
| --------------------------- | ---------------------------------------------------- |
| HANDOFF                     | 用 `game_catalog` / `game_site`（正确）              |
| `game-site-engine-v2.md` §5 | 小节标题有时写成 `games` / `sites`，与真实表名不一致 |

**需要：** 设计文档小节标题改为真实表名，或明确「逻辑名 → 物理表名」对照表。

---

### 2.4 HANDOFF §11 命令列表不完整

已有 scripts，但接手入口未列清：

- `pnpm game:audit:cutover` 的典型参数示例（见 driftboss runbook §11）
- `pnpm tsx scripts/configure-game-site-worker.ts ...`（或未来若加 package script）
- CI 相关：Game Site Engine Smoke / Migrations / Legacy Migration Smoke（让接手者知道「绿了再迁」）

---

## 3. 内容缺口 — 不补也能做，但容易踩坑

### 3.1 URL 变更 / 永久重定向

多处要求：

> 改了 URL 必须先做 permanent redirect 再 cutover

**缺口：** 仓库内没有 Game Site 级别的 redirect 表 / 路由 / 配置说明。

**需要补充其一：**

- 说明「V1 不做 redirect 表，cutover 前禁止改 slug」；或
- 写明临时方案（Cloudflare Redirect Rules / `_redirects` / 自建表）及责任边界。

---

### 3.2 Legacy → V2 富文本字段映射

导出脚本主要映射：

- `seo_content` → `site_game_locale.content`

V2 还有（admin / schema 已支持）：

- `how_to_play`
- `controls`
- `features`
- `faq`
- 等

**需要补充：** 这些字段在首迁中是「故意留空、上线后后台补」，还是另有 legacy 来源。避免接手者以为迁移丢内容。

---

### 3.3 Preview 最小环境变量未在 HANDOFF 收口

散落在 `.env.example` / runbook / skill，HANDOFF 未集中：

```env
SITE_KEY=driftbossgame
DEPLOY_ENV=preview          # 非 production → robots Disallow: /
VITE_APP_URL=https://...    # Worker 对外 URL；canonical 仍看 game_site.domain
VITE_APP_NAME=...
DATABASE_PROVIDER=d1
AUTH_SECRET=...
```

**特别要写清：**

- `VITE_APP_URL`（Preview hostname）与 `game_site.domain`（生产 canonical）可以不一致
- Preview 验收时 cutover audit 用 `--base=preview` + `--canonical=https://driftbossgame.org` + `--expect-indexable=false`

---

### 3.4 根布局 hreflang 与站点 SEO 不变量的张力

**不变量（HANDOFF §18 / §6）：** hreflang 只暴露真实 published locale。

**现状风险：** `src/routes/__root.tsx` 仍按 Paraglide `locales`（当前 `en`/`zh`）为 homepage 生成 alternate。

**需要补充：** 标成 known issue，或写明「根布局全局 alternate 与页面级 hreflang 的分工 / 后续修复优先级」。

---

### 3.5 Admin 文案未 i18n

Game Engine 导航大量硬编码英文（Sites / Game Catalog / Site Games…）。

**需要补充：** 已知欠账即可，避免接手者当成回归去「修一整遍翻译」。

---

### 3.6 Site settings 消费程度

`docs/game-site-settings.md` 写 navigation / game_player「V1 stores and validates」，公共 UI 已部分消费。

**需要补充：** 一张「已接线 / 仅存储」表，避免接手者重复实现或误删校验。

---

## 4. 已写得好、不必重写的部分

补充文档时请保留，不要冲掉：

- §2–5 产品模型与 D1-first 策略
- §7 读无副作用 / 计数显式 POST
- §8 Admin 硬化与 upload 防 SSRF
- §12–14 Legacy 统计重置、测试 fixture、RLS 债务
- §15 License / 仓库公开风险
- §17 审批红线
- §18 架构不变量
- §19 cutover Definition of Ready

---

## 5. 建议的 HANDOFF §16 替换骨架（可直接粘贴后填命令）

把下面填完整后，替换现有 §16 叙述性列表：

```markdown
## 16. Immediate next task

Goal: migrate a DriftBoss preview dataset into V2 D1 and deploy a
non-indexed Preview Worker for owner visual inspection.

### 16.1 Prerequisites

- [ ] Cloudflare account + `wrangler` login
- [ ] `LEGACY_DATABASE_URL` (read-only) in shell, never commit
- [ ] Decide Preview D1 strategy: shared vs dedicated (see …)
- [ ] Branch: work from `main`

### 16.2 Export

- [ ] `pnpm game:migrate:driftboss:audit -- --domain=driftbossgame.org`
- [ ] Export command: `…` <!-- TODO: 小样本策略确定后写死 -->
- [ ] Extras: `pnpm game:migrate:driftboss:extras -- …`
- [ ] Stats reset: `pnpm game:migrate:driftboss:reset-stats -- …`
- [ ] Review generated SQL under `data/migrations/` (gitignored)

### 16.3 Preview database + import

- [ ] Apply schema: `npx wrangler d1 migrations apply <db> --remote`
- [ ] Import order: core SQL → extras SQL → reset-stats SQL
- [ ] `pnpm rbac:init` / create admin if needed

### 16.4 Preview Worker

- [ ] `pnpm tsx scripts/configure-game-site-worker.ts …` (or skill `/deploy-game-site`)
- [ ] `SITE_KEY=driftbossgame`
- [ ] `DEPLOY_ENV=preview` (robots must Disallow: /)
- [ ] Secrets: `AUTH_SECRET=…`

### 16.5 Verify

- [ ] Manual: home / game / embed / category / canonical / hreflang / sitemap / robots / cross-site 404
- [ ] `pnpm game:audit:cutover -- --base=… --canonical=https://driftbossgame.org --game=drift-boss … --expect-indexable=false`
- [ ] Owner visual sign-off

### 16.6 After approval only

- full DriftBoss dataset
- production D1 / Worker as needed
- DNS cutover
```

---

## 6. 建议分工

| 角色     | 建议负责                                                                                           |
| -------- | -------------------------------------------------------------------------------------------------- |
| 文档同事 | 本文 §1.3、§1.4、§2、§3、§5 填进 HANDOFF / runbook                                                 |
| 工程同事 | 若选方案 A：给 export 脚本加 `--games=`（并决定是否同时过滤 catalog）；跑一遍 dry-run 回填真实命令 |

---

## 7. 已处理（补充者填写）

| 日期 | 条目 | 处理人 | 备注 |
| ---- | ---- | ------ | ---- |
|      |      |        |      |
