export async function onRequestGet({ request, env }) {
  const cookie = request.headers.get('cookie') || '';
  const m = /(?:^|;\s*)auth=([^;]+)/.exec(cookie);
  if (!m) return new Response('Unauthorized', { status: 401 });

  const token = m[1];
  try {
    const payload = await verifyHS256(token, env.JWT_SECRET);
    return Response.json({ user: { id: payload.id, email: payload.email, handle: payload.handle } });
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }
}

async function verifyHS256(jwt, secret) {
  const enc = new TextEncoder();
  const [h, b, s] = jwt.split('.');
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('HMAC', key, base64urlToBytes(s), enc.encode(`${h}.${b}`));
  if (!ok) throw new Error('bad sig');
  return JSON.parse(atob(b.replace(/-/g,'+').replace(/_/g,'/')));
}
function base64urlToBytes(str){ const bin=atob(str.replace(/-/g,'+').replace(/_/g,'/')); return Uint8Array.from(bin, c=>c.charCodeAt(0)); }
