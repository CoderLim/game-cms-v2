import { createFileRoute } from '@tanstack/react-router';

import { respData, respErr } from '@/lib/resp';
import { requireAdmin } from '@/modules/admin/guard';
import {
  isPublicSiteSettingKey,
  PUBLIC_SITE_SETTING_KEYS,
} from '@/modules/site-settings/public-keys';
import * as siteSettings from '@/modules/site-settings/service';

async function GET({ request }: { request: Request }) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId') || '';
    if (!siteId) return respErr('siteId is required');

    const rows = await siteSettings.list(siteId);
    const result = Object.fromEntries(
      PUBLIC_SITE_SETTING_KEYS.map((key) => {
        const row = rows.find((item) => item.key === key);
        return [key, row?.value || ''];
      })
    );
    return respData(result);
  } catch (error: any) {
    return respErr(error.message || 'Failed to load site settings');
  }
}

async function PUT({ request }: { request: Request }) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    if (!body?.siteId || typeof body?.key !== 'string') {
      return respErr('siteId and key are required');
    }
    if (!isPublicSiteSettingKey(body.key)) {
      return respErr('Unsupported public site setting key');
    }
    if (body.value !== null && typeof body.value !== 'string') {
      return respErr('value must be a JSON string or null');
    }

    if (body.value) {
      try {
        JSON.parse(body.value);
      } catch {
        return respErr('value must contain valid JSON');
      }
    }

    const row = await siteSettings.set({
      siteId: body.siteId,
      key: body.key,
      value: body.value || null,
    });
    return respData(row);
  } catch (error: any) {
    return respErr(error.message || 'Failed to save site setting');
  }
}

export const Route = createFileRoute('/api/admin/site-settings')({
  server: { handlers: { GET, PUT } },
});
