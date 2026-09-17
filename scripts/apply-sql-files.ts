import { readFileSync } from 'node:fs';
import { createClient } from '@libsql/client';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const files = process.argv.slice(2);
if (!files.length) throw new Error('Provide at least one SQL file');

const client = createClient({ url: databaseUrl });

try {
  for (const file of files) {
    let sql = readFileSync(file, 'utf8');
    // executeMultiple manages statements itself. Strip transaction wrappers so
    // multiple independently generated files can be applied sequentially.
    sql = sql
      .replace(/^PRAGMA foreign_keys = ON;\s*$/gm, '')
      .replace(/^BEGIN TRANSACTION;\s*$/gm, '')
      .replace(/^COMMIT;\s*$/gm, '');

    await client.executeMultiple(sql);
    console.log(`Applied ${file}`);
  }
} finally {
  client.close();
}
