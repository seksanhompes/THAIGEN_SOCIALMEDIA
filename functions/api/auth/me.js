import { authUser } from '../../_lib/auth.js';
import { json, bad } from '../../_lib/utils.js';


export const onRequestGet = async ({ env, request }) => {
const user = await authUser(env, request);
if(!user) return bad('unauth', 401);
return json({ ok:true, user });
};