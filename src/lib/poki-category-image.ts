const CATEGORY_IMAGE_KEYS = new Set([
  '3d',
  'action',
  'adventure',
  'animals',
  'arcade',
  'boy',
  'brain',
  'car',
  'categories',
  'clicker',
  'cooking',
  'cozy',
  'dinosaur',
  'drifting',
  'driving',
  'escape',
  'fighting',
  'flash',
  'girls',
  'gun',
  'idle',
  'mobile',
  'monster-truck',
  'multiplayer',
  'obby',
  'parking',
  'platform',
  'popular',
  'puzzle',
  'racing',
  'running',
  'shooting',
  'simulation',
  'skill',
  'sniper',
  'stickman',
  'survival',
  'truck',
  'two-player',
  'tycoon',
  'typing',
  'war',
  'watermelon',
  'zombie',
]);

const CATEGORY_IMAGE_ALIASES: Record<string, string> = {
  'boys-games': 'boy',
  'car-games': 'car',
  'girls-games': 'girls',
  'io-games': 'multiplayer',
  'kids-games': 'cozy',
  'monster-truck-games': 'monster-truck',
  'two-player-games': 'two-player',
  'racing-games': 'racing',
  'action-games': 'action',
  'arcade-games': 'arcade',
  'puzzle-games': 'puzzle',
  '3d-games': '3d',
  'clicker-games': 'clicker',
  'adventure-games': 'adventure',
  'multiplayer-games': 'multiplayer',
  'stickman-games': 'stickman',
};

function resolveCategoryImageKey(categoryKey: string) {
  if (CATEGORY_IMAGE_KEYS.has(categoryKey)) return categoryKey;
  const alias = CATEGORY_IMAGE_ALIASES[categoryKey];
  if (alias && CATEGORY_IMAGE_KEYS.has(alias)) return alias;
  const stripped = categoryKey.replace(/-games$/, '');
  if (CATEGORY_IMAGE_KEYS.has(stripped)) return stripped;
  return null;
}

export function categoryImage(categoryKey: string) {
  const key = resolveCategoryImageKey(categoryKey);
  return key ? `/poki/categories/${key}.png` : null;
}
