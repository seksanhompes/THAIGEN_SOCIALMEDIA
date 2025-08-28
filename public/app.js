(() => {
  'use strict';
  console.log('boot OK');

  const $ = (sel) => document.querySelector(sel);
  const app = $('#app');
  const nav = $('#nav');

  // state
  let me = null;
  let sessionId = (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Math.random());

  function navRender() {
    nav.innerHTML = '';
    if (me) {
      const b1 = Object.assign(document.createElement('button'), { textContent: `@${me.handle}` });
      const b2 = Object.assign(document.createElement('button'), { textContent: 'ฟีด' });
      const b3 = Object.assign(document.createElement('button'), { textContent: 'ออกจากระบบ' });
      b2.onclick = () => renderHome();
      b3.onclick = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        me = null;
        renderLogin();
      };
      nav.append(b1, b2, b3);
    } else {
      const b = Object.assign(document.createElement('button'), { textContent: 'เข้าสู่ระบบ' });
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
    } catch {
      return null;
    }
  }

  function renderLogin() {
    navRender();
    app.innerHTML = `
      <section class="card">
        <h2>เข้าสู่ระบบ / สมัคร</h2>
        <label>อีเมล <input id="email" type="email" placeholder="you@example.com"></label>
        <label>รหัสผ่าน <input id="password" type="password" placeholder="••••••••"></label>
        <label>แฮนด์เดิล <input id="handle" type="text" placeholder="yourname"> <small>สมัครครั้งแรกเท่านั้น</small></label>
        <label>ชื่อแสดงผล <input id="display" type="text" placeholder="ชื่อของคุณ"></label>
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
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { alert(j.error || 'ล็อกอินล้มเหลว'); return; }
      me = j.user; renderHome();
    };

    $('#btn-register').onclick = async () => {
      const email = $('#email').value.trim();
      const password = $('#password').value;
      const handle = $('#handle').value.trim();
      const display_name = $('#display').value.trim() || handle;
      const r = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password, handle, display_name })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { alert(j.error || 'สมัครล้มเหลว'); return; }
      me = j.user; renderHome();
    };
  }

  function htm(s) { const d = document.createElement('div'); d.innerHTML = s; return d.firstElementChild; }

  async function renderHome() {
    navRender();
    app.innerHTML = `
      <section class="composer card">
        <textarea id="post-text" rows="3" placeholder="คุณรู้สึกอย่างไรตอนนี้…"></textarea>
        <div class="row">
          <select id="mood">
            <option value="">— เลือกอารมณ์ —</option>
            <option>joy</option><option>calm</option><option>sad</option><option>angry</option>
            <option>inspired</option><option>grateful</option><option>playful</option><option>urgent</option>
          </select>
          <button id="post-btn" class="primary">โพสต์</button>
        </div>
      </section>
      <section class="feed" id="feed"></section>
    `;

    $('#post-btn').onclick = async () => {
      const text = $('#post-text').value.trim();
      const mood_hint = $('#mood').value || '';
      const r = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, mood_hint })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { alert(j.error || 'โพสต์ไม่สำเร็จ'); return; }
      $('#post-text').value = '';
      loadFeed();
    };

    await loadFeed();
  }

  async function loadFeed() {
    const feedEl = $('#feed');
    feedEl.innerHTML = '<div class="card empty">กำลังโหลดฟีด…</div>';

    let j;
    try {
      const r = await fetch('/api/feed?limit=30');
      j = await r.json();
      if (!r.ok) throw new Error(j.error || 'feed error');
    } catch {
      feedEl.innerHTML = '<div class="card empty">โปรดเข้าสู่ระบบ</div>';
      return;
    }

    feedEl.innerHTML = '';

    const obs = new IntersectionObserver(entries => {
      entries.forEach(async en => {
        if (en.isIntersecting) {
          const postId = en.target.dataset.id;
          await fetch('/api/events', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ post_id: postId, session_id: sessionId, dwell_ms: 900 })
          });
          obs.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -40% 0px' });

    if (!j.feed || j.feed.length === 0) {
      feedEl.innerHTML = '<div class="card empty">ยังไม่มีโพสต์</div>';
      return;
    }

    for (const p of j.feed) {
      const levelBadge = `<span class="badge">${p.level || ''}</span>`;
      const el = htm(`
        <article class="card post" data-id="${p.id}">
          <div class="avatar">${(p.display_name || 'U')[0].toUpperCase()}</div>
          <div class="body">
            <div class="meta">@${p.handle} · ${timeAgo(p.created_at)} ${levelBadge}</div>
            <div class="text">${escapeHTML(p.text || '')}</div>
            <div class="actions">
              <button data-act="like">ถูกใจ</button>
              <button data-act="wow">ว้าว</button>
              <button data-act="sad">เศร้า</button>
              <button data-act="share">แชร์</button>
              <button data-act="payout">รายได้</button>
            </div>
          </div>
        </article>
      `);

      el.querySelector('[data-act="like"]').onclick = () => react(p.id, 'like');
      el.querySelector('[data-act="wow"]').onclick  = () => react(p.id, 'wow');
      el.querySelector('[data-act="sad"]').onclick  = () => react(p.id, 'sad');
      el.querySelector('[data-act="share"]').onclick = () => {
        if (navigator.share) navigator.share({ text: p.text || '' });
        else alert('คัดลอกลิงก์แล้ว');
      };
      el.querySelector('[data-act="payout"]').onclick = async () => {
        const r = await fetch(`/api/payouts?post_id=${p.id}`); const jj = await r.json();
        alert(jj.eligible ? `เข้าเกณฑ์ • ประมาณการจ่าย: $${jj.estimate}` : 'ยังไม่เข้าเกณฑ์');
      };

      feedEl.appendChild(el);
      obs.observe(el);
    }
  }

  async function react(id, type) {
    const r = await fetch('/api/react', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ post_id: id, type })
    });
    if (!r.ok) { const j = await r.json().catch(()=>({})); alert(j.error || 'error'); }
  }

  function timeAgo(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60); if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24); return `${d}d`;
  }

  function escapeHTML(str = '') {
    return String(str).replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[m]);
  }

  // bootstrap
  (async () => {
    me = await getMe();
    me ? renderHome() : renderLogin();
  })();

})(); // end IIFE
