export const PUBLIC_SITE_SETTING_KEYS = [
  'analytics',
  'ads',
  'navigation',
  'footer',
  'game_player',
] as const;

export type PublicSiteSettingKey = (typeof PUBLIC_SITE_SETTING_KEYS)[number];

export function isPublicSiteSettingKey(
  value: string
): value is PublicSiteSettingKey {
  return (PUBLIC_SITE_SETTING_KEYS as readonly string[]).includes(value);
}
