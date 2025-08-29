import { authUser } from '../_lib/auth.js';
import { json, bad } from '../_lib/utils.js';
import { cosSim } from '../_lib/emo.js';

function sigmoid(x){ return 1/(1+Math.exp(-x)); }
function clamp(x,a,b){ return Math.max(a, Math.min(b,x)); }

// ---------- helpers ----------
function safeParseJSON(s, fallback = []) {
  try { return JSON.parse(s ?? ''); } catch { return fallback; }
}
function isNoSuchTable(err) {
  return /no such table/i.test(String(err));
}

async function getUserVectors(env, user){
  // โปรไฟล์อารมณ์ล่าสุดจากโพสต์ที่ผู้ใช้ “เพิ่งดู”
  let rows = [];
  try {
    const r = await env.DB.prepare(`
      SELECT p.emotion_json
      FROM posts p
      JOIN views v ON p.id = v.post_id
      WHERE v.user_id = ?
      ORDER BY v.ts DESC
      LIMIT 100
    `).bind(user.id).all();
    rows = r.results || [];
  } catch (e) {
    if (!isNoSuchTable(e)) throw e;
    rows = []; // ถ้าไม่มีตาราง views ก็ใช้ว่าง ๆ ไป
  }

  const acc = new Array(8).fill(0);
  let w = 1, wsum = 0;
  for (const r of rows) {
    const e = safeParseJSON(r.emotion_json, []);
    for (let i = 0; i < 8; i++) acc[i] += (e[i] || 0) * w;
    w *= 0.97; wsum += w;
  }
  const nowv = acc.map(x => x / (wsum || 1));

  const ur = await env.DB
    .prepare(`SELECT e_user_base FROM users WHERE id=?`)
    .bind(user.id).first();
  const base = ur?.e_user_base ? safeParseJSON(ur.e_user_base, null) : null;

  return { nowv, base };
}

async function quality(env, postId){
  try {
    const r = await env.DB.prepare(`
      SELECT
        AVG(CASE WHEN dwell_ms > 800 THEN 1.0 ELSE 0 END) AS watch_ok,
        (SELECT COUNT(*) FROM reactions WHERE post_id = ?) AS reacts,
        (SELECT COUNT(*) FROM comments  WHERE post_id = ?) AS comms
      FROM views WHERE post_id = ?
    `).bind(postId, postId, postId).first();

    const q = 0.5*(r?.watch_ok || 0)
            + 0.3*sigmoid((r?.reacts || 0) / 10)
            + 0.2*sigmoid((r?.comms  || 0) / 5);
    return clamp(q, 0, 1);
  } catch (e) {
    if (!isNoSuchTable(e)) console.error('quality()', e);
    return 0; // ไม่มีตาราง -> ให้เป็น 0
  }
}

async function social(env, postId, user){
  try {
    const s = await env.DB.prepare(`
      SELECT u.id AS author,
        (SELECT COUNT(*) FROM follows f WHERE f.src_id = ? AND f.dst_id = u.id) AS you_follow
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).bind(user.id, postId).first();
    return (s?.you_follow ? 1 : 0) * 0.7;
  } catch (e) {
    if (!isNoSuchTable(e)) console.error('social()', e);
    return 0;
  }
}

async function trend(env, postId){
  try {
    const now = Date.now();
    const v10 = await env.DB.prepare(
      `SELECT COUNT(*) AS c FROM views WHERE post_id=? AND ts>?`
    ).bind(postId, now - 10*60*1000).first();
    const v24 = await env.DB.prepare(
      `SELECT COUNT(*) AS c FROM views WHERE post_id=? AND ts>?`
    ).bind(postId, now - 24*60*60*1000).first();

    const perMinBase = (v24?.c || 0) / (24*60) + 0.1;
    const cur = (v10?.c || 0) / 10;
    const ratio = cur / perMinBase;
    return clamp(sigmoid(0.5 * ratio), 0, 1);
  } catch (e) {
    if (!isNoSuchTable(e)) console.error('trend()', e);
    return 0;
  }
}

export const onRequestGet = async ({ env, request }) => {
  const user = await authUser(env, request);
  if (!user) return bad('unauth', 401);

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '30', 10), 50);

  // หน่วยเวลา: เผื่อไว้ทั้ง s และ ms
  const sinceMs  = Date.now() - 48*60*60*1000;
  const sinceSec = Math.floor(sinceMs / 1000);

  // recall: 48 ชม.ล่าสุด (รองรับ created_at เป็น s หรือ ms)
  const posts = await env.DB.prepare(`
    SELECT p.id, p.user_id, p.text, p.mood_hint, p.emotion_json, p.created_at,
           u.handle, u.display_name, u.level
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.created_at > ? OR p.created_at > ?
    ORDER BY p.created_at DESC
    LIMIT 300
  `).bind(sinceSec, sinceMs).all();

  const { nowv, base } = await getUserVectors(env, user);
  const pref = base || new Array(8).fill(1/8);
  const userMix = new Array(8).fill(0).map((_, i) =>
    0.5*(nowv[i] || 0) + 0.3*(base?.[i] || 0) + 0.2*(pref?.[i] || 0)
  );

  const scored = [];
  for (const p of (posts.results || [])) {
    const e = safeParseJSON(p.emotion_json, []);
    const moodMatch = cosSim(e, userMix);

    const [q, s, t] = await Promise.all([
      quality(env, p.id),
      social(env, p.id, user),
      trend(env, p.id),
    ]);

    const score = 0.35*moodMatch + 0.25*q + 0.20*s + 0.15*t;
    scored.push({ ...p, _score: score });
  }

  scored.sort((a,b)=> b._score - a._score);
  return json({ ok:true, feed: scored.slice(0, limit) });
};
