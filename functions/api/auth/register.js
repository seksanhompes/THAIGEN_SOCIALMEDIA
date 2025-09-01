import { json, bad } from '../../_lib/utils.js';
import { createUser, setAuthCookie } from '../../_lib/auth.js';


export const onRequestPost = async ({ env, request }) => {
const body = await request.json();
const { email, handle, display_name, password } = body || {};
if(!email || !handle || !display_name || !password) return bad('missing fields');
try {
const u = await createUser(env.DB, { email, handle, display_name, password });
const cookie = await setAuthCookie(env, u);
return new Response(JSON.stringify({ ok:true, user:u }), { status:200, headers:{ 'content-type':'application/json', 'set-cookie': cookie }});
} catch (e) {
return bad(e.message || 'register failed', 400);
}
};