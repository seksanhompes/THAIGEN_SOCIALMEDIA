export const json = (data, init={}) => new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', ...init.headers } });
export const now = () => Date.now();
export const tsSec = () => Math.floor(Date.now()/1000);


// ULID-lite (lexicographic, no dep)
export function uid() {
const b = new Uint8Array(16);
crypto.getRandomValues(b);
return [...b].map(x=>x.toString(16).padStart(2,'0')).join('');
}


export function parseJSONSafe(s, fallback=null) {
try { return JSON.parse(s); } catch { return fallback; }
}


export const bad = (msg, code=400) => new Response(JSON.stringify({ ok:false, error: msg }), { status: code, headers: { 'content-type': 'application/json' }});


export function getClientIP(req) {
return req.headers.get('CF-Connecting-IP') || req.headers.get('x-forwarded-for') || '';
}
export function getUA(req) { return req.headers.get('user-agent') || ''; }


export function setCookie(name, value, days=7) {
const expires = new Date(Date.now()+days*864e5).toUTCString();
return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expires}`;
}
export function delCookie(name){ return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`; }