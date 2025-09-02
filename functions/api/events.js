// functions/api/events.js
import { authUser } from '../_lib/auth.js';
import { json, bad } from '../_lib/utils.js';

async function ensureViewsSchema(env) {
  // สร้างตาราง/ดัชนีถ้ายังไม่มี (id PK, และ index สำหรับ query)
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

  await env.DB.prepare(
    `CREATE INDEX IF NOT EXISTS idx_views_post_user_sess
     ON views(post_id, user_id, session_id);`
  ).run();

  await env.DB.prepare(
    `CREATE INDEX IF NOT EXISTS idx_views_ts ON views(ts);`
  ).run();
}

export const onRequestPost = async ({ env, request }) => {
  try {
    // ต้องล็อกอิน (กัน user_id เป็น NULL ไปชน NOT NULL)
    const user = await authUser(env, request);
    if (!user || !user.id) return bad('unauth', 401);

    // รับข้อมูลอย่างปลอดภัย
    let body = {};
    try { body = await request.json(); } catch {}
    const post_id    = String(body?.post_id ?? '').trim();
    const session_id = String(body?.session_id ?? '').slice(0, 64);
    let   dwell_ms   = Number(body?.dwell_ms ?? 0);

    if (!post_id || !session_id) return bad('bad request', 400);
    if (!Number.isFinite(dwell_ms)) dwell_ms = 0;
    dwell_ms = Math.max(0, Math.min(600000, Math.floor(dwell_ms)));

    await ensureViewsSchema(env);

    const now = Date.now();

    // manual upsert: ถ้ามีแถวเก่า → UPDATE; ถ้าไม่มีก็ INSERT
    const existing = await env.DB.prepare(
      `SELECT id, dwell_ms FROM views
       WHERE post_id=? AND user_id=? AND session_id=?`
    ).bind(post_id, user.id, session_id).first();

    if (existing?.id) {
      const newDwell = Math.max(Number(existing.dwell_ms || 0), dwell_ms);
      await env.DB.prepare(
        `UPDATE views SET dwell_ms=?, ts=? WHERE id=?`
      ).bind(newDwell, now, existing.id).run();
    } else {
      const id = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO views (id, post_id, user_id, session_id, dwell_ms, ts)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(id, post_id, user.id, session_id, dwell_ms, now).run();
    }

    return json({ ok: true });
  } catch (e) {
    // ส่งข้อความอ่านง่ายกลับไปเพื่อดีบัก log
    return bad(`events failed: ${e?.message || String(e)}`, 500);
  }
};
