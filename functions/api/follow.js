import { authUser } from '../_lib/auth.js';
import { json, bad } from '../_lib/utils.js';


export const onRequestPost = async ({ env, request }) => {
const user = await authUser(env, request);
if(!user) return bad('unauth', 401);
const { target_id, action } = await request.json();
if(!target_id) return bad('missing');
if(action === 'follow'){
try { await env.DB.prepare(`INSERT INTO follows (src_id,dst_id,created_at) VALUES (?,?,?)`).bind(user.id, target_id, Date.now()).run(); } catch {}
} else if(action === 'unfollow'){
await env.DB.prepare(`DELETE FROM follows WHERE src_id=? AND dst_id=?`).bind(user.id, target_id).run();
}
return json({ ok:true });
};