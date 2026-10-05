/* Słowianoczka — aplikacja lojalnościowa (PWA, vanilla JS).
   Stan trzymany lokalnie (demo). Docelowo: API kart/kuponów/zamówień + integracja z kasami POS. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const P = window.PRODUCTS;
  const PMAP = new Map(P.map((p) => [p.id, p]));
  const { CATEGORIES, STORES, COUPONS, REWARDS, CHALLENGES, LEVELS, I18N, DELIVERY, SHOP_PHONE, BUNDLES, BUNDLE_DISC, FIRST_ORDER } = window;
  const SMAP = new Map(STORES.map((s) => [s.id, s]));
  const KEY = 'slowianoczka.v1';
  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  // ---------- state ----------
  const fresh = () => ({
    lang: 'pl', user: null, wianki: 0, earned: 0,
    coupons: [], used: [], rewards: [], cart: {},
    store: 'poz-dab', orders: [], receipts: [],
    checkout: { mode: 'pickup', pay: 'blik', street: '', city: '' },
    wreath: { days: 0, last: null },
    ch: { visits: 0, kawa: 0, stores: [] }, chDone: [], geo: null,
  });
  let S = load();
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
      const st = { ...fresh(), ...raw };
      if (raw.list && !raw.cart) st.cart = { ...raw.list }; // migracja ze starej "listy zakupów"
      delete st.list; delete st.done;
      if (!SMAP.has(st.store)) st.store = 'poz-dab';
      if (st.user) st.user.card = cardFromPhone(st.user.phone);
      return st;
    } catch { return fresh(); }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* tryb prywatny */ }
  }

  // ---------- helpers ----------
  const t = (k) => (I18N[S.lang] && I18N[S.lang][k]) ?? I18N.pl[k] ?? k;
  const L = (o) => o[S.lang] || o.pl;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (id, cls = 'ico') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const zl = (n) => `${n.toFixed(2).replace('.', ',')} zł`;
  const priceHtml = (n) => { const [a, b] = n.toFixed(2).split('.'); return `${a}<small>,${b} zł</small>`; };
  const day = (d = new Date()) => d.toISOString().slice(0, 10);
  const locale = () => (S.lang === 'uk' ? 'uk-UA' : 'pl-PL');
  const fmtDate = (iso) => new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short' });
  const fmtTime = (iso) => new Date(iso).toLocaleString(locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const catName = (id) => L(CATEGORIES.find((c) => c.id === id) || { pl: '' });
  const productImg = (id) => (PMAP.get(id) || {}).img;
  const myStore = () => SMAP.get(S.store);

  // Ceny z aplikacją (demo): deterministyczny wybór ~25 produktów + kilka flagowych.
  const FEATURED = new Set([1990, 2005, 1597, 1421, 1437, 1540, 2004]);
  const APP_PRICE = new Map();
  P.forEach((p) => {
    if (!p.s) return;
    const h = (p.id * 2654435761) >>> 0;
    if (FEATURED.has(p.id) || h % 6 === 0) {
      const d = [0.12, 0.15, 0.2, 0.25][h % 4];
      const ap = Math.max(0.99, Math.floor(p.pr * (1 - d) * 10) / 10 - 0.01);
      if (ap < p.pr - 0.2) APP_PRICE.set(p.id, +ap.toFixed(2));
    }
  });
  // Okazja dnia (demo): co dzień inny produkt −30%, do północy.
  const FLASH = (() => {
    const pool = P.filter((p) => p.s && p.pr >= 8 && p.pr <= 70 && !/Kawior/.test(p.n));
    const dayNo = Math.floor(Date.now() / 86400000);
    const p = pool[(dayNo * 7919) % pool.length];
    return { id: p.id, price: +(Math.floor(p.pr * 0.7) + 0.49).toFixed(2) };
  })();
  const unitPrice = (p) => (p.id === FLASH.id ? FLASH.price : APP_PRICE.get(p.id) ?? p.pr);
  const promoPrice = (p) => (p.id === FLASH.id ? FLASH.price : APP_PRICE.get(p.id));

  const levelOf = (earned) => [...LEVELS].reverse().find((l) => earned >= l.min);
  const nextLevel = (earned) => LEVELS.find((l) => l.min > earned);
  const levelMult = (id) => ({ ziarno: 1, klos: 1.1, wianek: 1.25 }[id]);

  const couponMatches = (c, p) => {
    if (c.match.all) return false;
    const reOk = c.match.re ? new RegExp(c.match.re).test(p.n) : true;
    const catOk = c.match.cat ? p.c === c.match.cat : true;
    return reOk && catOk;
  };
  const rewardImg = (r) => (r.re ? (P.find((p) => new RegExp(r.re).test(p.n)) || {}).img : null);

  // ---------- stores ----------
  function storeStatus(store, now = new Date()) {
    const hoursFor = (dow) => (dow === 0 ? store.h.sun : dow === 6 ? store.h.sat : store.h.week);
    const today = hoursFor(now.getDay());
    const h = now.getHours() + now.getMinutes() / 60;
    if (today && h >= today[0] && h < today[1]) return { open: true, text: `${t('open')} · ${t('closes')} ${today[1]}:00` };
    if (today && h < today[0]) return { open: false, text: `${t('closed')} · ${t('opensDay')} ${today[0]}:00` };
    for (let i = 1; i <= 7; i++) {
      const dow = (now.getDay() + i) % 7;
      const hh = hoursFor(dow);
      if (hh) return { open: false, text: `${t('closed')} · ${t('opensDay')} ${i === 1 ? '' : t('days')[dow] + ' '}${hh[0]}:00` };
    }
    return { open: false, text: t('closed') };
  }
  const distKm = (a, b) => {
    const R = 6371, r = Math.PI / 180;
    const dLa = (b.lat - a.lat) * r, dLo = (b.lng - a.lng) * r;
    const x = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  };
  const withDist = (s) => (S.geo ? { ...s, d: distKm(S.geo, s) } : s);
  const routeUrl = (s) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${s.addr}, ${s.city}`)}`;
  const storeLabel = (s) => `${s.name} · ${s.city}`;

  // Stały numer karty klienta = EAN-13 wyliczony z numeru telefonu (290 + 9 cyfr + cyfra kontrolna).
  function cardFromPhone(phone) {
    const d = '290' + String(phone).replace(/\D/g, '').slice(-9).padStart(9, '0');
    const sum = [...d].reduce((s, n, i) => s + +n * (i % 2 ? 3 : 1), 0);
    return d + ((10 - (sum % 10)) % 10);
  }

  // ---------- basket pricing (kasa i zamówienia) ----------
  function priceBasket(lines, { order = false } = {}) {
    const subtotal = lines.reduce((s, l) => s + unitPrice(l.p) * l.q, 0);
    const regular = lines.reduce((s, l) => s + l.p.pr * l.q, 0);
    const discounts = [];
    let extraWianki = 0;
    S.coupons.forEach((cid) => {
      const c = COUPONS.find((x) => x.id === cid);
      if (!c) return;
      const matched = lines.filter((l) => couponMatches(c, l.p));
      const mSum = matched.reduce((s, l) => s + unitPrice(l.p) * l.q, 0);
      let d = 0;
      if (c.kind === 'percent') d = mSum * (c.value / 100);
      if (c.kind === 'gift') d = matched.reduce((s, l) => s + Math.floor(l.q / 3) * unitPrice(l.p), 0);
      if (c.kind === 'fixed' && subtotal >= c.min) d = c.value;
      if (c.kind === 'multiplier' && matched.length) extraWianki += Math.floor(mSum * (c.value - 1));
      if (d > 0 || (c.kind === 'multiplier' && matched.length)) discounts.push({ cid, name: L(c)[0], d: +d.toFixed(2) });
    });
    const qty = new Map(lines.map((l) => [l.p.id, l.q]));
    BUNDLES.forEach((b) => {
      if (!b.items.every((id) => qty.get(id) >= 1)) return;
      const sum = b.items.reduce((s, id) => s + unitPrice(PMAP.get(id)), 0);
      discounts.push({ name: `${t('bundleDisc')}: ${L(b)[0]}`, d: +(sum * BUNDLE_DISC).toFixed(2) });
    });
    if (order && !S.orders.length) {
      const rest = subtotal - discounts.reduce((s, x) => s + x.d, 0);
      const d = Math.min(FIRST_ORDER.max, rest * FIRST_ORDER.pct);
      if (d > 0) discounts.push({ name: t('firstOrder'), d: +d.toFixed(2) });
    }
    const disc = discounts.reduce((s, x) => s + x.d, 0);
    return { subtotal, regular, appSaved: regular - subtotal, discounts, disc, extraWianki, total: Math.max(0, subtotal - disc) };
  }
  const consumeCoupons = (discounts) => {
    discounts.forEach((x) => { if (x.cid && !S.used.includes(x.cid)) S.used.push(x.cid); });
    S.coupons = S.coupons.filter((cid) => !S.used.includes(cid));
  };
  const wiankiFor = (total, extra) => Math.floor(Math.floor(total) * levelMult(levelOf(S.earned).id)) + extra;

  function award(n) {
    S.wianki += n; S.earned += n;
  }
  function checkChallenges(storeId, lines) {
    S.ch.visits += 1;
    if (lines.some((l) => l.p.c === 'kawa')) S.ch.kawa += 1;
    if (storeId && !S.ch.stores.includes(storeId)) S.ch.stores.push(storeId);
    const done = [];
    CHALLENGES.forEach((c) => {
      if (!S.chDone.includes(c.id) && challengeProgress(c) >= c.goal) { S.chDone.push(c.id); award(c.bonus); done.push(c); }
    });
    return done;
  }
  function challengeProgress(c) {
    if (c.type === 'visits') return S.ch.visits;
    if (c.type === 'stores') return S.ch.stores.length;
    if (c.type === 'cat:kawa') return S.ch.kawa;
    return 0;
  }

  // ---------- toast / sheet / petals ----------
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  let lastFocus = null;
  const sheetChrome = (html) => `<div class="grabber"></div><button class="icon-btn sheet-close" data-act="close-sheet" aria-label="Zamknij">${icon('x')}</button>${html}`;
  function openSheet(html, label) {
    const open = $('.sheet');
    if (open && !open.classList.contains('closing')) {
      const top = open.scrollTop;
      open.innerHTML = sheetChrome(html);
      open.scrollTop = top;
      return;
    }
    lastFocus = document.activeElement;
    $('#sheet-root').innerHTML = `<div class="sheet-backdrop" data-act="close-sheet"></div>
      <section class="sheet" role="dialog" aria-modal="true" aria-label="${esc(label || '')}">${sheetChrome(html)}</section>`;
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('.sheet-close')?.focus(), 50);
  }
  function closeSheet() {
    const sh = $('.sheet');
    if (!sh) return;
    sh.classList.add('closing');
    $('.sheet-backdrop').classList.add('closing');
    setTimeout(() => {
      $('#sheet-root').innerHTML = '';
      document.body.style.overflow = '';
      lastFocus?.focus?.();
    }, 230);
  }

  function petals() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colors = ['--gold', '--cornflower', '--cream', '--teal-hi', '--copper-hi'].map(cssVar);
    for (let i = 0; i < 22; i++) {
      const el = document.createElement('div');
      el.className = 'petal-fall';
      el.style.left = `${Math.random() * 100}vw`;
      el.style.color = colors[i % colors.length];
      el.style.setProperty('--dx', `${(Math.random() - 0.5) * 160}px`);
      el.style.setProperty('--rot', `${Math.random() * 720 - 360}deg`);
      el.style.animationDelay = `${Math.random() * 500}ms`;
      el.innerHTML = `<svg width="18" height="18" aria-hidden="true"><use href="#i-flower"/></svg>`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3000);
    }
  }

  // ---------- reusable pieces ----------
  const cartCount = () => Object.values(S.cart).reduce((s, q) => s + q, 0);
  const cartLines = () => Object.keys(S.cart).map(Number).filter((id) => PMAP.has(id)).map((id) => ({ p: PMAP.get(id), q: S.cart[id] }));

  function productCard(p) {
    const ap = promoPrice(p);
    const q = S.cart[p.id] || 0;
    const tag = !p.s ? `<span class="oos-tag">${t('outOfStock')}</span>`
      : p.id === FLASH.id ? `<span class="app-tag flash">${icon('clock', 'ico-sm')}${t('flashKicker')}</span>`
      : ap ? `<span class="app-tag">${icon('flower', 'ico-sm')}${t('withApp')}</span>` : '';
    return `<article class="p-card">
      ${tag}
      <button class="p-open" data-act="product" data-id="${p.id}" aria-label="${esc(p.n)}">
        <div class="p-img"><img src="${p.img}" alt="" loading="lazy" decoding="async" width="200" height="200"></div>
        <div class="p-info">
          <div class="p-name">${esc(p.n)}</div>
          <div class="price-row">
            ${ap ? `<span class="price-old">${zl(p.pr)}</span><span class="price app">${priceHtml(ap)}</span>` : `<span class="price">${priceHtml(p.pr)}</span>`}
          </div>
        </div>
      </button>
      ${p.s ? `<button class="add-btn ${q ? 'in' : ''}" data-act="add" data-id="${p.id}" aria-label="${t('toCart')}: ${esc(p.n)}">${q ? `<span class="q num">${q}</span>` : icon('plus')}</button>` : ''}
    </article>`;
  }

  function couponCard(c, wide = false) {
    const on = S.coupons.includes(c.id);
    const used = S.used.includes(c.id);
    const [title, desc] = L(c);
    const img = c.img ? `<img src="${productImg(c.img)}" alt="">` : `<img class="c-emb" src="assets/emblem.webp" alt="">`;
    return `<article class="coupon ${wide ? 'coupon-wide' : ''} ${on ? 'is-on' : ''}">
      <div class="c-img">${img}</div>
      <div class="c-body">
        <div class="c-title">${esc(title)}</div>
        <div class="c-desc">${esc(desc)}</div>
        <div class="c-foot">
          <span class="c-date">${t('validTo')} ${fmtDate(c.ends)}</span>
          ${used ? `<span class="c-date">${icon('check', 'ico-sm')}</span>` : `<button class="toggle-btn ${on ? 'on' : ''}" data-act="coupon" data-id="${c.id}" aria-pressed="${on}">${on ? icon('check', 'ico-sm') + t('active') : t('activate')}</button>`}
        </div>
      </div>
    </article>`;
  }

  function wreathSvg(days) {
    const cx = 50, cy = 50, R = 36;
    const flowerCols = ['--cornflower', '--cream', '--cornflower', '--copper-hi', '--cream', '--cornflower', '--gold'].map(cssVar);
    let leaves = '', flowers = '';
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 - Math.PI / 2 + 0.22;
      const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
      leaves += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="7" ry="3" fill="${cssVar('--teal')}" opacity=".85" transform="rotate(${((a * 180) / Math.PI + 90).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
    }
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
      flowers += i < days
        ? `<g class="petal on" style="animation-delay:${i * 70}ms"><use href="#i-flower" x="${x - 12}" y="${y - 12}" width="24" height="24" style="color:${flowerCols[i]}"/></g>`
        : `<circle cx="${x}" cy="${y}" r="6.5" fill="none" stroke="${cssVar('--text-dim')}" stroke-dasharray="2 2.4" stroke-width="1.4"/>`;
    }
    return `<svg viewBox="0 0 100 100" role="img" aria-label="${days}/7">
      <circle cx="50" cy="50" r="36" fill="none" stroke="${cssVar('--gold-lo')}" stroke-width="1.5" opacity=".6"/>
      ${leaves}${flowers}
      <text x="50" y="55" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="15" fill="${cssVar('--text')}">${days}/7</text>
    </svg>`;
  }

  function topbar({ title, sub, back, right = '' }) {
    return `<header class="topbar">
      ${back ? `<button class="icon-btn" data-act="back" aria-label="Wstecz">${icon('back')}</button>` : `<img class="emblem" src="assets/emblem.webp" alt="Słowianoczka">`}
      <div class="grow">${sub ? `<div class="kicker">${sub}</div>` : ''}<h1 class="title">${title}</h1></div>
      ${right}
    </header>`;
  }
  const cartBtn = () => `<a class="icon-btn" href="#/cart" aria-label="${t('cart')}">${icon('cart')}${cartCount() ? `<span class="badge-dot num">${cartCount()}</span>` : ''}</a>`;

  // ---------- views ----------
  let cleanup = [];
  const runCleanup = () => { cleanup.forEach((f) => f()); cleanup = []; };

  // Główna = witryna sklepu: ma skłaniać do zamówienia w aplikacji od pierwszego ekranu.
  function storeStrip() {
    const s = myStore();
    const st = storeStatus(s);
    return `<a class="store-strip" href="#/stores" aria-label="${t('chooseStore')}">
      ${icon('pin', 'ico-sm')}
      <b>${esc(storeLabel(s))}</b>
      <span class="status ${st.open ? 'open' : 'closed'}">${st.text}</span>
      ${icon('chevdown', 'ico-sm')}
    </a>`;
  }

  // Jeden szablon banera: tekst w lewej kolumnie, zdjęcie w prawej — nic na siebie nie nachodzi.
  function bannerCard(b) {
    const pid = b.product === 'flash' ? FLASH.id : b.product;
    const p = pid ? PMAP.get(pid) : null;
    const img = p ? p.img : b.img;
    const title = b.title ? L(b.title) : p ? p.n : '';
    const price = b.price && p ? unitPrice(p) : null;
    const cta = b.cta ? (b.cta.add && p
      ? `<button class="btn btn-gold btn-sm" data-act="add" data-id="${p.id}">${icon('cart', 'ico-sm')}${L(b.cta)}</button>`
      : `<a class="btn btn-gold btn-sm" href="${b.cta.to || '#/shop'}">${L(b.cta)}${icon('chev', 'ico-sm')}</a>`) : '';
    return `<article class="banner-card theme-${b.theme}">
      <div class="bc-text">
        ${b.kicker ? `<span class="kicker">${esc(L(b.kicker))}</span>` : ''}
        <h2 class="bc-title">${esc(title)}</h2>
        ${b.desc ? `<p class="small">${esc(L(b.desc))}</p>` : ''}
        ${price != null ? `<div class="bc-price"><span class="price">${priceHtml(price)}</span>${price < p.pr ? `<s>${zl(p.pr)}</s>` : ''}</div>` : ''}
        ${b.countdown ? `<div class="small bc-timer">${icon('clock', 'ico-sm')}<b class="num" data-countdown>--:--:--</b></div>` : ''}
        ${cta}
      </div>
      ${p ? `<button class="bc-img" data-act="product" data-id="${p.id}" aria-label="${esc(p.n)}"><img src="${img}" alt=""></button>`
        : `<div class="bc-img photo"><img src="${img}" alt=""></div>`}
    </article>`;
  }
  function heroSlides() {
    const list = window.BANNERS.filter((b) => !(b.onlyFirstOrder && S.orders.length));
    return `<section class="hero-wrap" aria-label="Promocje">
      <div class="hero-rail" id="hero-rail">${list.map(bannerCard).join('')}</div>
      <div class="dots hero-dots">${list.map((_, i) => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('')}</div>
    </section>`;
  }

  function bundleCard(b) {
    const items = b.items.map((id) => PMAP.get(id)).filter(Boolean);
    const sum = items.reduce((s, p) => s + unitPrice(p), 0);
    const [title, desc] = L(b);
    const inCart = items.every((p) => S.cart[p.id]);
    return `<article class="bundle">
      <div class="bundle-imgs">${items.slice(0, 4).map((p) => `<img src="${p.img}" alt="" loading="lazy">`).join('')}</div>
      <div class="bundle-body">
        <div class="h3">${esc(title)}</div>
        <div class="small muted">${esc(desc)}</div>
        <div class="bundle-foot">
          <div><span class="price app">${priceHtml(sum * (1 - BUNDLE_DISC))}</span> <s class="small">${zl(sum)}</s></div>
          <button class="btn btn-sm ${inCart ? 'btn-mine' : 'btn-gold'}" data-act="bundle" data-id="${b.id}">${inCart ? icon('check', 'ico-sm') + t('inCart') : icon('plus', 'ico-sm') + t('addBundle')}</button>
        </div>
      </div>
    </article>`;
  }

  function viewHome() {
    const canPick = S.wreath.last !== day();
    const deals = [...APP_PRICE.entries()].map(([id, ap]) => ({ p: PMAP.get(id), save: PMAP.get(id).pr - ap })).sort((a, b) => b.save - a.save).slice(0, 10);
    return `<div class="view stagger">
      <header class="brandbar">
        <img class="emblem" src="assets/emblem.webp" alt="">
        <div class="grow"><div class="brand-name">Słowianoczka</div><div class="kicker">${t('brandSub')}</div></div>
        ${cartBtn()}
      </header>

      <nav class="stories rail" aria-label="${t('categories')}">${CATEGORIES.map((c) => `<a class="cat" href="#/shop?cat=${c.id}"><span class="ring"><img src="${c.img}" alt="" loading="lazy"></span><span>${L(c)}</span></a>`).join('')}</nav>

      ${storeStrip()}

      ${heroSlides()}

      <section class="section">
        <div class="section-head"><h2 class="h2">${t('yourCoupons')}</h2><a class="link" href="#/coupons">${t('seeAll')}${icon('chev', 'ico-sm')}</a></div>
        <div class="rail">${COUPONS.filter((c) => !S.used.includes(c.id)).slice(0, 5).map((c) => couponCard(c)).join('')}</div>
      </section>

      <section class="section">
        <div class="section-head"><div><h2 class="h2">${t('appPrices')}</h2><div class="small muted">${t('appPricesDesc')}</div></div><a class="link" href="#/shop?app=1">${t('seeAll')}${icon('chev', 'ico-sm')}</a></div>
        <div class="rail">${deals.map((d) => productCard(d.p)).join('')}</div>
      </section>

      <section class="section">
        <div class="wreath-card">
          <div class="wreath">${wreathSvg(S.wreath.days)}</div>
          <div class="wreath-body">
            <h2 class="h3">${t('daily')}</h2>
            <p class="small muted" style="margin:0 0 10px">${t('dailyDesc')}</p>
            <button class="btn btn-sm ${canPick ? 'btn-gold' : 'btn-ghost'}" data-act="pick" ${canPick ? '' : 'disabled'}>${icon('flower', 'ico-sm')}${canPick ? `${t('pick')} +${S.wreath.days === 6 ? 50 : 5}` : t('picked')}</button>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-head"><div><h2 class="h2">${t('bundles')}</h2><div class="small muted">${t('bundlesDesc')}</div></div></div>
        <div class="rail">${BUNDLES.map(bundleCard).join('')}</div>
      </section>
    </div>`;
  }
  function mountHome() {
    const els = document.querySelectorAll('[data-countdown]');
    const tick = () => {
      const now = new Date(), end = new Date(now); end.setHours(24, 0, 0, 0);
      const s = Math.max(0, Math.floor((end - now) / 1000));
      const txt = [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((n) => String(n).padStart(2, '0')).join(':');
      els.forEach((el) => { el.textContent = txt; });
    };
    tick();
    const iv = setInterval(tick, 1000);
    const rail = $('#hero-rail');
    const onScroll = () => {
      const i = Math.round(rail.scrollLeft / rail.clientWidth);
      document.querySelectorAll('.hero-dots i').forEach((d, j) => d.classList.toggle('on', j === i));
    };
    rail?.addEventListener('scroll', onScroll, { passive: true });
    // autoprzewijanie banerów, zatrzymane po dotknięciu
    let touched = false;
    rail?.addEventListener('pointerdown', () => { touched = true; }, { once: true });
    const auto = matchMedia('(prefers-reduced-motion: reduce)').matches ? null : setInterval(() => {
      if (touched || !rail) return;
      const n = rail.children.length, i = Math.round(rail.scrollLeft / rail.clientWidth);
      rail.scrollTo({ left: ((i + 1) % n) * (rail.clientWidth + 12), behavior: 'smooth' });
    }, 5000);
    cleanup.push(() => { clearInterval(iv); clearInterval(auto); });
  }

  const shopState = { cat: 'all', q: '', app: false };
  function filteredProducts() {
    const q = shopState.q.trim().toLowerCase();
    return P.filter((p) => (shopState.cat === 'all' || p.c === shopState.cat)
      && (!shopState.app || APP_PRICE.has(p.id))
      && (!q || p.n.toLowerCase().includes(q)))
      .sort((a, b) => b.s - a.s || (APP_PRICE.has(b.id) - APP_PRICE.has(a.id)));
  }
  function gridHtml() {
    const items = filteredProducts();
    return items.length ? `<div class="grid2">${items.map(productCard).join('')}</div>`
      : `<div class="empty">${icon('search', 'ico-xl')}<p class="muted">${t('noResults')}</p></div>`;
  }
  function viewShop(params) {
    if (params.cat) shopState.cat = params.cat;
    if (params.app) shopState.app = true;
    const chips = [{ id: 'all', name: t('all') }, ...CATEGORIES.map((c) => ({ id: c.id, name: L(c) }))];
    return `<div class="view">
      ${topbar({ title: t('nav_shop'), sub: `${P.length}+ ${t('products')}`, right: cartBtn() })}
      <div class="searchbar">
        <label class="search">${icon('search')}<span class="sr-only">${t('search')}</span><input id="q" type="search" placeholder="${t('search')}" value="${esc(shopState.q)}" autocomplete="off" enterkeyhint="search"></label>
        <div class="chips" role="toolbar">
          <button class="chip app" data-act="only-app" aria-pressed="${shopState.app}">${icon('flower', 'ico-sm')}${t('onlyApp')}</button>
          ${chips.map((c) => `<button class="chip" data-act="cat" data-id="${c.id}" aria-pressed="${shopState.cat === c.id}">${esc(c.name)}</button>`).join('')}
        </div>
      </div>
      <div id="grid">${gridHtml()}</div>
    </div>`;
  }

  function viewCard() {
    const lvl = levelOf(S.earned);
    const pending = S.rewards.length;
    return `<div class="view scan-wrap">
      <div class="kicker">${t('nav_card')}</div>
      <h1 class="h1">${t('cardTitle')}</h1>
      <div class="scan-card">
        <div class="scan-head">
          <div class="who"><b>${esc(S.user.name)}</b><span>${L(lvl)} · ${S.wianki} ${t('wianki')}</span></div>
          <img src="assets/emblem.webp" alt="">
        </div>
        <div class="seg" role="group">
          <button data-act="seg" data-id="qr" aria-pressed="true">QR</button>
          <button data-act="seg" data-id="bar" aria-pressed="false">EAN</button>
        </div>
        <div id="code-qr">
          <div class="qr-box">
                        <div id="qr" role="img" aria-label="Kod QR karty"></div>
            <span class="qr-emblem"><img src="assets/emblem.webp" alt=""></span>
          </div>
        </div>
        <div id="code-bar" hidden><svg id="barcode" role="img" aria-label="Kod kreskowy karty"></svg></div>
        <div class="card-no num">${S.user.card.replace(/(\d{4})(?=\d)/g, '$1 ')}</div>
      </div>
      <p class="small muted" style="margin:12px 4px 0">${t('cardHint')}</p>
      <div class="scan-meta">
        <a class="meta-row" href="#/coupons">${icon('ticket')}<span class="grow"><b>${S.coupons.length}</b> ${t('couponsOn')}</span>${icon('chev', 'ico-sm')}</a>
        ${pending ? `<a class="meta-row" href="#/coupons?tab=rewards">${icon('gift')}<span class="grow"><b>${pending}</b> ${t('rewardsReady')}</span>${icon('chev', 'ico-sm')}</a>` : ''}
        <div class="meta-row">${icon('sun')}<span class="small">${t('brightness')}</span></div>
      </div>
      <button class="btn btn-ghost btn-block" style="margin-top:16px" data-act="simulate">${icon('receipt')}${t('simulate')}</button>
    </div>`;
  }
  function mountCard() {
    const ink = cssVar('--ink'), paper = cssVar('--paper');
    if (window.QRCode) new window.QRCode($('#qr'), { text: `SLW:${S.user.card}`, width: 392, height: 392, colorDark: ink, colorLight: paper, correctLevel: window.QRCode.CorrectLevel.H });
    if (window.JsBarcode) window.JsBarcode('#barcode', S.user.card, { format: 'EAN13', lineColor: ink, background: paper, height: 64, width: 2.2, displayValue: false, margin: 0 });
    let lock = null;
    if ('wakeLock' in navigator) navigator.wakeLock.request('screen').then((l) => { lock = l; }).catch(() => {});
    cleanup.push(() => { lock?.release?.(); });
  }

  let couponTab = 'coupons';
  function viewCoupons(params) {
    if (params.tab) couponTab = params.tab;
    const tabs = ['coupons', 'rewards', 'challenges'];
    let body = '';
    if (couponTab === 'coupons') {
      body = `<p class="small muted">${t('couponsLead')}</p><div class="stack stagger">${COUPONS.map((c) => couponCard(c, true)).join('')}</div>`;
    } else if (couponTab === 'rewards') {
      body = `<p class="small muted">${t('rewardsLead')}</p><div class="stack stagger">${REWARDS.map((r) => {
        const pending = S.rewards.filter((x) => x === r.id).length;
        const lack = r.cost - S.wianki;
        return `<article class="reward">
          <div class="r-img ${r.bon ? 'bon' : ''}">${r.bon ? `${r.bon} zł` : `<img src="${rewardImg(r)}" alt="">`}</div>
          <div class="grow">
            <div class="h3">${esc(L(r))}</div>
            <div class="cost">${icon('flower', 'ico-sm')}${r.cost}</div>
            ${pending ? `<div class="pill" style="margin-top:4px">${icon('check', 'ico-sm')}${t('redeemed')}${pending > 1 ? ` ×${pending}` : ''}</div>` : ''}
          </div>
          <button class="btn btn-sm ${lack > 0 ? 'btn-ghost' : 'btn-gold'}" data-act="redeem" data-id="${r.id}" ${lack > 0 ? 'disabled' : ''}>${lack > 0 ? `${t('notEnough')} ${lack}` : t('redeem')}</button>
        </article>`;
      }).join('')}</div>`;
    } else {
      body = `<p class="small muted">${t('challengesLead')}</p><div class="stack stagger">${CHALLENGES.map((c) => {
        const prog = Math.min(c.goal, challengeProgress(c));
        const done = S.chDone.includes(c.id);
        const [title, desc] = L(c);
        return `<article class="challenge ${done ? 'done' : ''}">
          <div class="row">
            <span class="c-ico">${icon(done ? 'check' : 'trophy')}</span>
            <div class="grow" style="flex:1"><div class="h3">${esc(title)}</div><div class="small muted">${esc(desc)}</div></div>
            <span class="pill">+${c.bonus}</span>
          </div>
          <div class="progress" role="progressbar" aria-valuenow="${prog}" aria-valuemin="0" aria-valuemax="${c.goal}"><i style="width:${(prog / c.goal) * 100}%"></i></div>
          <div class="small muted" style="margin-top:6px">${prog} / ${c.goal}</div>
        </article>`;
      }).join('')}</div>`;
    }
    return `<div class="view">
      ${topbar({ title: t('nav_coupons'), sub: `${S.wianki} ${t('wianki')}` })}
      <div class="tabs" role="tablist">${tabs.map((k) => `<button role="tab" aria-selected="${couponTab === k}" data-act="tab" data-id="${k}">${t('tab_' + k)}</button>`).join('')}</div>
      ${body}
    </div>`;
  }

  function orderStatus(o) {
    const min = (Date.now() - new Date(o.date).getTime()) / 60000;
    const steps = o.mode === 'pickup' ? ['st_new', 'st_pack', 'st_ready'] : ['st_new', 'st_pack', 'st_way', 'st_done'];
    const idx = Math.min(steps.length - 1, min < 1 ? 0 : min < 3 ? 1 : min < 10 ? 2 : 3);
    return { steps, idx };
  }

  function viewAccount() {
    const lvl = levelOf(S.earned);
    const idx = LEVELS.indexOf(lvl);
    const nxt = nextLevel(S.earned);
    const pct = nxt ? Math.min(100, ((S.earned - lvl.min) / (nxt.min - lvl.min)) * 100) : 100;
    return `<div class="view stagger">
      <div class="profile">
        <span class="avatar">${esc(S.user.name.charAt(0).toUpperCase())}</span>
        <div><h1 class="h1">${esc(S.user.name)}</h1><div class="small muted">+48 ${esc(S.user.phone)} · ${t('member')} ${fmtDate(S.user.since)}</div></div>
      </div>

      <section class="loyal" style="margin-top:20px">
        <div class="loyal-top">
          <div>
            <div class="kicker">${t('balance')}</div>
            <div class="balance"><svg class="flower" aria-hidden="true"><use href="#i-flower"/></svg><span class="big num">${S.wianki}</span></div>
          </div>
          <span class="level-chip">${icon('star', 'ico-sm')}${L(lvl)}</span>
        </div>
        <div class="stat-row">
          <div><span class="small muted">${t('collected')}</span><b class="num">${S.earned}</b></div>
          <div><span class="small muted">${nxt ? `${t('toNext')} ${L(nxt)}` : t('topLevel')}</span><b class="num">${nxt ? nxt.min - S.earned : '✓'}</b></div>
        </div>
        <div class="progress" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100" style="margin-bottom:12px"><i style="width:${pct}%"></i></div>
      </section>

      <section class="section">
        <div class="section-head"><h2 class="h2">${t('levelsTitle')}</h2></div>
        <p class="small muted" style="margin-top:0">${t('levelsInfo')}</p>
        <div class="stack">${LEVELS.map((l, i) => {
          const state = i === idx ? 'cur' : i < idx ? 'past' : 'lock';
          const pill = state === 'cur' ? `<span class="pill">${t('yourLevel')}</span>`
            : state === 'past' ? `<span class="pill ok">${icon('check', 'ico-sm')}${t('unlocked')}</span>`
            : `<span class="pill dim">${t('locked')} ${l.min - S.earned}</span>`;
          return `<article class="lvl-card ${state}">
            <div class="lvl-head">
              <span class="lvl-ico">${icon(i === 2 ? 'star' : 'flower')}</span>
              <div class="grow"><b>${L(l)}</b><span class="small muted">${t('from')} ${l.min} ${t('wianki')}</span></div>
              ${pill}
            </div>
            <ul class="perks">${L(l.perks).map((p) => `<li>${icon(state === 'lock' ? 'lock' : 'check', 'ico-sm')}<span>${esc(p)}</span></li>`).join('')}</ul>
          </article>`;
        }).join('')}</div>
        <div class="earn-how">
          <h3 class="h3">${t('howEarn')}</h3>
          ${['earn1', 'earn2', 'earn3'].map((k, i) => `<div class="perk">${icon(['receipt', 'flower', 'trophy'][i], 'ico-sm')}<span>${t(k)}</span></div>`).join('')}
        </div>
      </section>

      <section class="section">
        <div class="section-head"><h2 class="h2">${t('orders')}</h2></div>
        <div class="menu">${S.orders.length ? S.orders.slice(0, 6).map((o, i) => {
          const st = orderStatus(o);
          return `<button class="receipt menu-item" data-act="order" data-id="${i}">
            ${icon(o.mode === 'pickup' ? 'store' : 'truck')}<span class="grow"><b>${o.no}</b> · <span class="num">${zl(o.total)}</span><br><span class="small muted">${fmtDate(o.date)} · ${t(st.steps[st.idx])}</span></span>${icon('chev', 'ico chev')}</button>`;
        }).join('') : `<div class="receipt"><span class="small muted">${t('noOrders')}</span></div>`}</div>
      </section>

      <section class="section">
        <div class="section-head"><h2 class="h2">${t('receipts')}</h2></div>
        <div class="menu">${S.receipts.length ? S.receipts.slice(0, 8).map((r, i) => `<button class="receipt menu-item" data-act="receipt" data-id="${i}">
            ${icon('receipt')}<span class="grow"><b class="num">${zl(r.total)}</b><br><span class="small muted">${fmtDate(r.date)} · ${esc(r.store)}</span></span><span class="cost">+${r.earned}</span></button>`).join('')
          : `<div class="receipt"><span class="small muted">${t('noReceipts')}</span></div>`}</div>
      </section>

      <section class="section">
        <div class="menu">
          <a class="menu-item" href="#/cart">${icon('cart')}<span class="grow">${t('cart')}</span>${cartCount() ? `<span class="pill">${cartCount()}</span>` : ''}${icon('chev', 'ico chev')}</a>
          <a class="menu-item" href="#/stores">${icon('store')}<span class="grow">${t('yourStore')}<br><span class="small muted">${esc(storeLabel(myStore()))}</span></span>${icon('chev', 'ico chev')}</a>
          <div class="menu-item">${icon('globe')}<span class="grow">${t('language')}</span>
            <span class="lang-switch" role="group"><button data-act="lang" data-id="pl" aria-pressed="${S.lang === 'pl'}">PL</button><button data-act="lang" data-id="uk" aria-pressed="${S.lang === 'uk'}">UA</button></span></div>
          <button class="menu-item" data-act="logout">${icon('logout')}<span class="grow">${t('logout')}</span></button>
        </div>
      </section>
    </div>`;
  }

  // ---------- stores ----------
  let storeCity = 'all';
  let mapRef = null;
  function storesList() {
    const list = STORES.map(withDist).filter((s) => storeCity === 'all' || s.city === storeCity);
    if (S.geo) list.sort((a, b) => a.d - b.d);
    return list.map((s) => {
      const st = storeStatus(s);
      const mine = s.id === S.store;
      return `<article class="store-card ${mine ? 'mine' : ''}" id="st-${s.id}">
        <div class="sc-top">
          <span class="store-pin">${icon('store')}</span>
          <div class="grow"><b>${esc(s.name)}</b><br><span class="small muted">${esc(s.addr)}, ${esc(s.city)}${s.d != null ? ` · ${s.d.toFixed(1)} ${t('km')}` : ''}</span><br>
          <span class="status ${st.open ? 'open' : 'closed'}">${st.text}</span></div>
        </div>
        <div class="store-actions">
          ${mine ? `<span class="btn btn-sm btn-mine">${icon('check', 'ico-sm')}${t('chosenShort')}</span>` : `<button class="btn btn-sm btn-gold" data-act="choose-store" data-id="${s.id}">${t('choose')}</button>`}
          <a class="btn btn-sm btn-ghost" target="_blank" rel="noopener" href="${routeUrl(s)}">${icon('nav', 'ico-sm')}${t('route')}</a>
          <a class="icon-btn" href="tel:${SHOP_PHONE}" aria-label="${t('call')}">${icon('phone', 'ico-sm')}</a>
        </div>
      </article>`;
    }).join('');
  }
  function viewStores() {
    const cities = [...new Set(STORES.map((s) => s.city))];
    return `<div class="view">
      ${topbar({ title: t('chooseStore'), sub: `${STORES.length} ${t('storesIn')}`, back: true, right: `<button class="icon-btn" data-act="nearest" aria-label="GPS">${icon('nav')}</button>` })}
      <div id="map" class="map" role="region" aria-label="Mapa sklepów"></div>
      <div class="chips" role="toolbar" style="margin-bottom:12px">
        ${['all', ...cities].map((c) => `<button class="chip" data-act="city" data-id="${c}" aria-pressed="${storeCity === c}">${c === 'all' ? t('all') : c} <span class="muted num">${c === 'all' ? STORES.length : STORES.filter((s) => s.city === c).length}</span></button>`).join('')}
      </div>
      <div class="stack" id="store-list">${storesList()}</div>
    </div>`;
  }
  function mapPalette(map) {
    const C = {
      bg: cssVar('--map-land'), water: cssVar('--map-water'), park: cssVar('--map-park'), bld: cssVar('--map-building'),
      road: cssVar('--map-road'), roadMaj: cssVar('--map-road-major'), border: cssVar('--gold'), text: cssVar('--text-muted'), halo: cssVar('--bg'),
    };
    const set = (id, prop, val) => { try { map.setPaintProperty(id, prop, val); } catch { /* warstwa bez tej właściwości */ } };
    map.getStyle().layers.forEach(({ id, type }) => {
      if (type === 'background') set(id, 'background-color', C.bg);
      else if (type === 'fill') {
        if (/wood|ice|glacier/.test(id)) { try { map.setLayoutProperty(id, 'visibility', 'none'); } catch { /* */ } return; }
        set(id, 'fill-color', /water/.test(id) ? C.water : /park|wood|grass/.test(id) ? C.park : /building/.test(id) ? C.bld : C.bg);
        set(id, 'fill-outline-color', 'rgba(0,0,0,0)');
      } else if (type === 'line') {
        if (/water/.test(id)) set(id, 'line-color', C.water);
        else if (/boundary/.test(id)) { set(id, 'line-color', C.border); set(id, 'line-opacity', 0.45); }
        else if (/casing/.test(id)) set(id, 'line-color', C.bg);
        else if (/motorway|major/.test(id)) set(id, 'line-color', C.roadMaj);
        else set(id, 'line-color', C.road);
      } else if (type === 'symbol') {
        if (/shield|airport|path|minor|waterway/.test(id)) { try { map.setLayoutProperty(id, 'visibility', 'none'); } catch { /* */ } return; }
        set(id, 'text-color', /water/.test(id) ? C.water : C.text);
        set(id, 'text-halo-color', C.halo);
      }
    });
  }
  function mountStores() {
    if (!window.maplibregl) return;
    const map = new window.maplibregl.Map({
      container: 'map', style: 'https://tiles.openfreemap.org/styles/positron',
      center: [17.5, 52.6], zoom: 5, attributionControl: false, dragRotate: false, pitchWithRotate: false,
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new window.maplibregl.AttributionControl({ compact: true }));
    map.on('load', () => { fitStores(map, false); map.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show'); });
    map.on('style.load', () => mapPalette(map));
    const mk = (s) => {
      const el = document.createElement('button');
      el.className = `map-pin ${s.id === S.store ? 'sel' : ''}`;
      el.setAttribute('aria-label', storeLabel(s));
      el.innerHTML = `<svg aria-hidden="true"><use href="#i-flower"/></svg>`;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        map.flyTo({ center: [s.lng, s.lat], zoom: Math.max(map.getZoom(), 12) });
        if (storeCity !== 'all' && storeCity !== s.city) { storeCity = 'all'; refreshStores(); }
        const card = $(`#st-${s.id}`);
        card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card?.classList.add('flash');
        setTimeout(() => card?.classList.remove('flash'), 1200);
      });
      return el;
    };
    STORES.forEach((s) => new window.maplibregl.Marker({ element: mk(s) }).setLngLat([s.lng, s.lat]).addTo(map));
    if (S.geo) {
      const me = document.createElement('div');
      me.className = 'map-me';
      new window.maplibregl.Marker({ element: me }).setLngLat([S.geo.lng, S.geo.lat]).addTo(map);
    }
    fitStores(map, false);
    mapRef = map;
    cleanup.push(() => { map.remove(); mapRef = null; });
  }
  function fitStores(map, animate = true) {
    const pts = STORES.filter((s) => storeCity === 'all' || s.city === storeCity).map((s) => [s.lng, s.lat]);
    if (S.geo && storeCity === 'all') pts.push([S.geo.lng, S.geo.lat]);
    if (pts.length === 1) { map.flyTo({ center: pts[0], zoom: 13, animate }); return; }
    const lngs = pts.map((p) => p[0]), lats = pts.map((p) => p[1]);
    map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 40, maxZoom: 13, animate });
  }
  function refreshStores() {
    $('#store-list').innerHTML = storesList();
    document.querySelectorAll('[data-act="city"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === storeCity)));
    document.querySelectorAll('.map-pin').forEach((el) => el.classList.toggle('sel', el.getAttribute('aria-label') === storeLabel(myStore())));
  }

  // ---------- cart ----------
  function viewCart() {
    const lines = cartLines();
    if (!lines.length) {
      return `<div class="view">${topbar({ title: t('cart'), back: true })}
        <div class="empty">${icon('cart', 'ico-xl')}<h2 class="h2">${t('cartEmpty')}</h2><p class="muted">${t('cartEmptyDesc')}</p><a class="btn btn-gold" href="#/shop">${t('goShop')}</a></div></div>`;
    }
    const pr = priceBasket(lines, { order: true });
    const co = S.checkout;
    const courier = co.mode === 'courier';
    const fee = courier && pr.total < DELIVERY.free ? DELIVERY.fee : 0;
    const total = pr.total + fee;
    const earn = wiankiFor(pr.total, pr.extraWianki) * 2;
    const lack = DELIVERY.free - pr.total;
    const s = myStore();
    return `<div class="view">
      ${topbar({ title: t('cart'), sub: `${cartCount()} ${t('items')}`, back: true })}
      <div class="stack">${lines.map(({ p, q }) => `<div class="list-item">
          <span class="li-img"><img src="${p.img}" alt="" loading="lazy"></span>
          <div style="flex:1;min-width:0"><div class="li-name">${esc(p.n)}</div>
            <div class="small">${promoPrice(p) ? `<b class="gold">${zl(unitPrice(p))}</b> <s class="muted">${zl(p.pr)}</s>` : `<span class="muted">${zl(p.pr)}</span>`}</div></div>
          <span class="stepper"><button data-act="dec" data-id="${p.id}" aria-label="−">${icon('minus', 'ico-sm')}</button><span class="num">${q}</span><button data-act="inc" data-id="${p.id}" aria-label="+">${icon('plus', 'ico-sm')}</button></span>
        </div>`).join('')}</div>

      <section class="section">
        <h2 class="h2" style="margin-bottom:12px">${t('howGet')}</h2>
        <div class="stack">
          <button class="opt ${!courier ? 'on' : ''}" data-act="mode" data-id="pickup" aria-pressed="${!courier}">
            <span class="opt-ico">${icon('store')}</span>
            <span class="grow"><b>${t('pickup')}</b><span class="small muted">${esc(storeLabel(s))} · ${t('pickupDesc')}</span></span>
            <span class="opt-price">${t('free')}</span>
          </button>
          ${!courier ? `<a class="link" href="#/stores" style="margin-top:-6px">${t('chooseStore')}${icon('chev', 'ico-sm')}</a>` : ''}
          <button class="opt ${courier ? 'on' : ''}" data-act="mode" data-id="courier" aria-pressed="${courier}">
            <span class="opt-ico">${icon('truck')}</span>
            <span class="grow"><b>${t('courier')}</b><span class="small muted">${t('courierDesc')}</span></span>
            <span class="opt-price">${pr.total >= DELIVERY.free ? t('free') : zl(DELIVERY.fee)}</span>
          </button>
        </div>
        ${courier ? `
          <div class="free-bar">
            <div class="small">${lack > 0 ? `${t('toFree')} <b class="gold">${zl(lack)}</b>` : `${icon('check', 'ico-sm')} ${t('freeOk')}`}</div>
            <div class="progress"><i style="width:${Math.min(100, (pr.total / DELIVERY.free) * 100)}%"></i></div>
          </div>
          <div class="field" style="margin-top:16px"><label for="f-street">${t('street')}</label><input class="input" id="f-street" data-co="street" autocomplete="street-address" value="${esc(co.street)}"></div>
          <div class="field"><label for="f-city">${t('city')}</label><input class="input" id="f-city" data-co="city" autocomplete="address-level2" value="${esc(co.city)}"></div>` : ''}
      </section>

      <section class="section">
        <h2 class="h2" style="margin-bottom:12px">${t('payment')}</h2>
        <div class="chips" style="margin-top:0">${['blik', 'card', 'cash'].map((m) => `<button class="chip" data-act="pay" data-id="${m}" aria-pressed="${co.pay === m}">${t('pay' + m[0].toUpperCase() + m.slice(1))}</button>`).join('')}</div>
        <p class="small muted">${t('payDemo')}</p>
      </section>

      <section class="section summary">
        <div class="r-line"><span>${t('subtotal')}</span><span class="num">${zl(pr.regular)}</span></div>
        ${pr.appSaved > 0.001 ? `<div class="r-line disc"><span>${t('appSave')}</span><span class="num">−${zl(pr.appSaved)}</span></div>` : ''}
        ${pr.discounts.map((d) => `<div class="r-line disc"><span>${esc(d.name)}</span><span class="num">${d.d ? `−${zl(d.d)}` : '✓'}</span></div>`).join('')}
        <div class="r-line"><span>${t('delivery')}</span><span class="num">${fee ? zl(fee) : t('free')}</span></div>
        <div class="r-line tot"><span>${t('total')}</span><span class="num">${zl(total)}</span></div>
        <div class="small gold" style="text-align:right">+${earn} ${t('wianki')} · ${t('x2Note')}</div>
      </section>

      <div class="order-bar">
        <button class="btn btn-gold btn-block" data-act="place-order">${t('order')} · ${zl(total)}</button>
      </div>
    </div>`;
  }

  function placeOrder() {
    const co = S.checkout;
    if (co.mode === 'courier' && (!co.street.trim() || !co.city.trim())) {
      toast(t('fillAddr'));
      (co.street.trim() ? $('#f-city') : $('#f-street'))?.focus();
      return;
    }
    const lines = cartLines();
    const pr = priceBasket(lines, { order: true });
    const fee = co.mode === 'courier' && pr.total < DELIVERY.free ? DELIVERY.fee : 0;
    consumeCoupons(pr.discounts);
    const earned = wiankiFor(pr.total, pr.extraWianki) * 2;
    award(earned);
    const done = checkChallenges(co.mode === 'pickup' ? S.store : null, lines);
    const o = {
      no: `SL-${Math.floor(10000 + Math.random() * 89999)}`, date: new Date().toISOString(), mode: co.mode, pay: co.pay,
      store: S.store, address: co.mode === 'courier' ? `${co.street}, ${co.city}` : null,
      lines: lines.map((l) => ({ id: l.p.id, n: l.p.n, q: l.q, s: +(unitPrice(l.p) * l.q).toFixed(2) })),
      disc: pr.discounts.map(({ name, d }) => ({ name, d })), fee, total: +(pr.total + fee).toFixed(2), saved: +(pr.appSaved + pr.disc).toFixed(2),
      earned: earned + done.reduce((s, c) => s + c.bonus, 0),
    };
    S.orders.unshift(o);
    S.cart = {};
    save();
    rerender();
    renderTabbar(parseHash().route);
    showOrder(o, true);
    petals();
  }

  function showOrder(o, fresh = false) {
    const st = orderStatus(o);
    const s = SMAP.get(o.store);
    openSheet(`<div class="success">
      ${fresh ? `<div class="burst"><svg class="ico" aria-hidden="true"><use href="#i-flower"/></svg></div><h2 class="h1">${t('orderDone')}</h2>` : `<h2 class="h1" style="margin-top:12px">${t('orderNo')} ${o.no}</h2>`}
      ${fresh ? `<p class="muted" style="margin:4px 0 0">${t('orderNo')} <b class="gold">${o.no}</b></p>` : ''}
      <div class="earn-grid">
        <div><b class="num">+${o.earned}</b><span>${t('earned')}</span></div>
        <div><b class="num">${zl(o.saved)}</b><span>${t('saved')}</span></div>
      </div>
      <ol class="timeline">${st.steps.map((k, i) => `<li class="${i < st.idx ? 'done' : i === st.idx ? 'now' : ''}"><span class="dot">${i < st.idx ? icon('check', 'ico-sm') : ''}</span>${t(k)}</li>`).join('')}</ol>
      <div class="meta-row" style="margin-top:12px;text-align:left">${icon(o.mode === 'pickup' ? 'store' : 'truck')}<span class="grow">${o.mode === 'pickup' ? `<b>${t('pickup')}</b><br><span class="small muted">${esc(s.name)} · ${esc(s.addr)}, ${esc(s.city)}</span>` : `<b>${t('courier')}</b><br><span class="small muted">${esc(o.address)}</span>`}</span></div>
      <div class="r-lines">
        <div class="small" style="color:var(--ink-2);margin-bottom:8px">${fmtTime(o.date)} · ${t('pay' + o.pay[0].toUpperCase() + o.pay.slice(1))}</div>
        ${o.lines.map((l) => `<div class="r-line"><span class="nm">${l.q > 1 ? `${l.q}× ` : ''}${esc(l.n)}</span><span class="num">${zl(l.s)}</span></div>`).join('')}
        ${o.disc.map((d) => `<div class="r-line disc"><span class="nm">${esc(d.name)}</span><span class="num">${d.d ? `−${zl(d.d)}` : '✓'}</span></div>`).join('')}
        <div class="r-line"><span>${t('delivery')}</span><span class="num">${o.fee ? zl(o.fee) : t('free')}</span></div>
        <div class="r-line tot"><span>${t('total')}</span><span class="num">${zl(o.total)}</span></div>
      </div>
      ${fresh ? `<button class="btn btn-gold btn-block" style="margin-top:16px" data-act="close-sheet">${t('done')}</button>` : ''}
    </div>`, t('orderNo'));
  }

  // ---------- onboarding ----------
  let obStep = 0;
  function obArt(step) {
    const orbit = (id, x, y, s = 74) => `<span class="orbit" style="width:${s}px;height:${s}px;transform:translate(${x}px,${y}px)"><img src="${productImg(id)}" alt=""></span>`;
    if (step === 0) return `<div class="halo"></div>${orbit(1990, -120, -90)}${orbit(1421, 118, -60, 66)}${orbit(1597, -104, 104, 64)}${orbit(1437, 112, 96)}<img class="emblem-xl" src="assets/emblem.webp" alt="">`;
    if (step === 1) return `<div class="halo"></div><div class="scan-card" style="width:220px;transform:rotate(-6deg);padding:26px 18px 16px;margin:0"><div style="width:150px;height:150px;margin:0 auto;display:grid;place-items:center;background:var(--paper)">${icon('qr', 'ico-xl')}</div><div class="card-no" style="margin-top:8px">2900 •••• ••••</div></div>`;
    return `<div class="halo"></div>${orbit(2005, -112, -84, 84)}${orbit(1380, 116, -70, 66)}${orbit(1421, 104, 96, 74)}<div class="balance" style="position:relative"><svg class="flower" style="width:110px;height:110px" aria-hidden="true"><use href="#i-flower"/></svg></div>`;
  }
  function viewOnboarding() {
    if (obStep < 3) {
      const k = `ob${obStep + 1}`;
      return `<div class="view ob">
        <button class="ob-skip" data-act="ob-skip">${t('skip')}</button>
        <div class="ob-art" aria-hidden="true">${obArt(obStep)}</div>
        <div class="ob-text">
          <div class="dots">${[0, 1, 2].map((i) => `<i class="${i === obStep ? 'on' : ''}"></i>`).join('')}</div>
          <div class="kicker">${t(k + 'k')}</div>
          <h1 class="display">${t(k + 't')}</h1>
          <p class="muted" style="margin:0 0 24px">${t(k + 'd')}</p>
          <button class="btn btn-gold btn-block" data-act="ob-next">${obStep === 2 ? t('start') : t('next')}</button>
        </div>
      </div>`;
    }
    return `<div class="view ob">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <img src="assets/logo-site.png" alt="Słowianoczka" style="height:38px">
        <span class="lang-switch" role="group"><button data-act="lang" data-id="pl" aria-pressed="${S.lang === 'pl'}">PL</button><button data-act="lang" data-id="uk" aria-pressed="${S.lang === 'uk'}">UA</button></span>
      </div>
      <div style="margin-top:auto">
        <div class="kicker">${t('ob2k')}</div>
        <h1 class="display" style="margin:12px 0 4px">${t('login')}</h1>
        <div class="stitch-rule"></div>
        <form id="join" novalidate>
          <div class="field"><label for="f-name">${t('name')}</label><input class="input" id="f-name" name="name" autocomplete="given-name" placeholder="${t('namePh')}" required maxlength="30"></div>
          <div class="field"><label for="f-phone">${t('phone')}</label><div class="prefix-wrap"><span class="prefix">+48</span><input class="input" style="flex:1" id="f-phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="600 000 000" required></div></div>
          <button class="btn btn-gold btn-block" type="submit">${icon('flower', 'ico-sm')}${t('join')}</button>
          <p class="small muted" style="text-align:center">${t('terms')}</p>
        </form>
      </div>
    </div>`;
  }

  // ---------- router ----------
  function parseHash() {
    const [path, qs] = location.hash.replace(/^#\/?/, '').split('?');
    return { route: path || 'home', params: Object.fromEntries(new URLSearchParams(qs || '')) };
  }

  function renderTabbar(route) {
    const bar = $('#tabbar');
    if (!S.user) { bar.hidden = true; return; }
    bar.hidden = false;
    const fresh = COUPONS.filter((c) => !S.coupons.includes(c.id) && !S.used.includes(c.id)).length;
    const tab = (id, ico, label, extra = '') => `<a class="tab" href="#/${id}" ${route === id ? 'aria-current="page"' : ''}>${icon(ico)}<span>${label}</span>${extra}</a>`;
    bar.innerHTML = tab('home', 'home', t('nav_home'))
      + tab('shop', 'bag', t('nav_shop'))
      + `<a class="tab tab-card" href="#/card" ${route === 'card' ? 'aria-current="page"' : ''} aria-label="${t('nav_card')}"><span class="fab">${icon('qr')}</span><span>${t('nav_card')}</span></a>`
      + tab('coupons', 'ticket', t('nav_coupons'), fresh ? `<span class="badge-dot">${fresh}</span>` : '')
      + tab('account', 'user', t('nav_account'));
  }

  function renderMinicart(route) {
    const bar = $('#minicart');
    const show = S.user && cartCount() > 0 && (route === 'home' || route === 'shop');
    document.body.classList.toggle('has-mini', !!show);
    if (!show) { bar.hidden = true; return; }
    const pr = priceBasket(cartLines(), { order: true });
    const lack = DELIVERY.free - pr.total;
    bar.hidden = false;
    bar.innerHTML = `<a class="mini" href="#/cart">
      <span class="mini-count num">${cartCount()}</span>
      <span class="grow"><b class="num">${zl(pr.total)}</b><span class="small">${lack > 0 ? `${zl(lack)} ${t('freeLeft')}` : t('freeDone')}</span>
        <span class="mini-prog"><i style="width:${Math.min(100, (pr.total / DELIVERY.free) * 100)}%"></i></span></span>
      <span class="mini-go">${t('goCart')}${icon('chev', 'ico-sm')}</span>
    </a>`;
  }

  function render(keepScroll = false) {
    runCleanup();
    const { route, params } = parseHash();
    const app = $('#app');
    const y = window.scrollY;
    document.documentElement.lang = S.lang === 'uk' ? 'uk' : 'pl';
    if (!S.user) {
      app.classList.add('no-tabbar');
      app.innerHTML = viewOnboarding();
      renderTabbar(route);
      renderMinicart(route);
      return;
    }
    app.classList.remove('no-tabbar');
    const views = { home: viewHome, shop: viewShop, card: viewCard, coupons: viewCoupons, account: viewAccount, stores: viewStores, cart: viewCart };
    app.innerHTML = (views[route] || viewHome)(params);
    renderTabbar(route);
    renderMinicart(route);
    if (route === 'home') mountHome();
    if (route === 'card') mountCard();
    if (route === 'stores') mountStores();
    if (route === 'shop') {
      document.querySelector('.chips .chip[aria-pressed="true"][data-act="cat"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
      if (params.focus) setTimeout(() => $('#q')?.focus(), 60);
    }
    if (keepScroll) { app.querySelectorAll('.view, .stagger > *').forEach((el) => { el.style.animation = 'none'; }); window.scrollTo(0, y); } else window.scrollTo(0, 0);
  }
  const rerender = () => render(true);

  // ---------- actions ----------
  function addToCart(id, delta = 1) {
    S.cart[id] = (S.cart[id] || 0) + delta;
    if (S.cart[id] <= 0) delete S.cart[id];
    save();
  }

  let sheetProduct = null;
  function openProduct(id) {
    sheetProduct = id;
    const p = PMAP.get(id);
    const ap = promoPrice(p);
    const qty = S.cart[id] || 0;
    const coupons = COUPONS.filter((c) => couponMatches(c, p) && !S.used.includes(c.id));
    const related = P.filter((x) => x.c === p.c && x.id !== id && x.s).slice(0, 8);
    openSheet(`<div class="pd-img">${ap ? `<span class="app-tag">${icon('flower', 'ico-sm')}${t('withApp')}</span>` : ''}<img src="${p.img}" alt="${esc(p.n)}"></div>
      <div class="kicker" style="margin-top:16px">${catName(p.c)}</div>
      <h2 class="h1" style="margin-top:4px">${esc(p.n)}</h2>
      <div class="pd-price">${ap ? `<span class="price app">${priceHtml(ap)}</span><span class="price-old">${zl(p.pr)} ${t('regular')}</span>` : `<span class="price">${priceHtml(p.pr)}</span>`}</div>
      ${ap ? `<div class="app-note">${icon('qr')}<span>${t('save')} <b>${zl(p.pr - ap)}</b> — ${t('appPricesDesc').toLowerCase()}</span></div>` : ''}
      ${!p.s ? `<div class="small muted">${t('outOfStock')} · ${t('inStores')}</div>` : ''}
      ${coupons.map((c) => couponCard(c, true)).join('')}
      ${p.s ? `<div style="display:flex;gap:12px;align-items:center;margin-top:16px">
        ${qty ? `<span class="stepper stepper-lg"><button data-act="dec" data-id="${id}" aria-label="−">${icon('minus', 'ico-sm')}</button><span class="num">${qty}</span><button data-act="inc" data-id="${id}" aria-label="+">${icon('plus', 'ico-sm')}</button></span>` : ''}
        ${qty ? `<button class="btn btn-ghost" style="flex:1" data-act="go" data-to="cart">${icon('cart', 'ico-sm')}${t('cart')} · ${zl(unitPrice(p) * qty)}</button>`
          : `<button class="btn btn-gold" style="flex:1" data-act="add" data-id="${id}">${icon('cart', 'ico-sm')}${t('toCart')}</button>`}
      </div>` : ''}
      ${related.length ? `<div class="section"><h3 class="h3" style="margin-bottom:12px">${catName(p.c)}</h3><div class="rail">${related.map(productCard).join('')}</div></div>` : ''}`, p.n);
  }

  function pickFlower() {
    const today = day();
    if (S.wreath.last === today) return;
    const y = new Date(); y.setDate(y.getDate() - 1);
    let days = S.wreath.last === day(y) ? S.wreath.days : 0;
    if (days >= 7) days = 0;
    days += 1;
    const bonus = days === 7 ? 50 : 5;
    S.wreath = { days, last: today };
    award(bonus);
    save(); rerender();
    toast(`${t('toast_daily')} · +${bonus} ${t('wianki')}`);
    if (days === 7) petals();
  }

  function simulateScan() {
    // Losowy koszyk w sklepie + produkty pasujące do aktywnych kuponów.
    const basket = new Map();
    const pool = P.filter((p) => p.s);
    while (basket.size < 4) basket.set(pool[Math.floor(Math.random() * pool.length)].id, 1);
    S.coupons.forEach((cid) => {
      const c = COUPONS.find((x) => x.id === cid);
      if (!c || c.match.all) return;
      const hit = [...basket.keys()].find((id) => couponMatches(c, PMAP.get(id)));
      const pid = hit || (pool.find((p) => couponMatches(c, p)) || {}).id;
      if (pid) basket.set(pid, Math.max(basket.get(pid) || 0, c.kind === 'gift' ? 3 : 1));
    });
    const lines = [...basket.entries()].map(([id, q]) => ({ p: PMAP.get(id), q }));
    const pr = priceBasket(lines);
    consumeCoupons(pr.discounts);
    const rewardLines = S.rewards.map((rid) => REWARDS.find((r) => r.id === rid)).filter(Boolean);
    const bon = rewardLines.reduce((s, r) => s + (r.bon || 0), 0);
    S.rewards = [];
    const total = Math.max(0, pr.total - bon);
    const earned = wiankiFor(total, pr.extraWianki);
    award(earned);
    const done = checkChallenges(S.store, lines);
    const s = myStore();
    const receipt = {
      date: new Date().toISOString(), store: `${s.name}, ${s.city}`,
      lines: lines.map((l) => ({ n: l.p.n, q: l.q, s: +(unitPrice(l.p) * l.q).toFixed(2) })),
      disc: [...pr.discounts.map(({ name, d }) => ({ name, d })), ...rewardLines.map((r) => ({ name: `${t('tab_rewards')}: ${L(r)}`, d: r.bon || 0 }))],
      total: +total.toFixed(2), saved: +(pr.appSaved + pr.disc + bon).toFixed(2), earned: earned + done.reduce((x, c) => x + c.bonus, 0),
    };
    S.receipts.unshift(receipt);
    save();
    rerender();
    showReceipt(receipt, true, done);
  }

  function showReceipt(r, fresh = false, completed = []) {
    openSheet(`<div class="success">
        ${fresh ? `<div class="burst"><svg class="ico" aria-hidden="true"><use href="#i-flower"/></svg></div><h2 class="h1">${t('scanned')}</h2>` : `<h2 class="h1" style="margin-top:12px">${t('receipts')}</h2>`}
        <div class="earn-grid">
          <div><b class="num">+${r.earned}</b><span>${t('earned')}</span></div>
          <div><b class="num">${zl(r.saved)}</b><span>${t('saved')}</span></div>
        </div>
        ${completed.map((c) => `<div class="app-note" style="text-align:left">${icon('trophy')}<span>${t('toast_ch')}: <b>${esc(L(c)[0])}</b> +${c.bonus}</span></div>`).join('')}
        <div class="r-lines">
          <div class="small" style="color:var(--ink-2);margin-bottom:8px">${fmtTime(r.date)} · ${esc(r.store)}</div>
          ${r.lines.map((l) => `<div class="r-line"><span class="nm">${l.q > 1 ? `${l.q}× ` : ''}${esc(l.n)}</span><span class="num">${zl(l.s)}</span></div>`).join('')}
          ${r.disc.map((d) => `<div class="r-line disc"><span class="nm">${esc(d.name)}</span><span class="num">${d.d ? `−${zl(d.d)}` : '✓'}</span></div>`).join('')}
          <div class="r-line tot"><span>${t('total')}</span><span class="num">${zl(r.total)}</span></div>
        </div>
        ${fresh ? `<button class="btn btn-gold btn-block" style="margin-top:16px" data-act="close-sheet">${t('done')}</button>` : ''}
      </div>`, t('receipts'));
    if (fresh) petals();
  }

  function onClick(e) {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    const id = el.dataset.id;
    const inSheet = !!el.closest('.sheet');
    switch (act) {
      case 'close-sheet': closeSheet(); break;
      case 'back': history.length > 1 ? history.back() : (location.hash = '#/home'); break;
      case 'go': location.hash = `#/${el.dataset.to}`; break;
      case 'ob-next': obStep += 1; render(); break;
      case 'ob-skip': obStep = 3; render(); break;
      case 'lang': S.lang = id; save(); rerender(); break;
      case 'coupon': {
        const on = S.coupons.includes(id);
        S.coupons = on ? S.coupons.filter((x) => x !== id) : [...S.coupons, id];
        save();
        if (inSheet && sheetProduct) openProduct(sheetProduct);
        rerender();
        toast(on ? t('toast_off') : t('toast_on'));
        break;
      }
      case 'product': openProduct(+id); break;
      case 'add':
        addToCart(+id);
        toast(t('toast_cart'));
        if (inSheet) openProduct(+id);
        refreshInPlace();
        break;
      case 'inc': case 'dec':
        addToCart(+id, act === 'inc' ? 1 : -1);
        if (inSheet) openProduct(+id);
        refreshInPlace();
        break;
      case 'pick': pickFlower(); break;
      case 'cat': shopState.cat = id; updateShop(); break;
      case 'only-app': shopState.app = !shopState.app; updateShop(); break;
      case 'tab': couponTab = id; rerender(); break;
      case 'redeem': {
        const r = REWARDS.find((x) => x.id === id);
        if (!r || S.wianki < r.cost) return;
        S.wianki -= r.cost; S.rewards.push(id); save(); rerender();
        toast(t('toast_redeem')); petals();
        break;
      }
      case 'seg': {
        const qr = id === 'qr';
        $('#code-qr').hidden = !qr; $('#code-bar').hidden = qr;
        el.parentElement.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === el)));
        break;
      }
      case 'simulate': simulateScan(); break;
      case 'receipt': showReceipt(S.receipts[+id]); break;
      case 'order': showOrder(S.orders[+id]); break;
      case 'choose-store':
        S.store = id; save(); refreshStores();
        toast(`${t('yourStore')}: ${storeLabel(myStore())}`);
        break;
      case 'city':
        storeCity = id; refreshStores();
        if (mapRef) fitStores(mapRef);
        break;
      case 'mode': S.checkout.mode = id; save(); rerender(); break;
      case 'pay': S.checkout.pay = id; save(); rerender(); break;
      case 'place-order': placeOrder(); break;
      case 'bundle': {
        const b = BUNDLES.find((x) => x.id === id);
        b.items.forEach((pid) => { if (!S.cart[pid]) S.cart[pid] = 1; });
        save(); rerender(); toast(t('toast_bundle'));
        break;
      }
      case 'nearest':
        navigator.geolocation?.getCurrentPosition(
          (pos) => { S.geo = { lat: pos.coords.latitude, lng: pos.coords.longitude }; storeCity = 'all'; save(); rerender(); },
          () => toast('GPS: brak dostępu'),
          { timeout: 8000 },
        );
        break;
      case 'logout':
        if (confirm(t('logout') + '?')) { localStorage.removeItem(KEY); S = fresh(); obStep = 0; location.hash = '#/home'; render(); }
        break;
      default: break;
    }
  }

  // Odświeża bieżący widok bez skoku przewijania (np. przycisk + na karcie produktu).
  function refreshInPlace() {
    const { route } = parseHash();
    if (route === 'shop') {
      $('#grid').innerHTML = gridHtml();
      $('.topbar .icon-btn')?.replaceWith(document.createRange().createContextualFragment(cartBtn()));
      renderTabbar(route);
      renderMinicart(route);
    } else rerender();
  }
  function updateShop() {
    document.querySelectorAll('.chips .chip').forEach((c) => {
      if (c.dataset.act === 'cat') c.setAttribute('aria-pressed', String(c.dataset.id === shopState.cat));
      if (c.dataset.act === 'only-app') c.setAttribute('aria-pressed', String(shopState.app));
    });
    $('#grid').innerHTML = gridHtml();
  }

  function onSubmit(e) {
    if (e.target.id !== 'join') return;
    e.preventDefault();
    const f = e.target;
    const name = f.name.value.trim();
    const phone = f.phone.value.replace(/\D/g, '');
    if (!name) { f.name.focus(); f.name.setAttribute('aria-invalid', 'true'); return; }
    if (phone.length !== 9) { f.phone.focus(); f.phone.setAttribute('aria-invalid', 'true'); toast(t('phone') + ': 9'); return; }
    const y = new Date(); y.setDate(y.getDate() - 1);
    S.user = { name, phone: phone.replace(/(\d{3})(?=\d)/g, '$1 '), card: cardFromPhone(phone), since: new Date().toISOString() };
    S.wianki = 50; S.earned = 50;
    S.wreath = { days: 2, last: day(y) };
    save();
    location.hash = '#/home';
    render();
    toast(`+50 ${t('wianki')}`);
    petals();
  }

  let searchTimer;
  function onInput(e) {
    if (e.target.id === 'q') {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { shopState.q = e.target.value; $('#grid').innerHTML = gridHtml(); }, 120);
    }
    if (e.target.dataset.co) { S.checkout[e.target.dataset.co] = e.target.value; save(); }
  }

  document.addEventListener('click', onClick);
  document.addEventListener('submit', onSubmit);
  document.addEventListener('input', onInput);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });
  window.addEventListener('hashchange', () => { closeSheet(); render(); });

  render();

  if ('serviceWorker' in navigator && !/^(localhost|127\.)/.test(location.hostname)) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
