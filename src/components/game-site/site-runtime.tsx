import type {
  PublicAdsConfig,
  PublicAnalyticsConfig,
} from '@/modules/site-settings/service';

const GA_ID = /^G-[A-Z0-9]+$/i;
const CLARITY_ID = /^[a-z0-9]+$/i;
const ADSENSE_CLIENT = /^ca-pub-\d+$/i;

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function SiteRuntime({
  analytics,
  ads,
}: {
  analytics?: PublicAnalyticsConfig;
  ads?: PublicAdsConfig;
}) {
  const gaId = asString(analytics?.gaId);
  const clarityId = asString(analytics?.clarityId);
  const adsenseClient = asString(ads?.adsenseClient);

  const validGaId = GA_ID.test(gaId) ? gaId : '';
  const validClarityId = CLARITY_ID.test(clarityId) ? clarityId : '';
  const validAdsenseClient =
    ads?.enabled !== false && ADSENSE_CLIENT.test(adsenseClient)
      ? adsenseClient
      : '';

  return (
    <>
      {validGaId ? (
        <>
          <script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(validGaId)}`}
          />
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${validGaId}');`,
            }}
          />
        </>
      ) : null}

      {validClarityId ? (
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,'clarity','script','${validClarityId}');`,
          }}
        />
      ) : null}

      {validAdsenseClient ? (
        <script
          async
          crossOrigin="anonymous"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(validAdsenseClient)}`}
        />
      ) : null}
    </>
  );
}
