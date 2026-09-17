import * as games from '../src/modules/games/service';
import { findCrossSiteDuplicateGameContent } from '../src/modules/site-games/duplicate-content';
import * as siteGames from '../src/modules/site-games/service';
import * as sitePosts from '../src/modules/site-posts/service';
import * as sites from '../src/modules/sites/service';

async function main() {
  const siteA = await sites.getByKey('local-dev');
  const game = await games.getByKey('demo-game');
  if (!siteA || !game) throw new Error('Seed fixture missing');

  let siteB = await sites.getByKey('isolation-b');
  if (!siteB) {
    siteB = await sites.create({
      key: 'isolation-b',
      domain: 'isolation-b.example.test',
      name: 'Isolation B',
      defaultLocale: 'en',
      enabledLocales: ['en'],
    });
  }

  let siteBGame = await siteGames.getPublishedBySlug({
    siteId: siteB.id,
    locale: 'en',
    slug: 'demo-game',
  });

  if (!siteBGame) {
    const attached = await siteGames.attachGame({
      siteId: siteB.id,
      gameId: game.id,
      status: siteGames.SiteGameStatus.PUBLISHED,
      indexable: true,
    });
    await siteGames.upsertLocaleContent({
      siteId: siteB.id,
      siteGameId: attached.id,
      locale: 'en',
      slug: 'demo-game',
      title: 'Site B Demo Game',
      status: siteGames.SiteContentStatus.PUBLISHED,
      description: 'Site B content must never leak into Site A.',
    });
    siteBGame = await siteGames.getPublishedBySlug({
      siteId: siteB.id,
      locale: 'en',
      slug: 'demo-game',
    });
  }

  const siteAGame = await siteGames.getPublishedBySlug({
    siteId: siteA.id,
    locale: 'en',
    slug: 'demo-game',
  });

  if (!siteAGame || !siteBGame) throw new Error('Expected both site-scoped game pages');
  if (siteAGame.siteId === siteBGame.siteId) throw new Error('Test sites unexpectedly share site id');
  if (siteAGame.title === siteBGame.title) {
    throw new Error('Site-specific game content was not isolated');
  }
  if (siteAGame.title !== 'Demo Game') {
    throw new Error(`Site A game content leaked or changed: ${siteAGame.title}`);
  }
  if (siteBGame.title !== 'Site B Demo Game') {
    throw new Error(`Site B game content mismatch: ${siteBGame.title}`);
  }

  // Separate rows are necessary but not sufficient for SEO uniqueness. Prove
  // that the publish guard can detect an accidentally copied substantial body
  // for the same global game on another domain.
  const duplicateBody = Array.from(
    { length: 45 },
    (_, index) =>
      `Shared paragraph ${index + 1}: this intentionally duplicated body is long enough to represent the primary SEO page copy.`
  ).join('\n\n');

  await siteGames.upsertLocaleContent({
    siteId: siteB.id,
    siteGameId: siteBGame.siteGameId,
    locale: 'en',
    slug: 'demo-game',
    title: 'Site B Demo Game',
    status: siteGames.SiteContentStatus.PUBLISHED,
    content: duplicateBody,
  });

  const duplicate = await findCrossSiteDuplicateGameContent({
    siteId: siteA.id,
    siteGameId: siteAGame.siteGameId,
    locale: 'en',
    content: duplicateBody,
  });
  if (!duplicate || duplicate.siteId !== siteB.id) {
    throw new Error('Cross-site duplicate game content guard failed');
  }

  const uniqueCandidate = await findCrossSiteDuplicateGameContent({
    siteId: siteA.id,
    siteGameId: siteAGame.siteGameId,
    locale: 'en',
    content: `${duplicateBody}\nThis site-specific ending makes the substantial body unique.`,
  });
  if (uniqueCandidate) {
    throw new Error('Duplicate guard produced a false positive for unique content');
  }

  const postA = await sitePosts.createPost({
    siteId: siteA.id,
    type: sitePosts.SitePostType.GUIDE,
    status: sitePosts.SitePostStatus.PUBLISHED,
    indexable: true,
  });
  await sitePosts.upsertLocaleContent({
    siteId: siteA.id,
    sitePostId: postA.id,
    locale: 'en',
    slug: 'same-guide',
    title: 'Site A Guide',
    status: sitePosts.SitePostContentStatus.PUBLISHED,
    content: 'A',
  });

  const postB = await sitePosts.createPost({
    siteId: siteB.id,
    type: sitePosts.SitePostType.GUIDE,
    status: sitePosts.SitePostStatus.PUBLISHED,
    indexable: true,
  });
  await sitePosts.upsertLocaleContent({
    siteId: siteB.id,
    sitePostId: postB.id,
    locale: 'en',
    slug: 'same-guide',
    title: 'Site B Guide',
    status: sitePosts.SitePostContentStatus.PUBLISHED,
    content: 'B',
  });

  const [guideA, guideB] = await Promise.all([
    sitePosts.getPublishedBySlug({
      siteId: siteA.id,
      locale: 'en',
      slug: 'same-guide',
      type: sitePosts.SitePostType.GUIDE,
    }),
    sitePosts.getPublishedBySlug({
      siteId: siteB.id,
      locale: 'en',
      slug: 'same-guide',
      type: sitePosts.SitePostType.GUIDE,
    }),
  ]);

  if (guideA?.title !== 'Site A Guide') throw new Error('Site A post isolation failed');
  if (guideB?.title !== 'Site B Guide') throw new Error('Site B post isolation failed');

  console.log(
    'Cross-site Game/Post isolation + duplicate-content guard smoke test passed'
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
