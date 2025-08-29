// /api/feed  — minimal version (no external imports)
export async function onRequestGet({ env, request }) {
  try {
    // --- auth จากคุกกี้ (เหมือน /api/posts) ---
    const cookie = request.headers.get('cookie') || '';
    const m = /(?:^|;\s*)auth=([^;]+)/.exec(cookie);
    if (!m) return jerr('unauth', 401);

    const me = await verifyHS256(m[1], env.JWT_SECRET).catch(() => null);
    if (!me) return jerr('unauth', 401);

    // --- พารามิเตอร์ limit ---
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '30', 10), 50);

    // --- ดึงฟีดแบบเรียงตามเวลา (ทำงานแน่ ๆ) ---
    const r = await env.DB.prepare(`
      SELECT p.id, p.user_id, p.text, p.mood_hint, p.emotion_json, p.created_at,
             u.handle, u.display_name, u.level
      FROM posts p
      JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at DESC
      LIMIT ?
    `).bind(limit).all();

    return Response.json({ ok: true, feed: r.results || [] });
  } catch (e) {
    // จะเห็นข้อความ error ใน Network → Response
    return jerr(String(e), 500);
  }
}

// ---------- helpers ----------
function jerr(msg, status = 400) {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function verifyHS256(jwt, secret) {
  const enc = new TextEncoder();
  const [h, b, s] = jwt.split('.');
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const ok = await crypto.subtle.verify('HMAC', key, base64urlToBytes(s), enc.encode(`${h}.${b}`));
  if (!ok) throw new Error('bad sig');
  return JSON.parse(atob(b.replace(/-/g, '+').replace(/_/g, '/')));
}
function base64urlToBytes(str) {
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}
