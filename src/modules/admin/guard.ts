import { getAuth } from '@/core/auth';
import { hasPermission } from '@/modules/rbac/service';

export async function requireAdmin(request: Request) {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) throw new Error('Unauthorized');

  const allowed = await hasPermission(session.user.id, 'admin.*');
  if (!allowed) throw new Error('Forbidden');

  return session;
}
