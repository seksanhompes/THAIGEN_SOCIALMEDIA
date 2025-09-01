-- 001_init.sql  (D1 / SQLite)

-- Users & Auth
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  handle        TEXT UNIQUE NOT NULL,  
  display_name  TEXT NOT NULL,
  password_hash BLOB NOT NULL,
  password_salt BLOB NOT NULL,
  kyc_status    TEXT DEFAULT 'none',
  trust_score   REAL DEFAULT 0,
  level         TEXT DEFAULT 'Explorer',
  e_user_base   TEXT DEFAULT NULL,             
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id  TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio      TEXT,
  links    TEXT,     
  badges   TEXT      
);

CREATE TABLE IF NOT EXISTS follows (
  src_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dst_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  UNIQUE (src_id, dst_id)
);

CREATE TABLE IF NOT EXISTS blocks (
  src_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dst_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  UNIQUE (src_id, dst_id)
);

-- Posts & Interactions
CREATE TABLE IF NOT EXISTS posts (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL DEFAULT 'text',   
  text          TEXT,
  media_url     TEXT,
  topic_tags    TEXT,                           
  mood_hint     TEXT,                           
  emotion_json  TEXT,                          
  visibility    TEXT DEFAULT 'public',          
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reactions (
  id         TEXT PRIMARY KEY,
  post_id    TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,                     
  created_at INTEGER NOT NULL,
  UNIQUE (post_id, user_id, type)
);

CREATE TABLE IF NOT EXISTS comments (
  id         TEXT PRIMARY KEY,
  post_id    TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS views (
  id            TEXT PRIMARY KEY,
  post_id       TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id       TEXT,            
  session_id    TEXT,
  dwell_ms      INTEGER DEFAULT 0,
  watched_ratio REAL DEFAULT 0,
  ip            TEXT,
  ua            TEXT,
  ts            INTEGER NOT NULL
);

-- Communities (MVP)
CREATE TABLE IF NOT EXISTS communities (
  id         TEXT PRIMARY KEY,
  name       TEXT UNIQUE NOT NULL,
  rules      TEXT,
  owner_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS community_members (
  comm_id    TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT DEFAULT 'member',
  created_at INTEGER NOT NULL,
  UNIQUE (comm_id, user_id)
);

-- Monetization & Levels
CREATE TABLE IF NOT EXISTS payouts (
  id       TEXT PRIMARY KEY,
  post_id  TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  amount   REAL NOT NULL,
  status   TEXT NOT NULL,  
  ts       INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS levels_history (
  id        TEXT PRIMARY KEY,
  user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  new_level TEXT NOT NULL,
  reason    TEXT,
  ts        INTEGER NOT NULL
);

-- Reports (Trust & Safety)
CREATE TABLE IF NOT EXISTS reports (
  id          TEXT PRIMARY KEY,
  post_id     TEXT,
  reporter_id TEXT,
  reason      TEXT,
  created_at  INTEGER NOT NULL
);
