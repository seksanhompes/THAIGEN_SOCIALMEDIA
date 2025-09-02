import { authUser } from '../../_lib/auth.js';
import { json, bad } from '../../_lib/utils.js';



export const onRequestPost = async ({ env, request }) => {
const user = await authUser(env, request);
if(!user) return bad('unauth', 401);
const { post_id, type } = await request.json();
if(!post_id || !type) return bad('missing');
try {
await env.DB.prepare(`INSERT INTO reactions (id,post_id,user_id,type,created_at) VALUES (?,?,?,?,?)`)
.bind(uid(), post_id, user.id, type, Date.now()).run();
} catch (e) {
// toggle behavior: if exists, remove
await env.DB.prepare(`DELETE FROM reactions WHERE post_id=? AND user_id=? AND type=?`).bind(post_id, user.id, type).run();
}
return json({ ok:true });
};