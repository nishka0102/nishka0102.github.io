// Nishka Dhawan — portfolio interactions. No dependencies.
(() => {
  const root = document.documentElement;
  const stage = document.querySelector('.stage');
  if (!stage) return;

  const $ = (sel, el = document) => el.querySelector(sel);
  // focus rings and focus hand-backs are for keyboard users only
  let keyboard = false;
  addEventListener('keydown', (e) => { if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') keyboard = true; }, true);
  addEventListener('pointerdown', () => { keyboard = false; }, true);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  // Keep the artboard scale in step with the real content width (scrollbars included).
  // Portrait phones (html.m) use the same width fit; their layout is recomposed in site.css. --sov is the
  // scale at which a desktop-sized pop-up fits the phone's screen height.
  // Desktop: the desk and the drawer are single screens, so they fit the whole window (like the prototype's
  // "fit to screen") and sit centred; project pages fit the width but never grow past their 1440px design.
  const phoneQ = matchMedia('(max-width: 760px) and (orientation: portrait) and (hover: none)');
  const fitEl = $('.fit');
  const SCREEN = /page-(home|drawer)/.test(document.body.className);
  const H = parseFloat(getComputedStyle(document.body).getPropertyValue('--h')) || 1050;
  const fit = () => {
    const phone = phoneQ.matches;
    root.classList.toggle('m', phone);
    const sw = root.clientWidth / 1440;
    const s = phone ? sw : SCREEN ? Math.min(sw, root.clientHeight / H) : sw;
    root.style.setProperty('--s', s);
    root.style.setProperty('--edge', Math.max(0, (root.clientWidth / s - 1440) / 2) + 'px');   // artboard px from its edge to the window's
    root.style.setProperty('--sov', Math.min(1, (root.clientHeight - 56) / 1050));
  };
  fit();
  if ('ResizeObserver' in window) new ResizeObserver(fit).observe(root);
  addEventListener('resize', fit);
  phoneQ.addEventListener('change', fit);

  // ---- images that are not needed for first paint (overlays, hover states) ----
  const hydrate = (scope) => $$('img[data-src]', scope || document).forEach((i) => { i.src = i.dataset.src; i.removeAttribute('data-src'); });
  const whenIdle = window.requestIdleCallback ? (f) => requestIdleCallback(f, { timeout: 1500 }) : (f) => setTimeout(f, 300);
  if (document.readyState === 'complete') whenIdle(() => hydrate()); else addEventListener('load', () => whenIdle(() => hydrate()));
  document.addEventListener('pointerover', (e) => { const h = e.target.closest && e.target.closest('.hot'); if (h) hydrate(h); }, { passive: true });

  // one quiet retry for any image the network dropped
  document.addEventListener('error', (e) => {
    const i = e.target;
    if (!i || i.tagName !== 'IMG' || i.dataset.retried || !i.getAttribute('src')) return;
    i.dataset.retried = '1';
    const src = i.src;
    setTimeout(() => { i.src = src; }, 700);
  }, true);

  // ---- contact menu ----
  const toggle = $('.contact-toggle');
  const banner = $('.banner');
  const setMenu = (open) => {
    if (!toggle) return;
    banner.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };
  const menuOpen = () => !!banner && banner.classList.contains('menu-open');
  if (toggle) {
    toggle.addEventListener('click', (e) => { e.stopPropagation(); setMenu(!menuOpen()); });
    document.addEventListener('click', (e) => { if (menuOpen() && !e.target.closest('.contact-menu')) setMenu(false); });
  }

  // ---- About / Resume overlays (address bar: #about, #resume) ----
  const overlays = $$('.overlay');
  const scene = $('.scene');
  let trigger = null;
  const current = () => { const n = location.hash.slice(1); return overlays.some((o) => o.id === n) ? n : null; };
  const render = (focus) => {
    const name = current();
    stage.classList.toggle('has-overlay', !!name);
    overlays.forEach((o) => {
      const on = o.id === name;
      o.classList.toggle('is-open', on);
      o.setAttribute('aria-hidden', String(!on));
      o.inert = !on;
    });
    if (scene) scene.inert = !!name;
    if (banner) banner.inert = !!name;
    root.classList.toggle('overlay-open', !!name);
    if (name) {
      hydrate($(`#${name}`));
      setMenu(false);
      if (phoneQ.matches && fitEl) requestAnimationFrame(() => { fitEl.scrollTo({ left: Math.max(0, 720 * parseFloat(root.style.getPropertyValue('--sov')) - root.clientWidth / 2), top: 0 }); });
      if (scrollY > 0) scrollTo({ top: 0, behavior: 'smooth' });
      if (focus && keyboard) { const b = $(`#${name} .back`); if (b) b.focus({ preventScroll: true }); }
    } else if (focus && trigger) {
      if (keyboard) trigger.focus({ preventScroll: true }); else trigger.blur();
      trigger = null;
    }
  };
  const open = (name, from) => {
    if (current() === name) return;
    trigger = from || null;
    // some browsers refuse history changes on pages opened straight from a folder
    try { history.pushState({ overlay: name }, '', `#${name}`); } catch (_) { location.hash = name; }
    render(true);
  };
  const close = () => {
    if (!current()) return;
    try {
      if (history.state && history.state.overlay) { history.back(); return; }
      history.replaceState(null, '', location.pathname + location.search);
    } catch (_) { location.hash = ''; }
    render(true);
  };
  if (overlays.length) {
    const pdf = $('#resume .download');
    $$('[data-overlay]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      if (a.dataset.overlay === 'resume' && phoneQ.matches && pdf) { location.href = pdf.getAttribute('href'); return; }
      open(a.dataset.overlay, a);
    }));
    $$('[data-close]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); close(); }));
    addEventListener('popstate', () => render(true));
    addEventListener('hashchange', () => render(false));
    render(false);
  }

  // ---- phone header: contact sheet, one-time rotate hint on project pages ----
  const mbar = $('.m-bar');
  const mContact = mbar && $('.m-contact', mbar);
  const mOpen = () => !!mbar && mbar.classList.contains('m-open');
  const setMbar = (on) => { if (!mbar) return; mbar.classList.toggle('m-open', on); if (mContact) mContact.setAttribute('aria-expanded', String(on)); };
  if (mContact) {
    mContact.addEventListener('click', (e) => { e.stopPropagation(); setMbar(!mOpen()); });
    document.addEventListener('click', (e) => { if (mOpen() && !e.target.closest('.m-menu')) setMbar(false); });
    $$('[data-overlay]', mbar).forEach((a) => a.addEventListener('click', () => setMbar(false)));
  }
  const hint = $('.m-hint');
  if (hint) {
    let seen = false;
    const key = `nd-hint-${hint.dataset.key || 'x'}`;
    try { seen = sessionStorage.getItem(key) === '1'; } catch (_) { /* private mode */ }
    const hide = () => hint.classList.remove('is-on');
    if (phoneQ.matches && !seen) {
      setTimeout(() => hint.classList.add('is-on'), 900);
      setTimeout(hide, 8000);
      try { sessionStorage.setItem(key, '1'); } catch (_) { /* private mode */ }
      hint.addEventListener('click', hide);
      phoneQ.addEventListener('change', hide);
    }
  }

  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (menuOpen()) { setMenu(false); toggle.focus(); } else if (mOpen()) { setMbar(false); mContact.focus(); } else close();
  });

  // ---- light switch (remembered while the tab is open) ----
  const sw = $('.hot-switch');
  if (sw) {
    const setNight = (on) => {
      stage.classList.toggle('is-night', on);
      sw.setAttribute('aria-pressed', String(on));
      try { sessionStorage.setItem('nd-night', on ? '1' : ''); } catch (_) { /* private mode */ }
    };
    let saved = false;
    try { saved = sessionStorage.getItem('nd-night') === '1'; } catch (_) { /* private mode */ }
    if (saved) { stage.classList.add('is-night'); sw.setAttribute('aria-pressed', 'true'); }
    sw.addEventListener('click', () => setNight(!stage.classList.contains('is-night')));
  }

  // ---- the drawer: messy or organised (address bar: #organised) ----
  const organise = $('.organise');
  if (organise) {
    const label = organise.querySelector('p');
    const setTidy = (on) => {
      stage.classList.toggle('is-tidy', on);
      root.classList.toggle('tidy', on);
      organise.setAttribute('aria-pressed', String(on));
      if (label) label.textContent = on ? 'Organic' : 'Organise';
      if ((location.hash === '#organised') !== on) { try { history.replaceState(null, '', on ? '#organised' : location.pathname + location.search); } catch (_) { /* file:// */ } }
    };
    organise.addEventListener('click', () => setTidy(!stage.classList.contains('is-tidy')));
    addEventListener('hashchange', () => setTidy(location.hash === '#organised'));
    setTidy(location.hash === '#organised');
  }

  // ---- page changes ----
  const internal = (a) => a && a.href && a.origin === location.origin && !a.hasAttribute('download') && a.target !== '_blank' && a.pathname !== location.pathname;
  // warm the next page as soon as the pointer shows intent
  const warmed = new Set();
  const warm = (a) => {
    if (!internal(a) || warmed.has(a.pathname)) return;
    warmed.add(a.pathname);
    const l = document.createElement('link'); l.rel = 'prefetch'; l.href = a.href; document.head.appendChild(l);
  };
  document.addEventListener('pointerover', (e) => warm(e.target.closest && e.target.closest('a')), { passive: true });
  document.addEventListener('focusin', (e) => warm(e.target.closest && e.target.closest('a')));
  // fade out before leaving where the browser cannot cross-fade pages itself
  if (!root.classList.contains('vt')) {
    document.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a');
      if (!internal(a) || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      root.classList.add('is-leaving');
      setTimeout(() => { location.href = a.href; }, 170);
    });
  }
  addEventListener('pageshow', () => root.classList.remove('is-leaving'));
})();
