(() => {
  'use strict';
  const $ = (s,el=document)=>el.querySelector(s);
  const app = $('#app'), nav = $('#nav'), tabbar = $('#tabbar');

  /* ---------------- SVG Icon System (monochrome, currentColor) ---------------- */
  const ICONS = {
    // Common
    'arrow-left': ['M15 18l-6-6 6-6','M9 12h12'],
    home: ['M3 11l9-7 9 7','M5 10v10h14V10','M10 20v-6h4v6'],
    search: ['M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z','M21 21l-4.35-4.35'],
    plus: ['M12 5v14','M5 12h14'],
    bell: ['M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8','M13.7 21a2 2 0 0 1-3.4 0'],
    user: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2','M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8'],
    // Mood
    smile: ['M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18','M8 14s1.5 2 4 2 4-2 4-2','M9 9h.01','M15 9h.01'],
    calm: ['M3 12h14','M3 8h10','M3 16h10'],
    frown: ['M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18','M9 15s1.5-2 3-2 3 2 3 2','M9 9h.01','M15 9h.01'],
    flame: ['M12 2C9 6 15 8 12 12c-3-4-9-2-9 4a9 9 0 0 0 18 0c0-6-6-8-9-14z'],
    star: ['M12 2l2.9 6.9L22 9.2l-5 4.6 1.5 7.2L12 17.8 5.5 21l1.5-7.2-5-4.6 7.1-0.3L12 2z'],
    heart: ['M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z'],
    spark: ['M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z','M5 5l1 2-2 1 2 1-1 2 2-1 1 2 1-2 2 1-1-2 2-1-2-1 1-2-2 1-1-2-1 2-2-1z'],
    alarm: ['M12 7a7 7 0 1 1 0 14 7 7 0 0 1 0-14','M12 11v4l3 2','M5 4L2 7','M22 7l-3-3'],
    // Actions
    'thumb-up': ['M14 9V5a3 3 0 0 0-6 0v4H4v11h10l4-7-4-4z'],
    share: ['M4 12v8h16v-8','M12 2v13','M16 6l-4-4-4 4'],
    coin: ['M12 5c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3z','M4 8v7c0 1.7 3.6 3 8 3s8-1.3 8-3V8','M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3']
  };
  const ic = (name, size=20)=>`<span class="ic" aria-hidden="true"><svg viewBox="0 0 24 24">${(ICONS[name]||[]).map(d=>`<path d="${d}"/>`).join('')}</svg></span>`;

  /* ---------------- State ---------------- */
  let me=null;
  let selectedMood = localStorage.getItem('emo.room') || '';
  const MOODS = [
    { key:'joy',       label:'สนุก',          icon:'smile'  },
    { key:'calm',      label:'ผ่อนคลาย',     icon:'calm'   },
    { key:'sad',       label:'เศร้า',         icon:'frown'  },
    { key:'angry',     label:'โกรธ',          icon:'flame'  },
    { key:'inspired',  label:'ได้แรงบันดาลใจ', icon:'star'   },
    { key:'grateful',  label:'ขอบคุณ',        icon:'heart'  },
    { key:'playful',   label:'เล่นสนุก',       icon:'spark'  },
    { key:'urgent',    label:'ด่วน',          icon:'alarm'  },
  ];
  const MOOD_ORDER = ['joy','calm','sad','angry','inspired','grateful','playful','urgent'];

  /* ---------------- Nav + Tabbar ---------------- */
  function navRender(){
    nav.innerHTML = '';
    $('#btn-back').innerHTML = ic('arrow-left');
    if (me){
      const b1 = Object.assign(document.createElement('button'),{className:'icon-btn',title:'โปรไฟล์'});
      b1.innerHTML = ic('user'); b1.onclick=()=>renderProfile();
      const b2 = Object.assign(document.createElement('button'),{className:'icon-btn',title:'ออกจากระบบ'});
      b2.textContent = 'ออก'; b2.onclick=async()=>{ await fetch('/api/auth/logout',{method:'POST'}); me=null; renderLogin(); };
      nav.append(b1,b2);
    }else{
      const b = Object.assign(document.createElement('button'),{className:'icon-btn'});
      b.textContent = 'เข้าสู่ระบบ'; b.onclick=()=>renderLogin(); nav.append(b);
    }
    renderTabbar();
  }
  function renderTabbar(active='home'){
    tabbar.innerHTML = [
      tabBtn('home',   'หน้าแรก',   'home'),
      tabBtn('explore','สำรวจ',     'search'),
      tabBtn('post',   'โพสต์',     'plus', true),
      tabBtn('noti',   'แจ้งเตือน', 'bell'),
      tabBtn('me',     'โปรไฟล์',   'user'),
    ].join('');
    setActiveTab(active);
  }
  const tabBtn = (k, label, icon, cta=false)=>`
    <button data-tab="${k}" ${cta?'class="cta"':''}>
      <span class="ic">${ic(icon)}</span>
      <span>${label}</span>
    </button>`;
  function setActiveTab(name){
    [...tabbar.querySelectorAll('button')].forEach(b=>b.classList.toggle('active', b.dataset.tab===name));
  }

  /* ---------------- API helpers ---------------- */
  async function getMe(){ try{ const r=await fetch('/api/auth/me'); if(!r.ok) return null; return (await r.json()).user; }catch{ return null; } }

  /* ---------------- Mood UI ---------------- */
  function moodChips(active=selectedMood){
    const wrap = Object.assign(document.createElement('div'),{className:'rooms'});
    for(const m of MOODS){
      const chip = document.createElement('button');
      chip.className = 'mood-chip' + (m.key===active?' active':'');
      chip.innerHTML = `${ic(m.icon,16)}<span>${m.label}</span>`;
      chip.onclick = ()=>{ selectedMood = (m.key===selectedMood)? '' : m.key; localStorage.setItem('emo.room', selectedMood); renderHome(); };
      wrap.appendChild(chip);
    }
    return wrap;
  }
  const moodBadge = ()=> selectedMood ? `<span class="badge">${ic(MOODS.find(x=>x.key===selectedMood)?.icon||'star',16)} ห้องอารมณ์: ${MOODS.find(x=>x.key===selectedMood)?.label||selectedMood}</span>` : '';

  /* ---------------- Screens ---------------- */
  function renderLogin(){
    navRender(); setActiveTab('home');
    app.innerHTML = `
      <section class="card">
        <h2>เข้าสู่ระบบ / สมัคร</h2>
        <label>อีเมล <input id="email" type="email" placeholder="you@example.com" autocomplete="email"></label>
        <label>รหัสผ่าน <input id="password" type="password" placeholder="••••••••" autocomplete="current-password"></label>
        <label>แฮนด์เดิล <input id="handle" type="text" placeholder="yourname" autocomplete="nickname"> <small>สมัครครั้งแรกเท่านั้น</small></label>
        <label>ชื่อแสดงผล <input id="display" type="text" placeholder="ชื่อของคุณ" autocomplete="name"></label>
        <div class="row">
          <button id="btn-login">${ic('user')} เข้าสู่ระบบ</button>
          <button id="btn-register" class="primary">${ic('plus')} สมัครใช้งาน</button>
        </div>
      </section>
    `;
    $('#btn-login').onclick = async ()=>{
      const r = await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:$('#email').value.trim(),password:$('#password').value}),credentials:'include'});
      const j = await r.json().catch(()=>({})); if(!r.ok) return alert(j.error||'ล็อกอินล้มเหลว'); me=j.user; renderHome();
    };
    $('#btn-register').onclick = async ()=>{
      const r = await fetch('/api/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:$('#email').value.trim(),password:$('#password').value,handle:$('#handle').value.trim(),display_name:$('#display').value.trim()||$('#handle').value.trim()}),credentials:'include'});
      const j = await r.json().catch(()=>({})); if(!r.ok) return alert(j.error||'สมัครล้มเหลว'); me=j.user; renderHome();
    };
  }

  function htm(s){ const d=document.createElement('div'); d.innerHTML=s.trim(); return d.firstElementChild; }

  async function renderHome(){
    navRender(); setActiveTab('home');

    const moodHeader = `
      <section class="card">
        <div class="mood-title">เลือกห้องตามอารมณ์ของคุณตอนนี้</div>
        ${moodChips().outerHTML}
        <hr class="sep">
        <div class="row wrap">
          ${moodBadge()}
          <span class="hint" style="color:#6b7280">แตะชิปอีกครั้งเพื่อออกจากห้อง</span>
        </div>
      </section>`;
    const composer = `
      <section class="card composer">
        <textarea id="post-text" rows="3" placeholder="คุณรู้สึกอย่างไรตอนนี้…"></textarea>
        <div class="row">
          <button id="post-btn" class="primary">${ic('plus')} โพสต์</button>
          <button id="clear-btn" class="ghost">ล้าง</button>
        </div>
        <div class="hint">โพสต์ของคุณจะติดแท็กอารมณ์ <b>${selectedMood || '—'}</b></div>
      </section>`;
    app.innerHTML = moodHeader + composer + `<section class="feed" id="feed"></section>`;

    $('#clear-btn').onclick = ()=>$('#post-text').value='';
    $('#post-btn').onclick = async ()=>{
      const text=$('#post-text').value.trim(); if(!text) return alert('พิมพ์ข้อความก่อนโพสต์');
      const r=await fetch('/api/posts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text, mood_hint:selectedMood||''}),credentials:'include'});
      const j=await r.json().catch(()=>({})); if(!r.ok) return alert(j.error||'โพสต์ไม่สำเร็จ'); $('#post-text').value=''; await loadFeed(); window.scrollTo({top:0,behavior:'smooth'});
    };

    await loadFeed();
  }

  async function renderProfile(){
    navRender(); setActiveTab('me');
    app.innerHTML = `
      <section class="card">
        <div class="row" style="align-items:center">
          <div class="avatar">${(me?.display_name||'U')[0]?.toUpperCase?.()||'U'}</div>
          <div style="margin-left:10px">
            <div style="font-weight:700">${me?.display_name||'-'}</div>
            <div class="muted">@${me?.handle||''}</div>
          </div>
        </div>
      </section>
      <section class="card">
        <h3>การตั้งค่าอารมณ์</h3>
        ${moodChips().outerHTML}
      </section>
    `;
    app.querySelectorAll('.rooms .mood-chip').forEach((ch,i)=>{
      ch.onclick=()=>{ const k=MOODS[i].key; selectedMood=(k===selectedMood)?'':k; localStorage.setItem('emo.room',selectedMood); renderProfile(); };
    });
  }

  function renderExplore(){ navRender(); setActiveTab('explore'); app.innerHTML = `<section class="card"><h3>สำรวจ</h3><input placeholder="ค้นหาผู้ใช้ / โพสต์ / แท็ก" /><div class="hint" style="margin-top:8px;color:#6b7280">กำลังพัฒนา</div></section>`; }
  function renderNotifications(){ navRender(); setActiveTab('noti'); app.innerHTML = `<section class="card"><h3>แจ้งเตือน</h3><div class="hint" style="color:#6b7280">จะมาเร็ว ๆ นี้</div></section>`; }

  /* ---------------- Feed ---------------- */
  async function loadFeed(){
    const feedEl=$('#feed'); feedEl.innerHTML='<div class="card empty">กำลังโหลดฟีด…</div>';
    let j; try{ const r=await fetch(`/api/feed?limit=50${selectedMood?`&mood=${encodeURIComponent(selectedMood)}`:''}`,{credentials:'include'}); j=await r.json(); if(!r.ok) throw new Error(j.error||'feed error'); }catch{ feedEl.innerHTML='<div class="card empty">โปรดเข้าสู่ระบบ</div>'; return; }
    let rows=Array.isArray(j.feed)?j.feed:[]; if(selectedMood) rows=rows.filter(p=>matchMood(p,selectedMood));
    if(!rows.length){ feedEl.innerHTML='<div class="card empty">ยังไม่มีโพสต์ในห้องนี้ ลองเปลี่ยนอารมณ์หรือโพสต์ก่อนเลย!</div>'; return; }
    feedEl.innerHTML='';
    const obs=new IntersectionObserver(entries=>{ entries.forEach(en=>{ if(en.isIntersecting){ const postId=en.target.dataset.id; fetch('/api/events',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({post_id:postId,session_id:'s_'+Date.now(),dwell_ms:900})}).catch(()=>{}); obs.unobserve(en.target);} }); },{rootMargin:'0px 0px -40% 0px'});
    for(const p of rows){
      const el=htm(`
        <article class="card post" data-id="${p.id}">
          <div class="avatar">${(p.display_name||'U')[0].toUpperCase()}</div>
          <div class="body">
            <div class="meta">
              <span>@${p.handle}</span>
              <span>· ${timeAgo(p.created_at)}</span>
              ${p.level?`<span class="badge">${p.level}</span>`:''}
              ${p.mood_hint?`<span class="badge">${p.mood_hint}</span>`:''}
            </div>
            <div class="text">${escapeHTML(p.text||'')}</div>
            <div class="actions">
              <button data-act="like">${ic('thumb-up')} ถูกใจ</button>
              <button data-act="wow">${ic('star')} ว้าว</button>
              <button data-act="sad">${ic('frown')} เศร้า</button>
              <button data-act="share">${ic('share')} แชร์</button>
              <button data-act="payout">${ic('coin')} รายได้</button>
            </div>
          </div>
        </article>
      `);
      el.querySelector('[data-act="like"]').onclick = ()=>react(p.id,'like');
      el.querySelector('[data-act="wow"]').onclick  = ()=>react(p.id,'wow');
      el.querySelector('[data-act="sad"]').onclick  = ()=>react(p.id,'sad');
      el.querySelector('[data-act="share"]').onclick= ()=>{ if(navigator.share) navigator.share({ text:p.text||'', url:location.origin+'/p/'+p.id }).catch(()=>{}); else {navigator.clipboard?.writeText(location.origin+'/p/'+p.id); alert('คัดลอกลิงก์แล้ว');} };
      el.querySelector('[data-act="payout"]').onclick=async()=>{ try{ const r=await fetch(`/api/payouts?post_id=${p.id}`); const jj=await r.json(); alert(jj.eligible?`เข้าเกณฑ์ • ประมาณการจ่าย: $${jj.estimate}`:'ยังไม่เข้าเกณฑ์'); }catch{ alert('ตรวจสอบไม่ได้'); } };
      feedEl.appendChild(el); obs.observe(el);
    }
  }
  function matchMood(p,mood){
    if(p.mood_hint && p.mood_hint.toLowerCase()===mood) return true;
    try{ const v=JSON.parse(p.emotion_json||'[]'); if(Array.isArray(v) && v.length){ const idx=MOOD_ORDER.indexOf(mood); if(idx>=0){ const val=Number(v[idx]||0); const max=Math.max(...v.map(Number)); return val>=0.25 && (val>=max-0.12); } } }catch{}
    return false;
  }
  async function react(id,type){
    try{ const r=await fetch('/api/react',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({post_id:id,type})}); if(!r.ok){ const j=await r.json().catch(()=>({})); alert(j.error||'error'); } }catch{ alert('ส่งปฏิกิริยาไม่สำเร็จ'); }
  }

  /* ---------------- Tabbar events ---------------- */
  tabbar.addEventListener('click', e=>{
    const b=e.target.closest('button'); if(!b) return;
    const t=b.dataset.tab;
    if(t==='home') renderHome();
    else if(t==='explore') renderExplore();
    else if(t==='noti') renderNotifications();
    else if(t==='me') renderProfile();
    else if(t==='post'){ if(!me){ renderLogin(); return; } window.scrollTo({top:0,behavior:'smooth'}); $('#post-text')?.focus(); }
  });

  /* ---------------- Utils ---------------- */
  function timeAgo(ts){ const now=Date.now(); const tms=ts<2_000_000_000?ts*1000:ts; const s=Math.floor((now-tms)/1000); if(s<60) return `${s}s`; const m=Math.floor(s/60); if(m<60) return `${m}m`; const h=Math.floor(m/60); if(h<24) return `${h}h`; const d=Math.floor(h/24); return `${d}d`; }
  function escapeHTML(s=''){ return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

  /* ---------------- Boot ---------------- */
  (async()=>{ me=await getMe(); me?renderHome():renderLogin(); })();
})();
