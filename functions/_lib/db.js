export async function getUserById(db, id){
return db.prepare(`SELECT id,email,handle,display_name,level,trust_score FROM users WHERE id=?`).bind(id).first();
}


export async function getUserMood(db, userId){
const u = await db.prepare(`SELECT e_user_base FROM users WHERE id=?`).bind(userId).first();
return u?.e_user_base ? JSON.parse(u.e_user_base) : null;
}


export async function updateUserMood(db, userId, e){
await db.prepare(`UPDATE users SET e_user_base=? WHERE id=?`).bind(JSON.stringify(e), userId).run();
}