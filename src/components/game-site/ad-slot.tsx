import { useEffect } from 'react';

const ADSENSE_CLIENT = /^ca-pub-\d+$/i;
const ADSENSE_SLOT = /^\d+$/;

type AdsConfig = {
  enabled?: unknown;
  adsenseClient?: unknown;
  slots?: unknown;
};

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function AdSlot({
  ads,
  slotKey,
  className,
}: {
  ads?: Record<string, unknown>;
  slotKey: string;
  className?: string;
}) {
  const config = (ads || {}) as AdsConfig;
  const client = asString(config.adsenseClient);
  const slots =
    config.slots && typeof config.slots === 'object'
      ? (config.slots as Record<string, unknown>)
      : {};
  const slot = asString(slots[slotKey]);

  const enabled =
    config.enabled !== false &&
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
