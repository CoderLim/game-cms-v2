import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Materialize a site-specific wrangler.jsonc for one Game Site Engine Worker.
 *
 * This intentionally does not deploy. It only prepares the local, gitignored
 * config so multiple Workers can reuse the same shared D1 database while each
 * deployment gets its own SITE_KEY and canonical URL.
 *
 * Usage:
 *   pnpm tsx scripts/configure-game-site-worker.ts \
 *     --site-key=driftbossgame \
 *     --domain=driftbossgame.org \
 *     --worker=driftbossgame \
 *     --site-name="Drift Boss" \
 *     --database-id=<shared-d1-id> \
 *     --database-name=game-site-engine-db \
 *     --deploy-env=preview
 */

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const index = arg.indexOf('=');
    return index === -1
      ? [arg.replace(/^--/, ''), 'true']
      : [arg.slice(2, index), arg.slice(index + 1)];
  })
);

function required(name: string) {
  const value = String(args.get(name) || '').trim();
  if (!value) throw new Error(`--${name}=... is required`);
  return value;
}

function normalizeDomain(value: string) {
  return value
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '');
}

function jsonString(value: string) {
  return JSON.stringify(value);
}

const siteKey = required('site-key').toLowerCase();
const domain = normalizeDomain(required('domain'));
const workerName = (args.get('worker') || siteKey).trim().toLowerCase();
const siteName = (args.get('site-name') || siteKey).trim();
const databaseId = required('database-id');
const databaseName = (args.get('database-name') || 'game-site-engine-db').trim();
const deployEnv = (args.get('deploy-env') || 'preview').trim().toLowerCase();
const output = resolve(args.get('out') || 'wrangler.jsonc');
const templatePath = resolve(
  args.get('template') || 'wrangler.example.jsonc'
);

if (!['preview', 'staging', 'production'].includes(deployEnv)) {
  throw new Error('--deploy-env must be preview, staging, or production');
}

if (!/^[a-z0-9][a-z0-9-]*$/.test(siteKey)) {
  throw new Error(
    '--site-key must contain only lowercase letters, numbers, and hyphens'
  );
}

if (!/^[a-z0-9][a-z0-9-]*$/.test(workerName)) {
  throw new Error(
    '--worker must contain only lowercase letters, numbers, and hyphens'
  );
}

if (!/^[0-9a-f-]{20,}$/i.test(databaseId)) {
  throw new Error('--database-id does not look like a Cloudflare D1 database id');
}

let text = readFileSync(templatePath, 'utf8');

function replaceOnce(pattern: RegExp, replacement: string, label: string) {
  if (!pattern.test(text)) {
    throw new Error(`Could not locate ${label} in ${templatePath}`);
  }
  text = text.replace(pattern, replacement);
}

replaceOnce(
  /"name"\s*:\s*"game-site-engine"/,
  `"name": ${jsonString(workerName)}`,
  'Worker name'
);
replaceOnce(
  /"SITE_KEY"\s*:\s*"REPLACE_WITH_GAME_SITE_KEY"/,
  `"SITE_KEY": ${jsonString(siteKey)}`,
  'SITE_KEY placeholder'
);
replaceOnce(
  /"DEPLOY_ENV"\s*:\s*"production"/,
  `"DEPLOY_ENV": ${jsonString(deployEnv)}`,
  'DEPLOY_ENV'
);
replaceOnce(
  /"VITE_APP_URL"\s*:\s*"https:\/\/example\.com"/,
  `"VITE_APP_URL": ${jsonString(`https://${domain}`)}`,
  'VITE_APP_URL'
);
replaceOnce(
  /"VITE_APP_NAME"\s*:\s*"Game Site"/,
  `"VITE_APP_NAME": ${jsonString(siteName)}`,
  'VITE_APP_NAME'
);
replaceOnce(
  /"database_name"\s*:\s*"game-site-engine-db"/,
  `"database_name": ${jsonString(databaseName)}`,
  'D1 database_name'
);
replaceOnce(
  /"database_id"\s*:\s*"REPLACE_WITH_OUTPUT_OF_WRANGLER_D1_CREATE"/,
  `"database_id": ${jsonString(databaseId)}`,
  'D1 database_id placeholder'
);

writeFileSync(output, text, 'utf8');

console.log(`Prepared ${output}`);
console.log(`Worker: ${workerName}`);
console.log(`SITE_KEY: ${siteKey}`);
console.log(`Domain: https://${domain}`);
console.log(`Deploy env: ${deployEnv}`);
console.log(`Shared D1: ${databaseName} (${databaseId})`);
console.log('No deployment was performed.');
