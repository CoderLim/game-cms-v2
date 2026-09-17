import type { PublicSiteSettingKey } from './public-keys';

const GA_ID = /^G-[A-Z0-9]+$/i;
const CLARITY_ID = /^[a-z0-9]+$/i;
const ADSENSE_CLIENT = /^ca-pub-\d+$/i;
const ADSENSE_SLOT = /^\d+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function optionalString(value: unknown) {
  return value === undefined || value === null || typeof value === 'string';
}

export function validatePublicSiteSetting(
  key: PublicSiteSettingKey,
  value: unknown
): string | null {
  if (key === 'analytics') {
    if (!isRecord(value)) return 'analytics must be a JSON object';
    if (!optionalString(value.gaId)) return 'analytics.gaId must be a string';
    if (!optionalString(value.clarityId)) {
      return 'analytics.clarityId must be a string';
    }
    if (typeof value.gaId === 'string' && value.gaId && !GA_ID.test(value.gaId)) {
      return 'analytics.gaId must look like G-XXXXXXXXXX';
    }
    if (
      typeof value.clarityId === 'string' &&
      value.clarityId &&
      !CLARITY_ID.test(value.clarityId)
    ) {
      return 'analytics.clarityId contains invalid characters';
    }
    return null;
  }

  if (key === 'ads') {
    if (!isRecord(value)) return 'ads must be a JSON object';
    if (value.enabled !== undefined && typeof value.enabled !== 'boolean') {
      return 'ads.enabled must be a boolean';
    }
    if (!optionalString(value.adsenseClient)) {
      return 'ads.adsenseClient must be a string';
    }
    if (
      typeof value.adsenseClient === 'string' &&
      value.adsenseClient &&
      !ADSENSE_CLIENT.test(value.adsenseClient)
    ) {
      return 'ads.adsenseClient must look like ca-pub-1234567890123456';
    }
    if (value.slots !== undefined) {
      if (!isRecord(value.slots)) return 'ads.slots must be a JSON object';
      for (const [slotName, slotId] of Object.entries(value.slots)) {
        if (typeof slotId !== 'string' || !ADSENSE_SLOT.test(slotId)) {
          return `ads.slots.${slotName} must be a numeric AdSense slot id`;
        }
      }
    }
    return null;
  }

  if (key === 'social_links') {
    if (!Array.isArray(value)) return 'social_links must be a JSON array';
    for (const [index, item] of value.entries()) {
      if (!isRecord(item) || typeof item.url !== 'string') {
        return `social_links[${index}] must contain a url string`;
      }
      try {
        const url = new URL(item.url);
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
      } catch {
        return `social_links[${index}].url must be an http(s) URL`;
      }
      if (!optionalString(item.name) || !optionalString(item.displayName)) {
        return `social_links[${index}] names must be strings`;
      }
    }
    return null;
  }

  if (key === 'navigation') {
    if (!Array.isArray(value)) return 'navigation must be a JSON array';
    for (const [index, item] of value.entries()) {
      if (
        !isRecord(item) ||
        typeof item.label !== 'string' ||
        typeof item.href !== 'string'
      ) {
        return `navigation[${index}] must contain label and href strings`;
      }
    }
    return null;
  }

  if (key === 'footer' || key === 'game_player') {
    return isRecord(value) ? null : `${key} must be a JSON object`;
  }

  return 'Unsupported public site setting key';
}
