import { envConfigs } from '@/config';

export function resolveStaticAssetUrl(
  value: string | null | undefined
): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (
    /^https?:\/\//i.test(trimmed) ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  const origin = envConfigs.static_asset_origin;
  if (!origin) {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }

  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${origin}${path}`;
}
