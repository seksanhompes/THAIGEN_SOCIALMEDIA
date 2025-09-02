import { authUser } from '../_lib/auth.js';
import { json, bad } from '../_lib/utils.js';

async function ensureViewsSchema(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS views (
      id         TEXT PRIMARY KEY,
      post_id    TEXT NOT NULL,
      user_id    TEXT NOT NULL,
      session_id TEXT,
      dwell_ms   INTEGER NOT NULL DEFAULT 0,
      ts         INTEGER NOT NULL
    );
  `).run();
  await env.DB.prepare(`
    CREATE INDEX IF NOT EXISTS idx_views_post_user_sess
    ON views(post_id, user_id, session_id);
  `).run();
  await env.DB.prepare(`
    CREATE INDEX IF NOT EXISTS idx_views_ts ON views(ts);
  `).run();
}

function getUserId(u) {
  return (
    u?.id ?? u?.user_id ?? u?.sub ??
    u?.user?.id ?? u?.user?.user_id ?? u?.user?.sub ?? null
  );
}

export const onRequestPost = async ({ env, request }) => {
  try {
    const u = await authUser(env, request);
    const userId = getUserId(u);
    if (!userId) return bad('unauth', 401);

    let body = {};
    try { body = await request.json(); } catch {}

    const post_id_raw    = body?.post_id;
    const session_id_raw = body?.session_id;
    let   dwell_ms       = Number(body?.dwell_ms ?? 0);

    if (post_id_raw == null || session_id_raw == null)
      return bad('bad request', 400);

    const post_id    = String(post_id_raw).trim();
    const session_id = String(session_id_raw).slice(0, 64);

    if (!Number.isFinite(dwell_ms)) dwell_ms = 0;
    dwell_ms = Math.max(0, Math.min(600000, Math.floor(dwell_ms)));

    await ensureViewsSchema(env);

    const now = Date.now();
    const ex = await env.DB.prepare(
      `SELECT id, dwell_ms FROM views WHERE post_id=? AND user_id=? AND session_id=?`
    ).bind(String(post_id), String(userId), String(session_id)).first();

    if (ex?.id) {
      const newDwell = Math.max(Number(ex.dwell_ms || 0), dwell_ms);
      await env.DB.prepare(
        `UPDATE views SET dwell_ms=?, ts=? WHERE id=?`
      ).bind(Number(newDwell), Number(now), String(ex.id)).run();
    } else {
      const id = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO views (id, post_id, user_id, session_id, dwell_ms, ts)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(String(id), String(post_id), String(userId), String(session_id), Number(dwell_ms), Number(now)).run();
    }

    return json({ ok: true });
  } catch (e) {
    return bad(`events failed: ${e?.message || String(e)}`, 500);
  }
};
