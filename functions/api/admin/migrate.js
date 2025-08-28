import { json, bad } from '../../_lib/utils.js';


export const onRequestGet = async ({ env, request }) => {
const url = new URL(request.url);
const token = url.searchParams.get('token');
if(env.MIGRATE_TOKEN && token !== env.MIGRATE_TOKEN) return bad('unauthorized', 401);


const statements = [
await (await fetch(new URL('../../migrations/001_init.sql', import.meta.url))).text(),
await (await fetch(new URL('../../migrations/002_indexes.sql', import.meta.url))).text()
];


for(const sql of statements){
const chunks = sql.split(/;\s*\n/).map(s=>s.trim()).filter(Boolean);
for(const c of chunks){
await env.DB.exec(c);
}
}
return json({ ok:true, migrated:true });
};