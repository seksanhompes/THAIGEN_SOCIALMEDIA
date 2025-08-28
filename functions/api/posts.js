import { authUser } from '../_lib/auth.js';
import { json, bad, uid } from '../_lib/utils.js';
import { embedTextEmotion, parseMoodHint, mixVectors } from '../_lib/emo.js';


export const onRequestGet = async ({ env, request }) => {
const url = new URL(request.url);
const user = await authUser(env, request);
const limit = Math.min(parseInt(url.searchParams.get('limit')||'20',10), 50);
const rows = await env.DB.prepare(`SELECT p.*, u.handle, u.display_name FROM posts p JOIN users u ON p.user_id=u.id ORDER BY created_at DESC LIMIT ?`).bind(limit).all();
return json({ ok:true, posts: rows.results });
};


export const onRequestPost = async ({ env, request }) => {
const user = await authUser(env, request);
if(!user) return bad('unauth', 401);
const body = await request.json();
const { text, mood_hint, media_url, topic_tags } = body || {};
const id = uid();
const created_at = Date.now();
const eText = embedTextEmotion(text||'');
const eHint = parseMoodHint(mood_hint);
const e = mixVectors(eText, eHint);
await env.DB.prepare(`INSERT INTO posts (id,user_id,type,text,media_url,topic_tags,mood_hint,emotion_json,created_at) VALUES (?,?,?,?,?,?,?,?,?)`)
.bind(id, user.id, 'text', text||'', media_url||'', JSON.stringify(topic_tags||[]), mood_hint||null, JSON.stringify(e), created_at).run();
return json({ ok:true, id });
};