# 方案：把现有游戏 CMS 接到 Poki 首页和详情页

状态：待确认，尚未改代码。  
范围：只接首页 `/` 和游戏详情 `/game/$slug`。分类页、后台、支付、账号不动。

## 结论

Poki 页面继续当视觉壳。游戏、分类、文案、SEO、评分、浏览量、广告配置全部走现有模块，不新建表，不把马赛克坐标写进数据库。

正式地址：

- 首页：`/`
- 详情：`/game/$slug`

克隆留下的 `/en/g/pool-club` 改成跳转到 `/game/pool-club`。首页瓦片链接也改成 `/game/$slug` 和 `/category/$slug`。

## 现状

| 页面              | 现在                                                                   | 问题                              |
| ----------------- | ---------------------------------------------------------------------- | --------------------------------- |
| `/`               | `PokiHome` 直接读 `src/data/poki-home.json`                            | 没有 loader，不读站点、游戏、分类 |
| `/game/$slug`     | loader 已接 CMS，但渲染的是旧的 `SiteHeader` + `GamePlayer` + 卡片网格 | 数据和 Poki UI 没接上             |
| `/en/g/pool-club` | 静态 Pool Club 克隆                                                    | 和 CMS 详情页重复                 |

本地库 `data/local.db`、站点 `SITE_KEY=local-dev` 目前只有一条已发布游戏：`demo-game`（无封面、无 embed URL）。接上之后首页马赛克会先只有这一格，这是数据问题，不是接线失败。

## 数据从哪来

组件不能 import `@/modules/*` 或 `@/core/db`。Loader 取数，props 传给组件。

首页 loader 复用原先首页的调用：

- `getCurrentSiteContext()`
- `getLocale()`，locale 不在站点启用列表里则 `notFound()`
- `sites/content.getPublished`：站点标题、intro、正文
- `categories/service.listPublished`
- `site-games/public.getFeatured`、`listHot`
- `site-games/service.listPublished`
- `site-settings/service.getPublicSiteConfig`：导航、页脚、广告、播放器设置

详情页 loader 已经有这些，保留：

- `getPublishedBySlug`：标题、intro、description、howToPlay、controls、features、faq、content、`embedUrl`、`embedType`、`aspectRatio`、`imageUrl`、`provider`、`likeCount`、`dislikeCount`
- `listSimilar`：右侧和底部推荐
- `listPublished` 分类
- `getPublicSiteConfig`
- 现有 head：title、description、canonical、hreflang

详情页继续挂：

- `GameViewTracker` → `POST /api/game-view`
- `GameRating` → `POST /api/game-rating`（改成 Poki 信息栏里的拇指样式，逻辑不改）
- `GamePlayer` 的 iframe 规则：`embedUrl` 为空显示「还不能玩」；`embedType === 'external_url'` 外链；否则 iframe，尊重 `gamePlayer.allowFullscreen` / `autoplay`
- `AdSlot`：`gameTop` 放右侧广告位，`gameBottom` 放播放器下方横条。没配 AdSense 时保持现在的半透明占位，不报错
- `StructuredData` 保留

## 马赛克怎么填

坐标只存在于静态 JSON，数据库没有 `x/y/w/h`。不把坐标入库。

做法：布局 JSON 只提供格子（位置和尺寸），CMS 按顺序填内容。

1. 格子顺序：先大格（314、204），再 94。首页左侧 94×94 留给固定导航，不填游戏。
2. 游戏顺序：featured，然后 hot，然后其余 `listPublished`，按现有 `sortWeight`、发布时间。
3. 每个格子写入：`title`、`imageUrl`（没有就留空，显示标题）、`href: /game/${slug}`。
4. 游戏比格子少：空格子不渲染。
5. 游戏比格子多：首页先用满现有格子。`listPublished` 上限现在是 100，首页格子大约 145，第一期不改上限。

分类没有封面字段。分类格继续用 `public/poki/categories/` 里按 slug 能对上的图；对不上就显示分类名。链接改成 `/category/${slug}`。

详情页同样：`listSimilar` 按格子顺序填左右推荐。开发者「更多游戏」没有按 provider 查询的接口，第一期用 `listSimilar` 的前 4 个，不新写查询。

搜索仍是前端过滤当前页已加载的游戏标题，不新做搜索 API。

## 组件怎么改

`PokiHome`、`PokiGamePage` 不再自己 import JSON。

- `PokiHome` 接收：背景、游戏格、分类格、站点名（导航无障碍文案）、文章（站点 intro / content，没有就只显示站点名）、页脚链接（`publicConfig.navigation`，没有就留现有三列占位但链到站内页）。
- `PokiGamePage` 接收：当前游戏、推荐格、分类链接、播放器数据、广告配置、评分初始值、`siteGameId`。
- 文案区：第一段用 `intro` 或 description 摘要；Show more 展开 description、`howToPlay`、`controls`、`features`。这些字段是 markdown，用现有 `MarkdownContent` 渲染。
- 「About this game」只填库里有的：开发者用 `provider`，分类用已关联分类。发布日期、投票人数、设备列表库里没有，第一期不编。
- 页脚保留 `BuiltWithShipAny`。

`/en/g/pool-club.tsx` 改成 loader 里 redirect 到 `/game/pool-club`。不保留第二套详情 UI。

## 不做

- 不改表结构，不加分类封面、马赛克坐标、按开发者列游戏的接口。
- 不改 `/category/$slug` 的旧布局。
- 不把 Poki 克隆文案写进 `messages/en.json`。站点文案以数据库为准。
- 不把本地只有 `demo-game` 当成接线 bug。要看满格马赛克，需要在后台发布更多游戏。

## 实施顺序

1. 抽出填格函数：布局格子 + CMS 列表 → 带真实 title / image / href 的格子。放在路由旁边的普通函数，不进 module。
2. `PokiHome` 改成 props。`src/routes/index.tsx` 恢复 loader，head 改回站点 metaTitle / metaDescription 和 hreflang。
3. `PokiGamePage` 改成 props。`src/routes/game/$slug.tsx` 换成这套 UI，loader 和 head 保持。
4. `/en/g/$slug` 统一 redirect 到 `/game/$slug`，删掉写死的 Pool Club 路由。
5. 浏览器验两条路径：首页能点进 `/game/demo-game`；详情能记浏览、投票、空 embed 有明确空态；390 宽不出现横向滚动。
6. `pnpm build`。

## 验收

- 首页游戏名、封面、链接来自当前站已发布游戏，不再链到 `/en/g/...`。
- `/game/demo-game` 标题、简介、评分初值和库一致；embed 为空时不出现 Poki 的 Pool Club iframe。
- 换站点或换 locale 后，两页内容跟着变。
- 旧详情页的 SEO head、`VideoGame` 结构化数据还在。
