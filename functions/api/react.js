// functions/api/react.js
import { authUser } from '../_lib/auth.js';
import { json, bad } from '../_lib/utils.js';

async function ensureReactionsSchema(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS reactions (
      id         TEXT PRIMARY KEY,
      post_id    TEXT NOT NULL,
      user_id    TEXT NOT NULL,
      type       TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `).run();

  await env.DB.prepare(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_reactions_unique
    ON reactions (post_id, user_id, type);
  `).run();
}

const ALLOWED = new Set(['like', 'wow', 'sad']);

export const onRequestPost = async ({ env, request }) => {
  try {
    const user = await authUser(env, request);
    if (!user?.id) return bad('unauth', 401);

    // ---- parse & validate body ----
    let body = {};
    try { body = await request.json(); } catch {}
    const post_id_raw = body?.post_id;
    const type_raw    = body?.type;

    if (post_id_raw == null || type_raw == null)
      return bad('missing post_id/type', 400);

    const post_id = String(post_id_raw).trim();
    const type    = String(type_raw).trim().toLowerCase();

    if (!post_id)                return bad('invalid post_id', 400);
    if (!ALLOWED.has(type))      return bad('invalid type', 400);

    await ensureReactionsSchema(env);

    // ---- toggle behavior ----
    const existing = await env.DB.prepare(
      `SELECT id FROM reactions WHERE post_id=? AND user_id=? AND type=?`
    ).bind(post_id, String(user.id), type).first();

    if (existing?.id) {
      await env.DB.prepare(`DELETE FROM reactions WHERE id=?`)
        .bind(existing.id).run();
      return json({ ok: true, toggled: 'removed' });
    }

    const id = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO reactions (id, post_id, user_id, type, created_at)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(id, post_id, String(user.id), type, Date.now()).run();

    return json({ ok: true, toggled: 'added' });
  } catch (e) {
    return bad(`react failed: ${e?.message || String(e)}`, 500);
  }
};
