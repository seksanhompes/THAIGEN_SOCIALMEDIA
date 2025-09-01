export async function onRequestPost() {
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'content-type': 'application/json',
      'Set-Cookie': 'auth=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'
    }
  });
}
