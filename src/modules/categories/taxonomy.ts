export type GameCategoryDefinition = {
  key: string;
  title: string;
  navPriority: number;
  primaryNav: boolean;
};

/**
 * Canonical top-level taxonomy for browser game sites.
 *
 * Keep this list intentionally small and stable. More specific concepts such as
 * 3D, stickman, drifting, soccer, mahjong, hypercasual, etc. belong in tags or
 * SEO landing pages rather than becoming new top-level categories.
 */
export const GAME_CATEGORY_TAXONOMY = [
  { key: 'action-games', title: 'Action & Fighting Games', navPriority: 1200, primaryNav: true },
  { key: 'driving-racing-games', title: 'Driving & Racing Games', navPriority: 1190, primaryNav: true },
  { key: 'shooting-games', title: 'Shooting Games', navPriority: 1180, primaryNav: true },
  { key: 'puzzle-games', title: 'Puzzle & Brain Games', navPriority: 1170, primaryNav: true },
  { key: 'skill-games', title: 'Skill & Precision Games', navPriority: 1160, primaryNav: true },
  { key: 'sports-games', title: 'Sports Games', navPriority: 1150, primaryNav: true },
  { key: 'adventure-games', title: 'Adventure & RPG Games', navPriority: 1140, primaryNav: true },
  { key: 'arcade-games', title: 'Arcade & Classic Games', navPriority: 1130, primaryNav: true },
  { key: 'multiplayer-games', title: 'Multiplayer Games', navPriority: 1120, primaryNav: true },
  { key: 'casual-games', title: 'Casual Games', navPriority: 1110, primaryNav: true },
  { key: 'strategy-games', title: 'Strategy & Defense Games', navPriority: 1100, primaryNav: true },
  { key: 'simulation-games', title: 'Simulation & Management Games', navPriority: 1090, primaryNav: true },
  { key: 'two-player-games', title: '2 Player Games', navPriority: 1080, primaryNav: false },
  { key: 'io-games', title: '.IO Games', navPriority: 1070, primaryNav: false },
  { key: 'idle-clicker-games', title: 'Idle & Clicker Games', navPriority: 1060, primaryNav: false },
  { key: 'board-card-games', title: 'Board & Card Games', navPriority: 1050, primaryNav: false },
  { key: 'kids-educational-games', title: 'Kids & Educational Games', navPriority: 1040, primaryNav: false },
  { key: 'dress-up-games', title: 'Dress Up & Lifestyle Games', navPriority: 1030, primaryNav: false },
] as const satisfies readonly GameCategoryDefinition[];

export type CanonicalGameCategoryKey =
  (typeof GAME_CATEGORY_TAXONOMY)[number]['key'];

export const GAME_CATEGORY_BY_KEY = new Map(
  GAME_CATEGORY_TAXONOMY.map((category) => [category.key, category])
);

export function isCanonicalGameCategoryKey(
  value: string
): value is CanonicalGameCategoryKey {
  return GAME_CATEGORY_BY_KEY.has(value as CanonicalGameCategoryKey);
}

/**
 * Legacy top-level category -> canonical top-level category.
 *
 * null means the old value is a tag/theme rather than a top-level category and
 * should not be exposed as a canonical category.
 */
export const LEGACY_GAME_CATEGORY_REMAP: Readonly<
  Record<string, CanonicalGameCategoryKey | null>
> = {
  // Earliest legacy databases used short keys before the "-games" convention.
  '3d': null,
  'action': 'action-games',
  'adventure': 'adventure-games',
  'arcade': 'arcade-games',
  'boys': null,
  'car': 'driving-racing-games',
  'clicker': 'idle-clicker-games',
  'girls': 'dress-up-games',
  'hypercasual': 'casual-games',
  'io': 'io-games',
  'kids': 'kids-educational-games',
  'mahjong': 'board-card-games',
  'multiplayer': 'multiplayer-games',
  'puzzle': 'puzzle-games',
  'racing': 'driving-racing-games',
  'soccer': 'sports-games',
  'sports': 'sports-games',
  'stickman': null,
  'strategy': 'strategy-games',
  'two-player': 'two-player-games',

  '3d-games': null,
  'action-games': 'action-games',
  'adventure-games': 'adventure-games',
  'arcade-games': 'arcade-games',
  'boys-games': null,
  'car-games': 'driving-racing-games',
  'clicker-games': 'idle-clicker-games',
  'girls-games': 'dress-up-games',
  'hypercasual-games': 'casual-games',
  'io-games': 'io-games',
  'kids-games': 'kids-educational-games',
  'mahjong-games': 'board-card-games',
  'multiplayer-games': 'multiplayer-games',
  'puzzle-games': 'puzzle-games',
  'racing-games': 'driving-racing-games',
  'soccer-games': 'sports-games',
  'sports-games': 'sports-games',
  'stickman-games': null,
  'strategy-games': 'strategy-games',
  'two-player-games': 'two-player-games',
};

/**
 * Old indexable category URLs that have a clear canonical replacement.
 * Theme/tag-only legacy categories intentionally do not redirect here.
 */
export const LEGACY_CATEGORY_SLUG_REDIRECTS: Readonly<
  Record<string, CanonicalGameCategoryKey>
> = {
  'car-games': 'driving-racing-games',
  'racing-games': 'driving-racing-games',
  'clicker-games': 'idle-clicker-games',
  'girls-games': 'dress-up-games',
  'hypercasual-games': 'casual-games',
  'kids-games': 'kids-educational-games',
  'mahjong-games': 'board-card-games',
  'soccer-games': 'sports-games',
};

export function canonicalizeLegacyCategoryKey(
  value: string
): CanonicalGameCategoryKey | null {
  const normalized = value.trim().toLowerCase();

  if (isCanonicalGameCategoryKey(normalized)) {
    return normalized;
  }

  return LEGACY_GAME_CATEGORY_REMAP[normalized] ?? null;
}
