import { authUser } from '../_lib/auth.js';
import { json, bad, uid, getClientIP, getUA } from '../_lib/utils.js';


export const onRequestPost = async ({ env, request }) => {
const user = await authUser(env, request); // may be null (anon)
const { post_id, dwell_ms=0, watched_ratio=0, session_id } = await request.json();
if(!post_id) return bad('missing');
const id = uid();
await env.DB.prepare(`INSERT INTO views (id,post_id,user_id,session_id,dwell_ms,watched_ratio,ip,ua,ts) VALUES (?,?,?,?,?,?,?,?,?)`)
.bind(id, post_id, user?.id||null, session_id||null, dwell_ms|0, +watched_ratio||0, getClientIP(request), getUA(request), Date.now()).run();
return json({ ok:true });
};