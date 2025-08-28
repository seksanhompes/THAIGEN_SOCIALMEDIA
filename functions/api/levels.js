import { json, bad } from '../_lib/utils.js';
import { authUser } from '../_lib/auth.js';


export const onRequestGet = async ({ env, request }) => {
const user = await authUser(env, request);
if(!user) return bad('unauth', 401);
// Impact: last 30d views + reactions + unique sharers (MVP proxy)
const since = Date.now()-30*24*60*60*1000;
const v = await env.DB.prepare(`SELECT COUNT(*) as c FROM views WHERE user_id=? AND ts>?`).bind(user.id, since).first();
const r = await env.DB.prepare(`SELECT COUNT(*) as c FROM reactions WHERE user_id=? AND created_at>?`).bind(user.id, since).first();
const impact = (v?.c||0)*0.7 + (r?.c||0)*0.3;
let newLevel = 'Explorer';
if(impact >= 2000) newLevel = 'Leader';
else if(impact >= 800) newLevel = 'Communitor';
else if(impact >= 200) newLevel = 'Social Creator';
if(newLevel !== user.level){
await env.DB.prepare(`UPDATE users SET level=? WHERE id=?`).bind(newLevel, user.id).run();
}
return json({ ok:true, level: newLevel, impact });
};