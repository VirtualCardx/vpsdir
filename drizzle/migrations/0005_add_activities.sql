-- Activity categories table
CREATE TABLE IF NOT EXISTS activity_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Activities table
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES activity_categories(id),
  slug TEXT NOT NULL UNIQUE,
  published_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_featured BOOLEAN NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT 1,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create indexes for activities
CREATE INDEX IF NOT EXISTS activities_published_idx ON activities(published_at);
CREATE INDEX IF NOT EXISTS activities_category_idx ON activities(category_id);
CREATE INDEX IF NOT EXISTS activities_featured_idx ON activities(is_featured);
CREATE INDEX IF NOT EXISTS activities_active_idx ON activities(is_active);

-- Activities content table
CREATE TABLE IF NOT EXISTS activities_content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  lang TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  content TEXT,
  meta_title TEXT,
  meta_desc TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(activity_id, lang)
);

-- Insert default activity categories
INSERT OR IGNORE INTO activity_categories (id, slug, icon, sort_order) VALUES
  (1, 'news', '📰', 1),
  (2, 'events', '🎉', 2),
  (3, 'updates', '🚀', 3),
  (4, 'announcements', '📢', 4);