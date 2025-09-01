-- 002_indexes.sql  (D1 / SQLite)

-- USERS
CREATE INDEX IF NOT EXISTS idx_users_email   ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_handle  ON users(handle);
CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at);

-- FOLLOWS / BLOCKS
CREATE INDEX IF NOT EXISTS idx_follows_src ON follows(src_id);
CREATE INDEX IF NOT EXISTS idx_follows_dst ON follows(dst_id);
CREATE INDEX IF NOT EXISTS idx_blocks_src  ON blocks(src_id);
CREATE INDEX IF NOT EXISTS idx_blocks_dst  ON blocks(dst_id);

-- POSTS
CREATE INDEX IF NOT EXISTS idx_posts_user       ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created    ON posts(created_at);
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);
CREATE INDEX IF NOT EXISTS idx_posts_mood       ON posts(mood_hint);

-- REACTIONS
CREATE INDEX IF NOT EXISTS idx_reactions_post ON reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user ON reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_type ON reactions(type);

-- COMMENTS
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);

-- VIEWS (สำคัญต่อฟีด/ทรนด์)
CREATE INDEX IF NOT EXISTS idx_views_post_ts    ON views(post_id, ts);
CREATE INDEX IF NOT EXISTS idx_views_user_ts    ON views(user_id, ts);
CREATE INDEX IF NOT EXISTS idx_views_session_ts ON views(session_id, ts);

-- COMMUNITIES
CREATE INDEX IF NOT EXISTS idx_communities_name   ON communities(name);
CREATE INDEX IF NOT EXISTS idx_comm_members_comm  ON community_members(comm_id);
CREATE INDEX IF NOT EXISTS idx_comm_members_user  ON community_members(user_id);

-- PAYOUTS / LEVELS HISTORY
CREATE INDEX IF NOT EXISTS idx_payouts_post   ON payouts(post_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_ts     ON payouts(ts);
CREATE INDEX IF NOT EXISTS idx_levels_user    ON levels_history(user_id);
CREATE INDEX IF NOT EXISTS idx_levels_ts      ON levels_history(ts);

-- REPORTS
CREATE INDEX IF NOT EXISTS idx_reports_post     ON reports(post_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_ts       ON reports(created_at);
