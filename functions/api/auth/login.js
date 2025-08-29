export async function onRequestPost({ request, env }) {
  const { email, password } = await request.json();

  // หา user ตามอีเมล (ปรับ verify รหัสผ่านให้เข้ากับของคุณ)
  const u = await env.DB.prepare(
    'SELECT id, email, handle, password_hash, password_salt FROM users WHERE lower(email)=lower(?)'
  ).bind(email).first();

  if (!u) return new Response('Unauthorized', { status: 401 });

  // TODO: แทนที่ด้วยการตรวจรหัสผ่านจริงของคุณ
  const ok = password && password.length >= 4;
  if (!ok) return new Response('Unauthorized', { status: 401 });

  const payload = { id: u.id, email: u.email, handle: u.handle };
  const token = await signHS256(payload, env.JWT_SECRET);

  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'content-type': 'application/json',
      'Set-Cookie': `auth=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
    }
  });
}

async function signHS256(payload, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
  const body   = btoa(JSON.stringify(payload)).replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
  const data = `${header}.${body}`;
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf))).replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
  return `${data}.${sig}`;
}
