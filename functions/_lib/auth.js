import { bad, setCookie, delCookie } from './utils.js';
import { signJWT, verifyJWT } from './jwt.js';


const te = new TextEncoder();


export async function hashPassword(password, salt) {
const key = await crypto.subtle.importKey('raw', te.encode(password), 'PBKDF2', false, ['deriveBits']);
const bits = await crypto.subtle.deriveBits({ name:'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' }, key, 256);
return new Uint8Array(bits);
}


export async function createUser(db, { email, handle, display_name, password }) {
const salt = crypto.getRandomValues(new Uint8Array(16));
const ph = await hashPassword(password, salt);
const id = crypto.randomUUID();
const created_at = Date.now();
await db.prepare(`INSERT INTO users (id,email,handle,display_name,password_hash,password_salt,created_at) VALUES (?,?,?,?,?,?,?)`)
.bind(id, email.toLowerCase(), handle.toLowerCase(), display_name, ph, salt, created_at).run();
await db.prepare(`INSERT INTO profiles (user_id,bio,links,badges) VALUES (?,?,?,?)`).bind(id, '', '[]', '[]').run();
return { id, email, handle: handle.toLowerCase(), display_name };
}


export async function loginUser(db, { email, password }) {
const row = await db.prepare(`SELECT * FROM users WHERE email=?`).bind(email.toLowerCase()).first();
if(!row) return null;
const salt = row.password_salt; // Uint8Array
const ph = await hashPassword(password, salt);
const ok = Buffer.from(ph).toString('hex') === Buffer.from(row.password_hash).toString('hex');
if(!ok) return null;
return row;
}


export async function authUser(env, req) {
const cookie = req.headers.get('cookie') || '';
const m = cookie.match(/auth=([^;]+)/);
if(!m) return null;
const payload = await verifyJWT(m[1], env.JWT_SECRET);
if(!payload) return null;
const user = await env.DB.prepare(`SELECT id,email,handle,display_name,level,trust_score FROM users WHERE id=?`).bind(payload.sub).first();
return user;
}


export async function setAuthCookie(env, user){
const token = await signJWT({ sub: user.id, handle: user.handle }, env.JWT_SECRET);
return setCookie('auth', token);
}


export function clearAuthCookie(){
return delCookie('auth');
}