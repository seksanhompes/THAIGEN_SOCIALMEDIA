// Minimal JWT HS256 using WebCrypto
const enc = new TextEncoder();


function b64url(buf) {
return btoa(String.fromCharCode(...new Uint8Array(buf)))
.replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
}


export async function signJWT(payload, secret, expSec=86400*7) {
const header = { alg: 'HS256', typ: 'JWT' };
const body = { ...payload, exp: Math.floor(Date.now()/1000)+expSec };
const head = b64url(enc.encode(JSON.stringify(header)));
const bod = b64url(enc.encode(JSON.stringify(body)));
const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${head}.${bod}`));
return `${head}.${bod}.${b64url(sig)}`;
}


export async function verifyJWT(token, secret) {
const [h,b,s] = token.split('.');
if(!h||!b||!s) return null;
const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['verify']);
const ok = await crypto.subtle.verify('HMAC', key, Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')), c=>c.charCodeAt(0)), enc.encode(`${h}.${b}`));
if(!ok) return null;
const body = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b.replaceAll('-','+').replaceAll('_','/')), c=>c.charCodeAt(0))));
if(body.exp && body.exp < Math.floor(Date.now()/1000)) return null;
return body;
}