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

// บาง impl ของ authUser อาจคืน {id} / {user_id} / {sub} หรืออยู่ใต้ user
function getUserId(u) {
  return (
    u?.id ?? u?.user_id ?? u?.sub ??
    u?.user?.id ?? u?.user?.user_id ?? u?.user?.sub ?? null
  );
}

const ALLOWED = new Set(['like', 'wow', 'sad']);

export const onRequestPost = async ({ env, request }) => {
  try {
    const u = await authUser(env, request);
    const userId = getUserId(u);
    if (!userId) return bad('unauth', 401);

    let body = {};
    try { body = await request.json(); } catch {}
    const post_id_raw = body?.post_id;
    const type_raw    = body?.type;

    // กัน undefined ตั้งแต่ต้น
    if (post_id_raw == null || type_raw == null) {
      return bad('missing post_id/type', 400);
    }

    // แปลงเป็นสตริง ตัดช่องว่าง
    const post_id = String(post_id_raw).trim();
    const type    = String(type_raw).trim().toLowerCase();

    // validate ค่า
    if (!post_id)               return bad('invalid post_id', 400);
    if (!ALLOWED.has(type))     return bad('invalid type', 400);

    await ensureReactionsSchema(env);

    // toggle: ถ้ามีอยู่แล้ว → ลบ, ถ้าไม่มีก็เพิ่ม
    const existing = await env.DB.prepare(
      `SELECT id FROM reactions WHERE post_id=? AND user_id=? AND type=?`
    ).bind(String(post_id), String(userId), String(type)).first();

    if (existing?.id) {
      await env.DB.prepare(`DELETE FROM reactions WHERE id=?`)
        .bind(String(existing.id)).run();
      return json({ ok: true, toggled: 'removed' });
    }

    const id  = crypto.randomUUID();
    const now = Date.now();

    await env.DB.prepare(
      `INSERT INTO reactions (id, post_id, user_id, type, created_at)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(String(id), String(post_id), String(userId), String(type), Number(now)).run();

    return json({ ok: true, toggled: 'added' });
  } catch (e) {
    // ส่งสาเหตุกลับไปเพื่อดีบัก
    return bad(`react failed: ${e?.message || String(e)}`, 500);
  }
};
