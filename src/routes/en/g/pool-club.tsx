import { createFileRoute } from '@tanstack/react-router';

import { PokiGamePage } from '@/components/poki/poki-game';

export const Route = createFileRoute('/en/g/pool-club')({
  head: () => ({
    meta: [
      { title: 'Pool Club - Play Online for Free! | Poki' },
      {
        name: 'description',
        content:
          'Line up your shot, apply spin and pot balls through a range of pool challenges and modes.',
      },
    ],
  }),
  component: PokiGamePage,
});
