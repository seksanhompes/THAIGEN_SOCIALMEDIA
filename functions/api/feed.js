import { authUser } from '../_lib/auth.js';
import { json, bad } from '../_lib/utils.js';
import { cosSim } from '../_lib/emo.js';

function safeJSON(s, fb=[]) { try { return JSON.parse(s ?? ''); } catch { return fb; } }

export const onRequestGet = async ({ env, request }) => {
  try {
    const user = await authUser(env, request);
    if (!user) return bad('unauth', 401);

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit')||'30',10), 50);

    // ดึงโพสต์ช่วง 48 ชม.
    const sinceMs  = Date.now() - 48*60*60*1000;
    const sinceSec = Math.floor(sinceMs/1000);
    const posts = await env.DB.prepare(`
      SELECT p.id, p.user_id, p.text, p.mood_hint, p.emotion_json, p.created_at,
             u.handle, u.display_name, u.level
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.created_at > ? OR p.created_at > ?
      ORDER BY p.created_at DESC
      LIMIT 300
    `).bind(sinceSec, sinceMs).all();

    // ทำคะแนนแบบง่ายก่อน (กันพัง)
    const out = (posts.results || []).map(p => ({
      ...p,
      _score: 1.0,                         // placeholder score
      emotion_json: safeJSON(p.emotion_json, [])
    }));

    return json({ ok:true, feed: out.slice(0, limit) });
  } catch (e) {
    console.error('FEED_ERROR', e);
    // ส่งข้อความ error กลับมาเพื่อดูใน Network → Response
    return new Response(JSON.stringify({ ok:false, error:String(e) }), {
      status: 500, headers: { 'content-type':'application/json' }
    });
  }
};
