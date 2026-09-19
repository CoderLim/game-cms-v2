import { createFileRoute } from '@tanstack/react-router';

import { PokiHome } from '@/components/poki/poki-home';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Free Online Games at Poki - Play Now!' },
      {
        name: 'description',
        content:
          'Play 1500 free games instantly on Poki. All of the games are available to play on mobile, tablet and desktop.',
      },
    ],
  }),
  component: PokiHome,
});
