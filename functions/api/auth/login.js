import { json, bad } from '../../_lib/utils.js';
import { loginUser, setAuthCookie } from '../../_lib/auth.js';


export const onRequestPost = async ({ env, request }) => {
const { email, password } = await request.json();
if(!email || !password) return bad('missing');
const u = await loginUser(env.DB, { email, password });
if(!u) return bad('invalid credentials', 401);
const cookie = await setAuthCookie(env, u);
return new Response(JSON.stringify({ ok:true, user:{ id:u.id, handle:u.handle, display_name:u.display_name, level:u.level } }), { status:200, headers:{ 'content-type':'application/json', 'set-cookie': cookie }});
};