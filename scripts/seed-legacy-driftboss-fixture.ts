import postgres from 'postgres';

const url =
  process.env.LEGACY_DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/legacy_game_cms';

const sql = postgres(url, { prepare: false, max: 1, idle_timeout: 5 });

try {
  await sql.unsafe(`
    DROP TABLE IF EXISTS social_links CASCADE;
    DROP TABLE IF EXISTS blogs CASCADE;
    DROP TABLE IF EXISTS seo_categories CASCADE;
    DROP TABLE IF EXISTS seo_games CASCADE;
    DROP TABLE IF EXISTS game_sites CASCADE;
    DROP TABLE IF EXISTS game_categories CASCADE;
    DROP TABLE IF EXISTS categories CASCADE;
    DROP TABLE IF EXISTS games CASCADE;

    CREATE TABLE games (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      image TEXT,
      game_key TEXT NOT NULL UNIQUE,
      description TEXT,
      view INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE categories (
      id BIGSERIAL PRIMARY KEY,
      category TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      title TEXT
    );

    CREATE TABLE game_categories (
      id BIGSERIAL PRIMARY KEY,
      game_key TEXT NOT NULL,
      category TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(game_key, category)
    );

    CREATE TABLE game_sites (
      id BIGSERIAL PRIMARY KEY,
      domain TEXT NOT NULL UNIQUE,
      meta_title TEXT,
      meta_desc TEXT,
      seo_content TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      site_name TEXT,
      about_us TEXT,
      contact_us TEXT,
      privacy_policy TEXT,
      terms_of_service TEXT,
      favicon_url TEXT,
      logo_url TEXT
    );

    CREATE TABLE seo_games (
      id BIGSERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      domain TEXT NOT NULL,
      game_key TEXT NOT NULL,
      locale TEXT DEFAULT 'en',
      slug TEXT,
      title TEXT,
      meta_title TEXT,
      meta_desc TEXT,
      seo_content TEXT,
      UNIQUE(domain, game_key, locale)
    );

    CREATE TABLE seo_categories (
      id BIGSERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      domain TEXT NOT NULL,
      category TEXT NOT NULL,
      locale TEXT DEFAULT 'en',
      slug TEXT,
      title TEXT,
      meta_title TEXT,
      meta_desc TEXT,
      seo_content TEXT,
      UNIQUE(domain, category, locale)
    );

    CREATE TABLE blogs (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      content TEXT NOT NULL,
      summary TEXT,
      cover_image TEXT,
      meta_title TEXT,
      meta_description TEXT,
      published BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      domain TEXT,
      locale TEXT DEFAULT 'en',
      UNIQUE(domain, slug, locale)
    );

    CREATE TABLE social_links (
      id BIGSERIAL PRIMARY KEY,
      domain TEXT NOT NULL,
      display_name TEXT NOT NULL,
      url TEXT NOT NULL,
      UNIQUE(domain, display_name)
    );

    INSERT INTO games (title, url, image, game_key, description, view) VALUES
      ('Drift Boss', 'https://cdn.example/drift-boss/', 'https://cdn.example/drift.jpg', 'drift-boss', 'Global Drift Boss description', 42),
      ('Klotski', 'https://cdn.example/klotski/', 'https://cdn.example/klotski.jpg', 'klotski', 'Global Klotski description', 12);

    INSERT INTO categories (category, title, description) VALUES
      ('racing', 'Racing Games', 'Racing category'),
      ('puzzle', 'Puzzle Games', 'Puzzle category');

    INSERT INTO game_categories (game_key, category) VALUES
      ('drift-boss', 'racing'),
      ('klotski', 'puzzle');

    INSERT INTO game_sites (
      domain, site_name, meta_title, meta_desc, seo_content,
      about_us, contact_us, privacy_policy, terms_of_service,
      logo_url, favicon_url
    ) VALUES
      (
        'driftbossgame.org', 'Drift Boss Game', 'Drift Boss Meta A',
        'Drift Boss homepage A', 'Unique homepage content A',
        'About Drift A', 'Contact Drift A', 'Privacy Drift A', 'Terms Drift A',
        'https://cdn.example/drift-logo.png', 'https://cdn.example/drift.ico'
      ),
      (
        'anotherdrift.example', 'Another Drift Site', 'Drift Boss Meta B',
        'Drift Boss homepage B', 'Unique homepage content B',
        'About Drift B', 'Contact Drift B', 'Privacy Drift B', 'Terms Drift B',
        null, null
      );

    INSERT INTO seo_games (
      domain, game_key, locale, slug, title, meta_title, meta_desc, seo_content
    ) VALUES
      (
        'driftbossgame.org', 'drift-boss', 'en', 'drift-boss', 'Drift Boss',
        'Play Drift Boss A', 'Site A game meta', 'Site A unique Drift Boss body'
      ),
      (
        'anotherdrift.example', 'drift-boss', 'en', 'drift-boss-online', 'Drift Boss Online',
        'Play Drift Boss B', 'Site B game meta', 'Site B unique Drift Boss body'
      );

    INSERT INTO seo_categories (
      domain, category, locale, slug, title, meta_title, meta_desc, seo_content
    ) VALUES
      (
        'driftbossgame.org', 'racing', 'en', 'racing-games', 'Racing Games',
        'Racing Games A', 'Site A category meta', 'Site A racing body'
      );

    INSERT INTO blogs (
      title, slug, content, summary, meta_title, meta_description, domain, locale
    ) VALUES
      (
        'How to Drift', 'how-to-drift', '# How to Drift\nSite A guide-like article.',
        'Learn to drift.', 'How to Drift', 'Drifting guide', 'driftbossgame.org', 'en'
      );

    INSERT INTO social_links (domain, display_name, url) VALUES
      ('driftbossgame.org', 'YouTube', 'https://youtube.com/example'),
      ('driftbossgame.org', 'X', 'https://x.com/example');
  `);

  console.log('Legacy DriftBoss migration fixture seeded.');
} finally {
  await sql.end();
}
