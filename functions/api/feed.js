import { authUser } from '../_lib/auth.js';
import { json, bad } from '../_lib/utils.js';

export const onRequestGet = async ({ env, request }) => {
  const user = await authUser(env, request);
  if (!user) return bad('unauth', 401);

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '30', 10), 50);

  // ดึงฟีดแบบเรียบง่าย: โพสต์ล่าสุด
  const r = await env.DB.prepare(`
    SELECT p.id, p.user_id, p.text, p.mood_hint, p.emotion_json, p.created_at,
           u.handle, u.display_name, u.level
    FROM posts p
    JOIN users u ON u.id = p.user_id
    ORDER BY p.created_at DESC
    LIMIT ?
  `).bind(limit).all();

  return json({ ok: true, feed: r.results || [] });
};
