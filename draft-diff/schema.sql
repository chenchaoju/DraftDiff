-- DraftDiff 数据库 Schema
-- 在 Cloudflare D1 中执行：npx wrangler d1 execute draft-diff-db --file=./schema.sql

DROP TABLE IF EXISTS articles;
CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT DEFAULT '',
  category TEXT DEFAULT '未分类',
  tags TEXT DEFAULT '[]',
  word_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_compared_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);

-- 用于保存对比历史
DROP TABLE IF EXISTS comparisons;
CREATE TABLE IF NOT EXISTS comparisons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref_article_id INTEGER,
  target_title TEXT NOT NULL,
  target_content TEXT NOT NULL,
  result_summary TEXT,
  mode TEXT DEFAULT 'sentence',
  similarity REAL DEFAULT 0,
  added_count INTEGER DEFAULT 0,
  removed_count INTEGER DEFAULT 0,
  modified_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (ref_article_id) REFERENCES articles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_comparisons_created_at ON comparisons(created_at DESC);
