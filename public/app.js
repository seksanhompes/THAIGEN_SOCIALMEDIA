(() => {
  'use strict';
  console.log('boot OK');

  const $ = (sel, el=document) => el.querySelector(sel);
  const app = $('#app');
  const nav = $('#nav');
  const tabbar = $('#tabbar');

  // ====== App State ======
  let me = null;
  let selectedMood = localStorage.getItem('emo.room') || ''; // '', 'joy', 'calm', ...
  const MOODS = [
    { key:'joy',       label:'สนุก',       icon:'😊' },
    { key:'calm',      label:'ผ่อนคลาย',   icon:'🧘' },
    { key:'sad',       label:'เศร้า',       icon:'😢' },
    { key:'angry',     label:'โกรธ',       icon:'😡' },
    { key:'inspired',  label:'ได้แรงบันดาลใจ', icon:'✨' },
    { key:'grateful',  label:'ขอบคุณ',     icon:'🙏' },
    { key:'playful',   label:'เล่นสนุก',    icon:'🎉' },
    { key:'urgent',    label:'ด่วน',        icon:'⏱️' },
  ];
  // map index → mood name (ถ้าอ่านจาก emotion_json)
  const MOOD_ORDER = ['joy','calm','sad','angry','inspired','grateful','playful','urgent'];

  // ====== Nav (ขวาบน) ======
  function navRender() {
    nav.innerHTML = '';
    if (me) {
      const b1 = Object.assign(document.createElement('button'), { className:'icon-btn', title:'ฉัน', textContent:`@${me.handle}` });
      const b2 = Object.assign(document.createElement('button'), { className:'icon-btn', title:'ออกจากระบบ', textContent:'🚪' });
      b1.onclick = () => renderProfile();
      b2.onclick = async () => { await fetch('/api/auth/logout',{method:'POST'}); me=null; renderLogin(); };
      nav.append(b1,b2);
    } else {
      const b = Object.assign(document.createElement('button'), { className:'icon-btn', textContent:'เข้าสู่ระบบ' });
      b.onclick = () => renderLogin();
      nav.append(b);
    }
  }

  async function getMe() {
    try {
      const r = await fetch('/api/auth/me');
      if (!r.ok) return null;
      const j = await r.json();
      return j.user;
    } catch { return null; }
  }

  // ====== Mood UI ======
  function moodChips(active = selectedMood) {
    const wrap = Object.assign(document.createElement('div'), { className:'rooms' });
    for (const m of MOODS) {
      const chip = document.createElement('button');
      chip.className = 'mood-chip' + (m.key===active ? ' active' : '');
      chip.innerHTML = `<span class="i">${m.icon}</span><span>${m.label}</span>`;
      chip.onclick = () => {
        selectedMood = m.key === selectedMood ? '' : m.key;
        localStorage.setItem('emo.room', selectedMood);
        renderHome(); // รีโหลดหน้า+ฟีด
      };
      chip.title = `เข้าห้องอารมณ์: ${m.label}`;
      wrap.appendChild(chip);
    }
    return wrap;
  }

  function moodBadge() {
    if (!selectedMood) return '';
    const m = MOODS.find(x => x.key===selectedMood);
    return `<span class="badge">${m?.icon || ''} ห้องอารมณ์: ${m?.label || selectedMood}</span>`;
  }

  // ====== Screens ======
  function renderLogin() {
    navRender();
    setActiveTab('home');

    app.innerHTML = `
      <section class="card">
        <h2>เข้าสู่ระบบ / สมัคร</h2>
        <label>อีเมล <input id="email" type="email" placeholder="you@example.com" autocomplete="email"></label>
        <label>รหัสผ่าน <input id="password" type="password" placeholder="••••••••" autocomplete="current-password"></label>
        <label>แฮนด์เดิล <input id="handle" type="text" placeholder="yourname" autocomplete="nickname"> <small>สมัครครั้งแรกเท่านั้น</small></label>
        <label>ชื่อแสดงผล <input id="display" type="text" placeholder="ชื่อของคุณ" autocomplete="name"></label>
        <div class="row">
          <button id="btn-login">เข้าสู่ระบบ</button>
          <button id="btn-register" class="primary">สมัครใช้งาน</button>
        </div>
      </section>
    `;

    $('#btn-login').onclick = async () => {
      const email = $('#email').value.trim();
      const password = $('#password').value;
      const r = await fetch('/api/auth/login', {
        method:'POST', headers:{'content-type':'application/json'},
        body: JSON.stringify({ email, password }), credentials:'include'
      });
      const j = await r.json().catch(()=>({}));
      if (!r.ok) { alert(j.error || 'ล็อกอินล้มเหลว'); return; }
      me = j.user; renderHome();
    };

    $('#btn-register').onclick = async () => {
      const email = $('#email').value.trim();
      const password = $('#password').value;
      const handle = $('#handle').value.trim();
      const display_name = $('#display').value.trim() || handle;
      const r = await fetch('/api/auth/register', {
        method:'POST', headers:{'content-type':'application/json'},
        body: JSON.stringify({ email, password, handle, display_name }), credentials:'include'
      });
      const j = await r.json().catch(()=>({}));
      if (!r.ok) { alert(j.error || 'สมัครล้มเหลว'); return; }
      me = j.user; renderHome();
    };
  }

  function htm(s){ const d=document.createElement('div'); d.innerHTML=s.trim(); return d.firstElementChild; }

  async function renderHome() {
    navRender(); setActiveTab('home');

    const moodHeader = `
      <section class="card">
        <div class="mood-title">เลือกห้องตามอารมณ์ของคุณตอนนี้</div>
        ${moodChips().outerHTML}
        <hr class="sep">
        <div class="row wrap">
          ${moodBadge()}
          <span class="hint">แตะชิปอีกครั้งเพื่อออกจากห้อง</span>
        </div>
      </section>`;

    const composer = `
      <section class="card composer">
        <textarea id="post-text" rows="3" placeholder="คุณรู้สึกอย่างไรตอนนี้…"></textarea>
        <div class="row">
          <button id="post-btn" class="primary">โพสต์</button>
          <button id="clear-btn" class="ghost">ล้าง</button>
        </div>
        <div class="hint">โพสต์ของคุณจะติดแท็กอารมณ์ <b>${selectedMood || '—'}</b></div>
      </section>
    `;

    app.innerHTML = moodHeader + composer + `<section class="feed" id="feed"></section>`;

    $('#clear-btn').onclick = () => { $('#post-text').value=''; };

    $('#post-btn').onclick = async () => {
      const text = $('#post-text').value.trim();
      const mood_hint = selectedMood || '';
      if (!text) { alert('พิมพ์ข้อความก่อนโพสต์'); return; }
      const r = await fetch('/api/posts', {
        method:'POST', headers:{'content-type':'application/json'},
        body: JSON.stringify({ text, mood_hint }), credentials:'include'
      });
      const j = await r.json().catch(()=>({}));
      if (!r.ok) { alert(j.error || 'โพสต์ไม่สำเร็จ'); return; }
      $('#post-text').value = '';
      await loadFeed();
      window.scrollTo({ top:0, behavior:'smooth' });
    };

    await loadFeed();
  }

  async function renderProfile() {
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
    // bind chips again
    app.querySelectorAll('.rooms .mood-chip').forEach((ch,i)=>{
      ch.onclick = () => {
        const k = MOODS[i].key;
        selectedMood = k===selectedMood ? '' : k;
        localStorage.setItem('emo.room', selectedMood);
        renderProfile();
      };
    });
  }

  function renderExplore(){
    navRender(); setActiveTab('explore');
    app.innerHTML = `
      <section class="card">
        <h3>สำรวจ</h3>
        <input id="q" placeholder="ค้นหาผู้ใช้ / โพสต์ / แท็ก" />
        <div class="hint" style="margin-top:8px">กำลังพัฒนา</div>
      </section>`;
  }
  function renderNotifications(){
    navRender(); setActiveTab('noti');
    app.innerHTML = `<section class="card"><h3>แจ้งเตือน</h3><div class="hint">จะมาเร็ว ๆ นี้</div></section>`;
  }

  // ====== Feed ======
  async function loadFeed() {
    const feedEl = $('#feed');
    feedEl.innerHTML = '<div class="card empty">กำลังโหลดฟีด…</div>';

    let j;
    try {
      const r = await fetch(`/api/feed?limit=50${selectedMood?`&mood=${encodeURIComponent(selectedMood)}`:''}`, { credentials:'include' });
      j = await r.json();
      if (!r.ok) throw new Error(j.error || 'feed error');
    } catch (e) {
      feedEl.innerHTML = `<div class="card empty">โปรดเข้าสู่ระบบ</div>`;
      return;
    }

    // client-side filter ตามห้องอารมณ์ (ถ้า backend ยังไม่รองรับ)
    let rows = Array.isArray(j.feed) ? j.feed : [];
    if (selectedMood) rows = rows.filter(p => matchMood(p, selectedMood));

    if (!rows.length) {
      feedEl.innerHTML = '<div class="card empty">ยังไม่มีโพสต์ในห้องนี้ ลองเปลี่ยนอารมณ์หรือโพสต์ก่อนเลย!</div>';
      return;
    }

    feedEl.innerHTML = '';
    const obs = new IntersectionObserver(entries => {
      entries.forEach(async en => {
        if (en.isIntersecting) {
          const postId = en.target.dataset.id;
          // ส่ง view event (ไม่ critical)
          fetch('/api/events', {
            method:'POST', headers:{'content-type':'application/json'},
            body: JSON.stringify({ post_id: postId, session_id: 's_'+Date.now(), dwell_ms: 900 })
          }).catch(()=>{});
          obs.unobserve(en.target);
        }
      });
    }, { rootMargin:'0px 0px -40% 0px' });

    for (const p of rows) {
      const levelBadge = p.level ? `<span class="badge">${p.level}</span>` : '';
      const el = htm(`
        <article class="card post" data-id="${p.id}">
          <div class="avatar">${(p.display_name||'U')[0].toUpperCase()}</div>
          <div class="body">
            <div class="meta">
              <span>@${p.handle}</span>
              <span>· ${timeAgo(p.created_at)}</span>
              ${levelBadge}
              ${p.mood_hint ? `<span class="badge">${emojiFor(p.mood_hint)} ${p.mood_hint}</span>`:''}
            </div>
            <div class="text">${escapeHTML(p.text||'')}</div>
            <div class="actions">
              <button data-act="like">👍 ถูกใจ</button>
              <button data-act="wow">😍 ว้าว</button>
              <button data-act="sad">😢 เศร้า</button>
              <button data-act="share">🔗 แชร์</button>
              <button data-act="payout">💸 รายได้</button>
            </div>
          </div>
        </article>
      `);
      el.querySelector('[data-act="like"]').onclick = () => react(p.id,'like');
      el.querySelector('[data-act="wow"]').onclick  = () => react(p.id,'wow');
      el.querySelector('[data-act="sad"]').onclick  = () => react(p.id,'sad');
      el.querySelector('[data-act="share"]').onclick = () => {
        if (navigator.share) navigator.share({ text: p.text || '', url: location.origin+'/p/'+p.id }).catch(()=>{});
        else { navigator.clipboard?.writeText(location.origin+'/p/'+p.id); alert('คัดลอกลิงก์แล้ว'); }
      };
      el.querySelector('[data-act="payout"]').onclick = async () => {
        try{
          const r = await fetch(`/api/payouts?post_id=${p.id}`); const jj = await r.json();
          alert(jj.eligible ? `เข้าเกณฑ์ • ประมาณการจ่าย: $${jj.estimate}` : 'ยังไม่เข้าเกณฑ์');
        }catch{ alert('ตรวจสอบไม่ได้'); }
      };
      feedEl.appendChild(el);
      obs.observe(el);
    }
  }

  function matchMood(p, mood){
    if (p.mood_hint && p.mood_hint.toLowerCase() === mood) return true;
    // อ่าน emotion_json ถ้ามี
    try {
      const v = JSON.parse(p.emotion_json || '[]');
      if (Array.isArray(v) && v.length) {
        const idx = MOOD_ORDER.indexOf(mood);
        if (idx >= 0) {
          // โหวตว่าค่านี้เด่นพอไหม
          const val = Number(v[idx] || 0);
          const max = Math.max(...v.map(Number));
          return val >= 0.25 && (val >= max-0.12); // เกณฑ์หยาบ ๆ
        }
      }
    } catch {}
    return false;
  }

  async function react(id, type){
    try{
      const r = await fetch('/api/react',{ method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ post_id:id, type })});
      if (!r.ok) { const j = await r.json().catch(()=>({})); alert(j.error||'error'); }
    }catch{ alert('ส่งปฏิกิริยาไม่สำเร็จ'); }
  }

  // ====== Tabbar handling ======
  tabbar.addEventListener('click', (e)=>{
    const b = e.target.closest('button'); if (!b) return;
    const tab = b.dataset.tab;
    if (tab==='home') renderHome();
    else if (tab==='explore') renderExplore();
    else if (tab==='noti') renderNotifications();
    else if (tab==='me') renderProfile();
    else if (tab==='post') { // โพสต์ด่วน
      if (!me) { renderLogin(); return; }
      window.scrollTo({ top:0, behavior:'smooth' });
      $('#post-text')?.focus();
    }
  });
  function setActiveTab(name){
    [...tabbar.querySelectorAll('button')].forEach(b=>{
      b.classList.toggle('active', b.dataset.tab===name || (name==='home' && b.dataset.tab==='home'));
    });
  }

  // ====== Utils ======
  function timeAgo(ts){
    const now = Date.now();
    const tms = ts < 2_000_000_000 ? ts*1000 : ts;
    const s = Math.floor((now - tms)/1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s/60); if (m < 60) return `${m}m`;
    const h = Math.floor(m/60); if (h < 24) return `${h}h`;
    const d = Math.floor(h/24); return `${d}d`;
  }
  function escapeHTML(str=''){
    return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  function emojiFor(m){
    const found = MOODS.find(x=>x.key===String(m).toLowerCase());
    return found ? found.icon : '✨';
  }

  // ====== Bootstrap ======
  (async () => {
    me = await getMe();
    me ? renderHome() : renderLogin();
  })();

})();
