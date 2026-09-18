import { createClient } from '@libsql/client';

const databaseUrl =
  process.env.DATABASE_URL || 'file:data/legacy-preview-sample.db';
const email = (process.env.GAME_ADMIN_EMAIL || 'preview-admin@example.com')
  .trim()
  .toLowerCase();
const client = createClient({ url: databaseUrl });

async function one<T extends Record<string, unknown>>(
  sql: string,
  args: unknown[] = []
) {
  const result = await client.execute({ sql, args });
  return result.rows[0] as T | undefined;
}

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

try {
  const user = await one<{ id: string; email_verified: number }>(
    'SELECT id, email_verified FROM user WHERE email = ?',
    [email]
  );
  expect(user?.id, 'preview admin user missing');
  expect(Number(user.email_verified) === 1, 'preview admin must be verified');

  const account = await one<{ c: number }>(
    `SELECT COUNT(*) AS c
       FROM account
      WHERE user_id = ? AND provider_id = 'credential' AND password IS NOT NULL`,
    [user.id]
  );
  expect(Number(account?.c) === 1, 'credential account/password hash missing');

  const access = await one<{ c: number }>(
    `SELECT COUNT(*) AS c
       FROM user_role ur
       JOIN role r ON r.id = ur.role_id
       JOIN role_permission rp ON rp.role_id = r.id
       JOIN permission p ON p.id = rp.permission_id
      WHERE ur.user_id = ?
        AND r.name = 'super_admin'
        AND p.code = '*'`,
    [user.id]
  );
  expect(Number(access?.c) === 1, 'super_admin wildcard permission missing');

  console.log('D1 preview admin bootstrap verification passed.');
} finally {
  client.close();
}
