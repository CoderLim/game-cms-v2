import { createFileRoute, redirect } from '@tanstack/react-router';

/** Legacy user dashboard — send everyone to admin. */
export const Route = createFileRoute('/settings')({
  loader: () => {
    throw redirect({ to: '/admin' });
  },
});
