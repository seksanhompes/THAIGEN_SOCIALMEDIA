// functions/api/events.js
import { authUser } from '../../_lib/auth.js';
import { json, bad } from '../../_lib/utils.js';


export const onRequestPost = async ({ env, request }) => {
  // ต้องล็อกอิน (กัน user_id เป็น null ที่ไปชน NOT NULL)
  const user = await authUser(env, request);
  if (!user) return bad('unauth', 401);

  let body = {};
  try { body = await request.json(); } catch {}
  const post_id   = String(body.post_id || '').trim();
  const session_id = String(body.session_id || '').slice(0, 64);
  const dwell_ms  = Math.max(0, Math.min(600000, Number(body.dwell_ms || 0)));
  if (!post_id || !session_id) return bad('bad request', 400);

  const id = crypto.randomUUID();
  const ts = Date.now();

  // UPSERT: แทนการ INSERT ตรง ๆ เพื่อไม่ชน unique
  await env.DB.prepare(`
    INSERT INTO views (id, post_id, user_id, session_id, dwell_ms, ts)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6)
    ON CONFLICT (post_id, user_id, session_id)
    DO UPDATE SET
      dwell_ms = MAX(views.dwell_ms, excluded.dwell_ms),
      ts       = excluded.ts
  `).bind(id, post_id, user.id, session_id, dwell_ms, ts).run();

  return json({ ok: true });
};
