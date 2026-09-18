import handler from '@tanstack/react-start/server-entry';

import { getCookieFromHeader } from './lib/cookie';
import { paraglideMiddleware } from './paraglide/server.js';

// On Cloudflare Workers, stash the binding env (D1, ASSETS, …) on globalThis
// so synchronous code paths (e.g. the db() singleton with DATABASE_PROVIDER=d1)
// can reach bindings without threading the request context through every call.
// The specifier is kept non-literal so bundlers leave the import to runtime;
// outside workerd the import rejects and we just move on.
const CF_WORKERS_MODULE = 'cloudflare:workers';
let cfEnvPromise: Promise<void> | null = null;

function ensureCloudflareEnv(): Promise<void> {
  if (!cfEnvPromise) {
    cfEnvPromise = import(/* @vite-ignore */ CF_WORKERS_MODULE)
      .then((mod) => {
        (globalThis as any).__CF_ENV__ = mod.env;
      })
      .catch(() => {
        // Not running on Cloudflare Workers — nothing to stash.
      });
  }
  return cfEnvPromise;
}

function isCacheablePublicPath(pathname: string) {
  // Paraglide locale prefixes may appear before these segments, so match the
  // semantic route segment rather than assuming it is the first segment.
  if (pathname === '/') return true;
  return (
    /(^|\/)game\//.test(pathname) ||
    /(^|\/)category\//.test(pathname) ||
    /(^|\/)blog(?:\/|$)/.test(pathname) ||
    /(^|\/)guides(?:\/|$)/.test(pathname)
  );
}

function maybeApplyPublicCache(req: Request, response: Response) {
  if (!['GET', 'HEAD'].includes(req.method)) return;
  if (response.status !== 200) return;
  if (response.headers.has('Set-Cookie')) return;

  const contentType = response.headers.get('Content-Type') || '';
  if (!contentType.includes('text/html')) return;

  const { pathname } = new URL(req.url);
  if (!isCacheablePublicPath(pathname)) return;

  // Browser revalidates quickly while Cloudflare can keep a short shared copy.
  // Writes still become visible quickly, and stale-while-revalidate avoids D1
  // bursts when a popular page expires.
  response.headers.set(
    'Cache-Control',
    'public, max-age=60, s-maxage=300, stale-while-revalidate=86400'
  );
}

// Custom server entry — wraps every request in Paraglide's middleware so
// getLocale() resolves per-request (AsyncLocalStorage) during SSR.
export default {
  async fetch(req: Request): Promise<Response> {
    await ensureCloudflareEnv();
    const response = await paraglideMiddleware(req, () => handler.fetch(req));
    const utmSource = new URL(req.url).searchParams.get('utm_source');
    const existing = getCookieFromHeader(
      req.headers.get('cookie'),
      'utm_source'
    );
    if (utmSource && !existing) {
      const sanitized = utmSource.replace(/[^\w.\-]/g, '').slice(0, 100);
      if (sanitized) {
        response.headers.append(
          'Set-Cookie',
          `utm_source=${sanitized}; Max-Age=2592000; Path=/; SameSite=Lax`
        );
      }
    }

    maybeApplyPublicCache(req, response);
    return response;
  },
};
