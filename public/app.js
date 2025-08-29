(() => {
  'use strict';
  console.log('boot OK');

  const $ = (sel) => document.querySelector(sel);
  const app = $('#app');
  const nav = $('#nav');

  // ---- helper: fetch ที่พาคุกกี้ไปด้วยทุกครั้ง ----
  async function api(path, init = {}) {
    const opts = {
      credentials: 'include',                   // << สำคัญ!
      ...init,
    };
    return fetch(path, opts);
  }

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
        await api('/api/auth/logout', { method: 'POST' }); // << include cookies
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
      const r = await api('/api/auth/me');     // << include cookies
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
        <label>อีเมล
          <input id="email" type="email" placeholder="you@example.com" autocomplete="email">
        </label>
        <label>รหัสผ่าน
          <input id="password" type="password" placeholder="••••••••" autocomplete="current-password">
        </label>
        <label>แฮนด์เดิล
          <input id="handle" type="text" placeholder="yourname" autocomplete="username">
          <small>สมัครครั้งแรกเท่านั้น</small>
        </label>
        <label>ชื่อแสดงผล
          <input id="display" type="text" placeholder="ชื่อของคุณ" autocomplete="name">
        </label>
        <div class="row">
          <button id="btn-login" type="button">เข้าสู่ระบบ</button>
          <button id="btn-register" class="primary" type="button">สมัครใช้งาน</button>
        </div>
      </section>
    `;

    $('#btn-login').onclick = async (ev) => {
      const btn = ev.currentTarget; btn.disabled = true;
      try {
        const email = $('#email').value.trim();
        const password = $('#password').value;
        const r = await api('/api/auth/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) { alert(j.error || 'ล็อกอินล้มเหลว'); return; }
        // หลัง login สำเร็จ เซิร์ฟเวอร์ควร Set-Cookie: auth=...
        const meRes = await api('/api/auth/me');
        if (!meRes.ok) { alert('ตรวจสอบเซสชันไม่สำเร็จ'); return; }
        const meJson = await meRes.json();
        me = meJson.user;
        renderHome();
      } finally { btn.disabled = false; }
    };

    $('#btn-register').onclick = async (ev) => {
      const btn = ev.currentTarget; btn.disabled = true;
      try {
        const email = $('#email').value.trim();
        const password = $('#password').value;
        const handle = $('#handle').value.trim();
        const display_name = ($('#display').value.trim() || handle);
        const r = await api('/api/auth/register', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email, password, handle, display_name })
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) { alert(j.error || 'สมัครล้มเหลว'); return; }
        const meRes = await api('/api/auth/me');
        if (!meRes.ok) { alert('ตรวจสอบเซสชันไม่สำเร็จ'); return; }
        const meJson = await meRes.json();
        me = meJson.user;
        renderHome();
      } finally { btn.disabled = false; }
    };
  }

  function htm(s) { const d = document.createElement('div'); d.innerHTML = s; return d.firstElementChild; }

  async function renderHome() {
    navRender();
    app.innerHTML = `
      <section class="composer card">
        <textarea id="post-text" rows="3" placeholder="คุณรู้สึกอย่างไรตอนนี้…" autocomplete="off"></textarea>
        <div class="row">
          <select id="mood">
            <option value="">— เลือกอารมณ์ —</option>
            <option>joy</option><option>calm</option><option>sad</option><option>angry</option>
            <option>inspired</option><option>grateful</option><option>playful</option><option>urgent</option>
          </select>
          <button id="post-btn" class="primary" type="button">โพสต์</button>
        </div>
      </section>
      <section class="feed" id="feed"></section>
    `;

    $('#post-btn').onclick = async (ev) => {
      const btn = ev.currentTarget; btn.disabled = true;
      try {
        const text = $('#post-text').value.trim();
        const mood_hint = $('#mood').value || '';
        const r = await api('/api/posts', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text, mood_hint })
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) { alert(j.error || 'โพสต์ไม่สำเร็จ'); return; }
        $('#post-text').value = '';
        await loadFeed();
      } finally { btn.disabled = false; }
    };

    await loadFeed();
  }

  async function loadFeed() {
    const feedEl = $('#feed');
    feedEl.innerHTML = '<div class="card empty">กำลังโหลดฟีด…</div>';

    let j;
    try {
      const r = await api('/api/feed?limit=30');
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
          await api('/api/events', {
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
              <button data-act="like"   type="button">ถูกใจ</button>
              <button data-act="wow"    type="button">ว้าว</button>
              <button data-act="sad"    type="button">เศร้า</button>
              <button data-act="share"  type="button">แชร์</button>
              <button data-act="payout" type="button">รายได้</button>
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
        const r = await api(`/api/payouts?post_id=${p.id}`);
        const jj = await r.json().catch(()=>({}));
        alert(jj.eligible ? `เข้าเกณฑ์ • ประมาณการจ่าย: $${jj.estimate}` : 'ยังไม่เข้าเกณฑ์');
      };

      feedEl.appendChild(el);
      obs.observe(el);
    }
  }

  async function react(id, type) {
    const r = await api('/api/react', {
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
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }

  // bootstrap
  (async () => {
    me = await getMe();                 // จะสำเร็จได้เมื่อ cookie ถูกส่งกลับไปด้วย
    me ? renderHome() : renderLogin();
  })();

})(); // end IIFE
