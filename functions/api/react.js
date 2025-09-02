// functions/api/react.js
import { authUser } from '../_lib/auth.js';
import { json, bad } from '../_lib/utils.js';

async function ensureReactionsSchema(env) {
  // สร้างตาราง/ดัชนีถ้ายังไม่มี (เรียกซ้ำได้ ไม่พัง)
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS reactions (
      id         TEXT PRIMARY KEY,
      post_id    TEXT NOT NULL,
      user_id    TEXT NOT NULL,
      type       TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `).run();

  // กันกดซ้ำชนิดเดียวกันด้วย unique index
  await env.DB.prepare(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_reactions_unique
    ON reactions (post_id, user_id, type);
  `).run();
}

export const onRequestPost = async ({ env, request }) => {
  try {
    const user = await authUser(env, request);
    if (!user || !user.id) return bad('unauth', 401);

    let body = {};
    try { body = await request.json(); } catch {}
    const post_id = String(body?.post_id ?? '').trim();
    let type      = String(body?.type ?? '').trim().toLowerCase();

    // อนุญาตเฉพาะ reaction ที่เรากำหนดไว้
    const ALLOWED = new Set(['like', 'wow', 'sad']);
    if (!post_id || !ALLOWED.has(type)) {
      return bad('missing post_id/type', 400);
    }

    await ensureReactionsSchema(env);

    // manual toggle: มีอยู่แล้ว → ลบ, ถ้ายังไม่มี → เพิ่ม
    const exist = await env.DB.prepare(
      `SELECT id FROM reactions WHERE post_id=? AND user_id=? AND type=?`
    ).bind(post_id, user.id, type).first();

    if (exist?.id) {
      await env.DB.prepare(`DELETE FROM reactions WHERE id=?`)
        .bind(exist.id).run();
      return json({ ok: true, toggled: 'removed' });
    }

    const id = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO reactions (id, post_id, user_id, type, created_at)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(id, post_id, user.id, type, Date.now()).run();

    return json({ ok: true, toggled: 'added' });
  } catch (e) {
    return bad(`react failed: ${e?.message || String(e)}`, 500);
  }
};
