const $ = sel => document.querySelector(sel);


const obs = new IntersectionObserver(entries=>{
entries.forEach(async en=>{
if(en.isIntersecting){
const postId = en.target.dataset.id;
await fetch('/api/events', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ post_id: postId, session_id: sessionId, dwell_ms: 900 }) });
obs.unobserve(en.target);
}
})
}, { rootMargin:'0px 0px -40% 0px' });


if(j.feed.length===0){ feedEl.innerHTML = '<div class="card empty">ยังไม่มีโพสต์</div>'; return; }


for(const p of j.feed){
const levelBadge = `<span class="badge">${p.level||''}</span>`;
const el = htm(`<article class="card post" data-id="${p.id}">
<div class="avatar">${p.display_name?.[0]?.toUpperCase()||'U'}</div>
<div class="body">
<div class="meta">@${p.handle} · ${timeAgo(p.created_at)} ${levelBadge}</div>
<div class="text">${escapeHTML(p.text||'')}</div>
<div class="actions">
<button data-act="like">ถูกใจ</button>
<button data-act="wow">ว้าว</button>
<button data-act="sad">เศร้า</button>
<button data-act="share">แชร์</button>
<button data-act="payout">รายได้</button>
</div>
</div>
</article>`);
el.querySelector('[data-act="like"]').onclick = ()=> react(p.id,'like');
el.querySelector('[data-act="wow"]').onclick = ()=> react(p.id,'wow');
el.querySelector('[data-act="sad"]').onclick = ()=> react(p.id,'sad');
el.querySelector('[data-act="share"]').onclick = ()=> navigator.share ? navigator.share({ text:p.text }) : alert('คัดลอกลิงก์แล้ว');
el.querySelector('[data-act="payout"]').onclick = async ()=>{
const r = await fetch(`/api/payouts?post_id=${p.id}`); const j = await r.json();
alert(j.eligible ? `เข้าเกณฑ์ • ประมาณการจ่าย: $${j.estimate}` : 'ยังไม่เข้าเกณฑ์');
};
feedEl.appendChild(el);
obs.observe(el);
}
}


async function react(id,type){
const r = await fetch('/api/react', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ post_id:id, type })});
if(!r.ok){ const j=await r.json(); alert(j.error||'error'); }
}


function timeAgo(ts){
const s = Math.floor((Date.now()-ts)/1000);
if(s<60) return `${s}s`;
const m = Math.floor(s/60); if(m<60) return `${m}m`;
const h = Math.floor(m/60); if(h<24) return `${h}h`;
const d = Math.floor(h/24); return `${d}d`;
}


function escapeHTML(str){
return str.replace(/[&<>"']/g, m=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));
}


// bootstrap
(async function(){
me = await getMe();
me ? renderHome() : renderLogin();
})();