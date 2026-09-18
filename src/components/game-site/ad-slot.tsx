import { useEffect } from 'react';

import type { PublicAdsConfig } from '@/modules/site-settings/service';

const ADSENSE_CLIENT = /^ca-pub-\d+$/i;
const ADSENSE_SLOT = /^\d+$/;

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function AdSlot({
  ads,
  slotKey,
  className,
}: {
  ads?: PublicAdsConfig;
  slotKey: string;
  className?: string;
}) {
  const client = asString(ads?.adsenseClient);
  const slot = asString(ads?.slots?.[slotKey]);

  const enabled =
    ads?.enabled !== false &&
    ADSENSE_CLIENT.test(client) &&
    ADSENSE_SLOT.test(slot);

  useEffect(() => {
    if (!enabled) return;
    try {
      const win = window as typeof window & {
        adsbygoogle?: unknown[];
      };
      (win.adsbygoogle = win.adsbygoogle || []).push({});
    } catch {
      // Ad blockers or delayed script loading should never break page rendering.
    }
  }, [enabled, client, slot]);

  if (!enabled) return null;

  return (
    <div className={className} data-ad-slot-name={slotKey}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
