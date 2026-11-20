CREATE TABLE IF NOT EXISTS visitor_likes (
  slug TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  PRIMARY KEY (slug, visitor_id)
);

CREATE TABLE IF NOT EXISTS visitor_comments (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (slug, visitor_id, request_id)
);
CREATE INDEX IF NOT EXISTS visitor_comments_listing ON visitor_comments (slug, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS visitor_comment_limits (
  comment_id TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS visitor_limits_visitor ON visitor_comment_limits (visitor_id, created_at);
CREATE INDEX IF NOT EXISTS visitor_limits_ip ON visitor_comment_limits (ip_hash, created_at);
CREATE INDEX IF NOT EXISTS visitor_limits_expiry ON visitor_comment_limits (created_at);
