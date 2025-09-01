export async function onRequestPost({ request, env }) {
  try {
    // อ่านคุกกี้ auth แล้วถอด JWT
    const m = /(?:^|;\s*)auth=([^;]+)/.exec(request.headers.get('cookie') || '');
    if (!m) return jerr('Unauthorized', 401);
    const me = await verifyHS256(m[1], env.JWT_SECRET).catch(() => null);
    if (!me) return jerr('Unauthorized', 401);

    const { text = '', mood_hint = null } = await request.json().catch(() => ({}));
    const bodyText = String(text).trim();
    if (!bodyText) return jerr('ใส่ข้อความก่อนโพสต์', 400);

    const id = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO posts (id, user_id, text, mood_hint, created_at)
       VALUES (?, ?, ?, ?, CAST(unixepoch()*1000 AS INTEGER))`
    ).bind(id, me.id, bodyText, mood_hint || null).run();

    return Response.json({ ok: true, post: { id } });
  } catch (e) {
    console.error('POSTS_ERROR', e);
    return jerr(String(e), 500);
  }
}
function jerr(msg, status=400){
  return new Response(JSON.stringify({ ok:false, error: msg }),
    { status, headers: { 'content-type':'application/json' } });
}
async function verifyHS256(jwt, secret){
  const enc = new TextEncoder();
  const [h,b,s] = jwt.split('.');
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('HMAC', key, base64urlToBytes(s), enc.encode(`${h}.${b}`));
  if (!ok) throw new Error('bad sig');
  return JSON.parse(atob(b.replace(/-/g,'+').replace(/_/g,'/')));
}
function base64urlToBytes(str){ const bin=atob(str.replace(/-/g,'+').replace(/_/g,'/')); return Uint8Array.from(bin,c=>c.charCodeAt(0)); }
