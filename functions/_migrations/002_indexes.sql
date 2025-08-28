CREATE INDEX IF NOT EXISTS idx_users_handle ON users(handle);
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reactions_post ON reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_views_post_ts ON views(post_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_follows_src ON follows(src_id);
CREATE INDEX IF NOT EXISTS idx_follows_dst ON follows(dst_id);