# 方案：把现有游戏 CMS 接到当前首页和详情页 UI

状态：实施中。  
范围：只接首页 `/` 和游戏详情 `/game/$slug`。分类页、后台、支付、账号不动。

## 目标

当前首页和详情页的 UI 已经完成，下一步只做一件事：

> 保持现有 Game Site Engine 的数据层和业务逻辑稳定，把真实 CMS 数据、SEO、播放器、评分、浏览统计、广告和运行时配置接入当前 UI。

这次不是重做架构，也不为其他 UI 模板做抽象。

明确边界：

- 不改数据库 schema。
- 不重构已有 CMS service。
- 不重写播放器、评分、浏览统计、SEO、广告、Analytics 逻辑。
- 只允许补当前页面缺失的只读查询，以及在 route loader 中做页面需要的数据组装。
- 当前 UI 视为站点自己的正式 UI。页面上不保留 Poki 品牌、Poki 文案或 Pool Club 静态业务数据。
- `public/poki/`、`src/data/poki-*.json` 暂时只作为内部静态布局/素材路径，路径命名不是产品概念，本次不做大规模资源搬迁。

正式地址：

- 首页：`/`
- 详情：`/game/$slug`

旧克隆地址 `/en/g/pool-club` 改为跳转到 `/game/pool-club`。页面里的游戏和分类链接统一使用项目现有 locale-aware `Link`，最终仍由 Paraglide 处理语言前缀。

## 总体结构

```text
现有 CMS / DB services
  ├─ sites
  ├─ sites/content
  ├─ site-games
  ├─ categories
  └─ site-settings
          ↓
      Route loader
          ↓
页面级数据组装
  ├─ featured / hot / published 去重
  ├─ 静态 UI 格子 + CMS 数据映射
  └─ 当前游戏分类读取
          ↓
       当前正式 UI
```

数据和业务规则仍然以现有 modules 为唯一来源，UI 组件不直接访问 DB。

## 现状

| 页面 | 现在 | 改造目标 |
| --- | --- | --- |
| `/` | `PokiHome` 直接读 `src/data/poki-home.json` | 恢复 CMS loader，用 JSON 只保留背景和格子布局 |
| `/game/$slug` | loader 已接 CMS，但渲染旧 `SiteHeader + GamePlayer + cards` | loader/SEO 逻辑保留，换成当前详情 UI |
| `/en/g/pool-club` | 静态 Pool Club 克隆 | redirect 到正式详情地址 |

本地 `data/local.db`、`SITE_KEY=local-dev` 当前只有 `demo-game`。首页接通后只有少量格子是正常的数据状态，不应回退显示克隆里的 Poki 游戏。

## 已有稳定数据与逻辑

### 首页

继续使用：

- `getCurrentSiteContext()`
- `getLocale()`
- `sites/content.getPublished`
- `sites/content.listPublishedLocales`
- `categories/service.listPublished`
- `site-games/public.getFeatured`
- `site-games/public.listHot`
- `site-games/service.listPublished`
- `site-settings/service.getPublicSiteConfig`

原首页已有的 locale / SEO 规则完整保留：

- locale 不在 `site.enabledLocales` → `notFound()`
- 非 default locale 没有 published homepage content → `notFound()`
- canonical
- hreflang
- x-default
- meta title / description / OG / Twitter

### 详情页

继续使用：

- `getPublishedBySlug`
- `listPublishedLocales`
- `listSimilar`
- `getPublicSiteConfig`
- `GameViewTracker`
- `GameRating`
- `GamePlayer`
- `AdSlot`
- `SiteRuntime`
- `StructuredData`
- `MarkdownContent`

新增一个很小的只读查询：

- `categories/service.listForGame({ siteId, siteGameId, locale })`

用途只是读取当前游戏真实关联的分类，供 breadcrumb / Related categories / About this game 使用。它不改变 schema 和写入逻辑。

## 首页数据组装

### 1. 游戏顺序

业务优先级：

1. featured
2. hot
3. 其余 published

三个来源会重叠，必须按 `siteGameId` 去重，不能把同一个游戏填入多个格子。

伪代码：

```ts
const games = uniqueBySiteGameId([
  ...(featured ? [featured] : []),
  ...hotGames,
  ...publishedGames,
]);
```

`listPublished` 首页第一期取最多 100 条，当前格子多于 100 时允许后面的格子为空，不为填满 UI 修改数据库或造假数据。

### 2. 游戏格

`src/data/poki-home.json` 只把以下字段当 layout：

- `x`
- `y`
- `w`
- `h`
- grid width / height
- background

原 JSON 中的 Poki `title/image/href` 不再作为页面内容来源。

填入 CMS 数据：

- `title`
- `imageUrl`
- `href: /game/$slug`

格子顺序维持当前 UI 的大格优先逻辑：

- 314
- 204
- 94

左侧固定导航占用的位置不填游戏。

游戏比格子少：空格子不渲染。

### 3. 分类格

分类数据来自 `categories/service.listPublished`。

图片仍复用现有静态分类素材，但图片匹配使用稳定的 `categoryKey`，不能使用 localized slug：

```text
/public/poki/categories/{categoryKey}.png
```

链接使用真实 localized slug：

```text
/category/{slug}
```

没有对应静态图片时显示分类标题，不显示破图。

### 4. 搜索

继续做当前前端搜索，不加搜索 API。

搜索数据来自当前 loader 已加载的去重游戏列表，按 title 过滤，链接使用真实 `/game/$slug`。

## 详情页数据组装

### 1. 当前游戏

播放器继续使用 `GamePlayer`：

- `embedUrl == null` → 明确空态
- `embedType === external_url` → 外链
- 其他 → iframe
- 继续尊重 `gamePlayer.allowFullscreen` / `autoplay`

不能继续使用 `poki-pool-club.json` 里的 Pool Club iframe、标题、开发者、投票数。

### 2. 推荐游戏格

当前 UI 的推荐格坐标继续来自静态 JSON。

内容来自 `listSimilar`：

- title
- imageUrl
- `/game/$slug`

没有足够推荐游戏时，剩余格子不渲染。

原页面的 “More games by this developer” 不保留这个语义，因为 `listSimilar` 是相似游戏，不是同开发者查询。统一改成：

- `More Games`
- 或 `You May Also Like`

第一期使用 `More Games`。

### 3. Developer / Provider

当前 `game.provider` 是来源/provider，例如 `gamemonetize`、`local-seed`，不能当成 Developer。

因此第一期：

- 不展示 Developer 字段。
- 不新增 developer schema。
- 不用 provider 冒充 developer。

### 4. About this game

只展示数据库真实有的数据，例如：

- 分类
- views
- likes / dislikes

不编造：

- Release Date
- Latest Update
- Supported devices
- Developer
- vote 总人数之外无法推导的数据

### 5. 正文

短摘要：

- 优先 `intro`
- fallback 到 `description` 的短内容

Show more 展开真实 CMS Markdown：

- `description`
- `howToPlay`
- `controls`
- `features`
- `faq`
- `content`

全部使用现有 `MarkdownContent`，不再用字符串 split 模拟 Markdown。

## Rating / View / Ads / Runtime

### Rating

继续使用现有 `GameRating` 的 API 和状态逻辑。

只增加一个 compact UI variant，使它可以放进当前播放器底部信息栏。默认 variant 保持原样，避免影响其他调用方。

### View

`GameViewTracker` 继续挂在详情页，不改接口。

### Ads

当前 UI 保留固定广告位置。

- 真实广告继续由 `AdSlot` 控制。
- `AdSlot` 本身在未配置有效 AdSense 时返回 `null`。
- 页面布局容器可以继续显示半透明广告占位，从而保持当前 UI 空间结构。
- 不在 `AdSlot` 中伪造广告。

### Analytics / AdSense runtime

旧 `SiteFooter` 不再承担详情/首页的视觉 footer，但它之前内部包含的 `SiteRuntime` 能力必须显式保留。

当前 UI 页面底部继续挂：

```tsx
<SiteRuntime analytics={publicConfig.analytics} ads={publicConfig.ads} />
```

这样 GA、Clarity 和 AdSense script 不会因为换 UI 丢失。

## Branding / Footer

当前 UI 是站点自己的 UI。

左上角：

- 不显示 Poki logo。
- 显示当前 `site.name`。
- Home link 使用 locale-aware `Link`。

Footer：

- 站点名来自 `site.name`
- 描述来自 `publicConfig.footer.description`
- 导航来自 `publicConfig.navigation`
- social links 来自 `publicConfig.socialLinks`
- 保留 About / Contact / Privacy / Terms 站内链接
- 保留 `BuiltWithShipAny`
- 不保留 “Let the world play” 等 Poki 品牌文案

## 组件边界

UI 组件只接 props，不 import `@/modules/*` 或 DB。

首页组件接收：

- background
- gameGrid
- categoryGrid
- searchGames
- siteName
- site content
- navigation/footer/social/runtime config

详情组件接收：

- background / stage layout
- current game
- recommendation tiles
- current game categories
- public player / ads config
- site runtime config
- site name

静态 JSON 只提供 UI layout，不再提供业务内容。

## 实施顺序

1. 修订本方案，明确数据层不动和正确性规则。
2. 给 `categories/service` 补 `listForGame` 只读查询。
3. 给 `GameRating` 增加 compact variant，逻辑/API 不变。
4. 首页 route 恢复原 CMS loader、homepage locale SEO、hreflang，并做游戏去重 + 格子映射。
5. 首页 UI 改成 props 驱动，移除静态 Poki 内容和品牌。
6. 详情 route 保留现有 loader/head/StructuredData，补当前游戏分类并映射推荐格。
7. 详情 UI 改成 props 驱动，接 `GamePlayer / GameRating / GameViewTracker / AdSlot / MarkdownContent / SiteRuntime`。
8. `/en/g/pool-club` redirect 到 `/game/pool-club`。
9. 检查首页、详情的 locale-aware links。
10. build / typecheck。

## 真实数据 Preview Fixture

为验证当前 UI wiring，仓库内保留一份从 legacy `game-cms` 只读抽取的 DriftBoss 小样本：

- 24 个真实游戏
- 20 个真实分类
- 56 条游戏-分类关系
- 25 条游戏 locale（Drift Boss 包含 `en + zh`）
- homepage SEO / static pages
- 6 条 social links

文件：

```text
scripts/fixtures/driftboss-ui-preview.json
scripts/seed-ui-preview.ts
```

这份 fixture 只用于 Preview / 本地验证，不是生产迁移源。

推荐用独立 SQLite：

```bash
export DATABASE_PROVIDER=sqlite
export DATABASE_URL=file:data/ui-wiring-preview.db
export SITE_KEY=driftbossgame
export DEPLOY_ENV=preview
export VITE_DEFAULT_LOCALE=en

pnpm db:setup
pnpm db:push
pnpm game:seed:ui-preview
pnpm dev
```

测试策略：

- `drift-boss` = featured
- 8 个真实游戏 = hot
- 24 个游戏按固定 `sortWeight` 填首页
- Preview 保留旧库 view / like / dislike，只为验证 UI；正式生产迁移仍按 migration runbook 清零 site-level counters
- 未选中的旧库游戏不会进入 Preview，因此访问其 `/game/$slug` 应 404

CI `.github/workflows/ui-preview-fixture-smoke.yaml` 会在干净 SQLite 上真实导入该 fixture，并验证 game/category/locale/featured/hot/category mapping 后再跑 production build。

## 验收

### 首页

- 游戏标题、封面、链接全部来自当前站 published CMS 数据。
- featured/hot/published 不重复。
- 分类标题/slug 来自 CMS，图片只由 categoryKey 匹配静态素材。
- 搜索结果来自真实 CMS 游戏。
- 页面不显示 Poki 品牌或 Poki 游戏数据。
- 首页 title / description / canonical / hreflang 与改 UI 前一致。
- 换 site / locale 后内容跟着变化。

### 详情

- `/game/demo-game` 的标题、正文、评分、分类与数据库一致。
- embed 为空时不出现 Pool Club iframe。
- 推荐游戏来自 `listSimilar`。
- Related categories 只显示当前游戏真实关联分类。
- 不把 provider 当 developer。
- view tracking / rating API 正常保留。
- StructuredData / canonical / hreflang 正常保留。
- GA / Clarity / AdSense runtime 正常保留。
- 390 宽不出现横向页面滚动。

### 约束

- 无数据库 migration。
- 无业务 service 重构。
- 无第二套业务数据模型。
- 无 clone 静态业务数据 fallback。
