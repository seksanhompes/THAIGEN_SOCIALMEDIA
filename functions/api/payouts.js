import { json, bad } from '../_lib/utils.js';
import { authUser } from '../_lib/auth.js';


function sigmoid(x){ return 1/(1+Math.exp(-x)); }


async function postStats(env, postId){
const v = await env.DB.prepare(`SELECT COUNT(*) as c, AVG(CASE WHEN dwell_ms>800 THEN 1 ELSE 0 END) as r FROM views WHERE post_id=?`).bind(postId).first();
const likes = await env.DB.prepare(`SELECT COUNT(*) as c FROM reactions WHERE post_id=?`).bind(postId).first();
return { views: v?.c||0, retain: v?.r||0, reacts: likes?.c||0 };
}


export const onRequestGet = async ({ env, request }) => {
const user = await authUser(env, request);
if(!user) return bad('unauth', 401);
const url = new URL(request.url);
const post_id = url.searchParams.get('post_id');
if(!post_id) return bad('missing');


const stats = await postStats(env, post_id);
const region = 'TH';
const category = 'general';
const UHV = Math.max(0, stats.views - Math.floor(stats.views*0.05)); // naive 5% bot discard MVP
const AE = sigmoid((stats.reacts||0)/5);
const RPM = parseFloat(env.RPM_BASE||'0.8');
const retention = stats.retain||0;
const integrity = 1.0; // MVP (plug fraud later)


const eligible = (UHV >= 100 && AE >= 0.4); // demo thresholds
const payout = eligible ? (RPM * (UHV/1000) * (0.5+retention) * (0.5+AE) * integrity) : 0;


return json({ ok:true, eligible, estimate: Math.round(payout*100)/100, UHV, AE, retention, RPM });
};