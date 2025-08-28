import { authUser } from '../_lib/auth.js';
import { json, bad } from '../_lib/utils.js';
import { cosSim } from '../_lib/emo.js';

function sigmoid(x){ return 1/(1+Math.exp(-x)); }
function clamp(x,a,b){ return Math.max(a, Math.min(b,x)); }

async function getUserVectors(env, user){
  // สร้างโปรไฟล์อารมณ์ตอนนี้จากโพสต์ที่ผู้ใช้เพิ่งดู
  const rows = await env.DB.prepare(`
    SELECT p.emotion_json
    FROM posts p
    JOIN views v ON p.id = v.post_id
    WHERE v.user_id = ?
    ORDER BY v.ts DESC
    LIMIT 100
  `).bind(user.id).all();

  let acc = new Array(8).fill(0);
  let w = 1, wsum = 0;
  for (const r of rows.results) {
    const e = JSON.parse(r.emotion_json || '[]');
    for (let i = 0; i < 8; i++) acc[i] += (e[i] || 0) * w;
    w *= 0.97; wsum += w;
  }
  const nowv = acc.map(x => x / (wsum || 1));

  const ur = await env.DB
    .prepare(`SELECT e_user_base FROM users WHERE id=?`)
    .bind(user.id).first();
  const base = ur?.e_user_base ? JSON.parse(ur.e_user_base) : null;

  return { nowv, base };
}

async function quality(env, postId){
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
}

async function social(env, postId, user){
  const s = await env.DB.prepare(`
    SELECT u.id AS author,
      (SELECT COUNT(*) FROM follows f WHERE f.src_id = ? AND f.dst_id = u.id) AS you_follow
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.id = ?
  `).bind(user.id, postId).first();
  return (s?.you_follow ? 1 : 0) * 0.7; // MVP: ถ้าตามผู้เขียน → บวกน้ำหนัก
}

async function trend(env, postId){
  const now = Date.now();
  const v10 = await env.DB.prepare(`SELECT COUNT(*) AS c FROM views WHERE post_id=? AND ts>?`)
                .bind(postId, now - 10*60*1000).first();
  const v24 = await env.DB.prepare(`SELECT COUNT(*) AS c FROM views WHERE post_id=? AND ts>?`)
                .bind(postId, now - 24*60*60*1000).first();

  const perMinBase = (v24?.c || 0) / (24*60) + 0.1;
  const cur = (v10?.c || 0) / 10;
  const ratio = cur / perMinBase;
  return clamp(sigmoid(0.5 * ratio), 0, 1);
}

export const onRequestGet = async ({ env, request }) => {
  const user = await authUser(env, request);
  if(!user) return bad('unauth', 401);

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '30', 10), 50);

  // recall: โพสต์ใหม่ภายใน 48 ชม.
  const posts = await env.DB.prepare(`
    SELECT p.*, u.handle, u.display_name
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.created_at > ?
    ORDER BY p.created_at DESC
    LIMIT 300
  `).bind(Date.now() - 48*60*60*1000).all();

  const { nowv, base } = await getUserVectors(env, user);
  const pref = base || new Array(8).fill(1/8);
  const userMix = new Array(8).fill(0).map((_, i) =>
    0.5*(nowv[i] || 0) + 0.3*(base?.[i] || 0) + 0.2*(pref?.[i] || 0)
  );

  const scored = [];
  for (const p of posts.results) {
    const e = JSON.parse(p.emotion_json || '[]');
    const moodMatch = cosSim(e, userMix);
    const q = await quality(env, p.id);
    const s = await social(env, p.id, user);
    const t = await trend(env, p.id);

    const score = 0.35*moodMatch + 0.25*q + 0.20*s + 0.15*t;
    scored.push({ ...p, _score: score });
  }

  scored.sort((a,b)=> b._score - a._score);
  return json({ ok:true, feed: scored.slice(0, limit) });
};
