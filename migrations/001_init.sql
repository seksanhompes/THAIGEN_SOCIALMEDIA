CREATE TABLE IF NOT EXISTS users (
);


CREATE TABLE IF NOT EXISTS views (
id TEXT PRIMARY KEY,
post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
user_id TEXT,
session_id TEXT,
dwell_ms INTEGER DEFAULT 0,
watched_ratio REAL DEFAULT 0,
ip TEXT,
ua TEXT,
ts INTEGER NOT NULL
);


-- Communities (MVP minimal)
CREATE TABLE IF NOT EXISTS communities (
id TEXT PRIMARY KEY,
name TEXT UNIQUE NOT NULL,
rules TEXT,
owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
created_at INTEGER NOT NULL
);


CREATE TABLE IF NOT EXISTS community_members (
comm_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
role TEXT DEFAULT 'member',
created_at INTEGER NOT NULL,
UNIQUE (comm_id, user_id)
);


-- Monetization & Levels
CREATE TABLE IF NOT EXISTS payouts (
id TEXT PRIMARY KEY,
post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
amount REAL NOT NULL,
status TEXT NOT NULL, -- pending|approved|paid|rejected
ts INTEGER NOT NULL
);


CREATE TABLE IF NOT EXISTS levels_history (
id TEXT PRIMARY KEY,
user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
new_level TEXT NOT NULL,
reason TEXT,
ts INTEGER NOT NULL
);


-- Reports (Trust & Safety)
CREATE TABLE IF NOT EXISTS reports (
id TEXT PRIMARY KEY,
post_id TEXT,
reporter_id TEXT,
reason TEXT,
created_at INTEGER NOT NULL
);