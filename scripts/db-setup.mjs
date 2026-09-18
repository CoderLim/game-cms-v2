// Copies the matching base and Game Site Engine domain schema templates into
// generated runtime schema files based on DATABASE_PROVIDER. Called from
// `pnpm db:setup` and from `prebuild` so builds line up with the runtime dialect.
//
// Base templates committed to git:
//   schema.sqlite.ts   (default; also used by turso / d1)
//   schema.postgres.ts (used by postgres / postgresql)
//   schema.mysql.ts    (legacy ShipAny support)
//
// Game-domain templates committed to git:
//   game-schema.sqlite.ts
//   game-schema.postgres.ts
//   game-content-schema.sqlite.ts
//   game-content-schema.postgres.ts
//
// Env-file loading mirrors scripts/with-env.ts so this script picks up
// DATABASE_PROVIDER from .env.<NODE_ENV> / .env.local / .env when run from
// `pnpm install` postinstall (which doesn't go through with-env.ts).
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return false;
  const content = readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
  return true;
}

const nodeEnv = process.env.NODE_ENV || 'development';
const envFiles = process.env.ENV_FILE
  ? [process.env.ENV_FILE]
  : [`.env.${nodeEnv}.local`, `.env.${nodeEnv}`, '.env.local', '.env'];
for (const f of envFiles) loadEnvFile(resolve(f));

const TEMPLATE_BY_PROVIDER = {
  sqlite: 'sqlite',
  turso: 'sqlite',
  d1: 'sqlite',
  postgres: 'postgres',
  postgresql: 'postgres',
  mysql: 'mysql',
};

const GAME_TEMPLATE_BY_PROVIDER = {
  sqlite: 'sqlite',
  turso: 'sqlite',
  d1: 'sqlite',
  postgres: 'postgres',
  postgresql: 'postgres',
};

const provider = (process.env.DATABASE_PROVIDER || 'sqlite').toLowerCase();
const templateName = TEMPLATE_BY_PROVIDER[provider];
const gameTemplateName = GAME_TEMPLATE_BY_PROVIDER[provider];

if (!templateName) {
  console.error(
    `db-setup: unknown DATABASE_PROVIDER=${provider} (supported: ${Object.keys(TEMPLATE_BY_PROVIDER).join(', ')})`
  );
  process.exit(1);
}

if (!gameTemplateName) {
  console.error(
    `db-setup: Game Site Engine does not support DATABASE_PROVIDER=${provider}. ` +
      'V1 officially supports d1/sqlite; PostgreSQL is the compatibility path.'
  );
  process.exit(1);
}

const baseSrc = resolve(`src/config/db/schema.${templateName}.ts`);
const baseDst = resolve('src/config/db/schema.ts');
const gameSrc = resolve(`src/config/db/game-schema.${gameTemplateName}.ts`);
const gameDst = resolve('src/config/db/game-schema.ts');
const gameContentSrc = resolve(
  `src/config/db/game-content-schema.${gameTemplateName}.ts`
);
const gameContentDst = resolve('src/config/db/game-content-schema.ts');

for (const src of [baseSrc, gameSrc, gameContentSrc]) {
  if (!existsSync(src)) {
    console.error(`db-setup: template not found at ${src}`);
    process.exit(1);
  }
}

copyFileSync(baseSrc, baseDst);
copyFileSync(gameSrc, gameDst);
copyFileSync(gameContentSrc, gameContentDst);

console.log(
  `db-setup: schema.ts ← schema.${templateName}.ts; game-schema.ts + game-content-schema.ts ← ${gameTemplateName} templates (DATABASE_PROVIDER=${provider})`
);
