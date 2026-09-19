import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/en/g/pool-club')({
  loader: () => {
    throw redirect({
      to: '/game/$slug',
      params: { slug: 'pool-club' },
    });
  },
});
