# Game Site Engine — Per-site Settings

`site_setting` contains **public, site-scoped runtime configuration**. It is resolved through the active `SITE_KEY` and must never contain credentials or other secrets.

Secrets such as database URLs, auth secrets, R2 secret keys and third-party API keys belong in Cloudflare Worker secrets/environment variables.

## Analytics

Key: `analytics`

```json
{
  "gaId": "G-XXXXXXXXXX",
  "clarityId": "abcdef1234"
}
```

Supported fields:

- `gaId`: GA4 Measurement ID (`G-...`)
- `clarityId`: Microsoft Clarity project ID

The public runtime validates IDs before rendering scripts. Arbitrary script source/code cannot be configured through this setting.

## Ads

Key: `ads`

```json
{
  "enabled": true,
  "adsenseClient": "ca-pub-1234567890123456",
  "slots": {
    "gameTop": "1234567890",
    "gameBottom": "0987654321"
  }
}
```

Supported fields:

- `enabled`: set to `false` to disable AdSense rendering for the site
- `adsenseClient`: AdSense publisher client in `ca-pub-...` format
- `slots.gameTop`: slot rendered above the game player
- `slots.gameBottom`: slot rendered below the player/rating area

`/ads.txt` is generated from the current site's `adsenseClient`. It never falls back to another site's or ShipAny's global AdSense setting.

## Social links

Key: `social_links`

```json
[
  {
    "name": "YouTube",
    "displayName": "YouTube",
    "url": "https://youtube.com/@example"
  }
]
```

Only `http:` and `https:` URLs are accepted.

## Navigation

Key: `navigation`

```json
[
  { "label": "Guides", "href": "/guides" },
  { "label": "Blog", "href": "/blog" }
]
```

The public `SiteHeader` consumes this setting today. Category links are appended separately from published site categories.

## Footer

Key: `footer`

```json
{
  "description": "Play browser games and discover guides."
}
```

## Game player

Key: `game_player`

```json
{
  "allowFullscreen": true,
  "autoplay": false
}
```

The public `GamePlayer` consumes these values today. They control iframe fullscreen and autoplay permissions without per-domain conditionals.

## Safety rules

1. All setting keys are explicitly allowlisted.
2. Values must be valid JSON.
3. Analytics and AdSense identifiers are format-validated before persistence.
4. Social links reject non-HTTP(S) schemes.
5. The frontend never accepts arbitrary JavaScript from `site_setting`.
6. Missing/invalid optional settings fail closed: no script/ad is rendered.


## Runtime wiring matrix

| Setting key | Validation/storage | Public runtime consumer | Status |
| --- | --- | --- | --- |
| `analytics` | allowlisted + format validated | `SiteRuntime` via `SiteFooter` | wired |
| `ads` | allowlisted + AdSense/slot validation | `AdSlot`, `SiteRuntime`, `/ads.txt` | wired |
| `navigation` | allowlisted JSON | `SiteHeader` | wired |
| `footer` | allowlisted JSON | `SiteFooter` | wired |
| `game_player` | allowlisted JSON | `GamePlayer` | wired |
| `social_links` | allowlisted + HTTP(S)-only URLs | `SiteFooter` | wired |

This table is the source of truth for V1. If a new setting is added, update validation, Admin UI, runtime consumption, and this table together.
