/* DCC This Week — micro-card slider + carousel pop-up
 * Reads assets/this-week/this-week.json.
 * If the file can't be loaded, the original DCC This Week card stays
 * exactly as it was (linking to Canva), so nothing breaks.
 * Exposes window.DCCThisWeek.open(page) for the chatbot.
 */
(() => {
  'use strict';

  const BASE = 'assets/this-week/';
  const SLIDE_MS = 4000;
  const SWIPE_PX = 40;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const original = document.querySelector('.week-card');
  let data = null;
  let modal = null;

  const api = {
    available: () => Boolean(data && Array.isArray(data.carousel) && data.carousel.length),
    open: (page = 1) => openModal(page)
  };
  window.DCCThisWeek = api;

  if (!original) return;

  fetch(BASE + 'this-week.json', { cache: 'no-store' })
    .then(res => (res.ok ? res.json() : Promise.reject(new Error('this-week.json ' + res.status))))
    .then(init)
    .catch(err => console.warn('DCC This Week: keeping the static card.', err));

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  const ICON_PREV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';
  const ICON_NEXT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';
  const ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6.5" y="5" width="3.6" height="14" rx="1"/><rect x="13.9" y="5" width="3.6" height="14" rx="1"/></svg>';
  const ICON_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.9l10-6.5a1 1 0 0 0 0-1.7l-10-6.5A1 1 0 0 0 8 5.5Z"/></svg>';
  const ICON_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

  /* ---------------- Slider ---------------- */

  function init(json) {
    data = json;
    const today = todayISO();
    const cards = (json.cards || []).filter(card =>
      card && card.title && card.image && (!card.endDate || card.endDate >= today)
    );

    if (json.coverImage) {
      original.style.backgroundImage = `url("${BASE}${json.coverImage}")`;
    }

    const wrap = document.createElement('div');
    wrap.className = 'tw-wrap';
    wrap.innerHTML =
      '<section class="tw-slider" aria-roledescription="carousel" aria-label="DCC This Week">' +
      '<div class="tw-viewport"><div class="tw-track"></div></div></section>';
    original.replaceWith(wrap);

    const slider = wrap.querySelector('.tw-slider');
    const viewport = wrap.querySelector('.tw-viewport');
    const track = wrap.querySelector('.tw-track');

    // Slide 1: the original DCC This Week card, now opening the pop-up.
    original.removeAttribute('target');
    original.setAttribute('aria-label', 'DCC This Week: open this week\'s events');
    original.addEventListener('click', event => {
      if (swiped) { event.preventDefault(); return; }
      if (api.available()) {
        event.preventDefault();
        openModal(json.coverPage || 1);
      }
    });
    track.appendChild(makeSlide(original));

    const logo = document.querySelector('.brand img');
    const logoSrc = logo ? logo.getAttribute('src') : '';

    cards.forEach(card => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tw-card';
      button.setAttribute('aria-label', `${card.title}. ${card.when || ''}. View details`);
      button.innerHTML =
        `<img class="tw-card-bg" src="${escapeHtml(BASE + card.image)}" alt="" decoding="async">` +
        '<span class="tw-card-shade"></span>' +
        (logoSrc
          ? `<span class="tw-brand" aria-hidden="true"><img src="${escapeHtml(logoSrc)}" alt=""><span><b>DAVID'S CHRISTIAN CENTRE</b><small>INFORMATION HUB</small></span></span>`
          : '') +
        '<span class="tw-card-body">' +
        (card.tag ? `<span class="tw-tag">${escapeHtml(card.tag)}</span>` : '') +
        `<span class="tw-title">${escapeHtml(card.title)}</span>` +
        (card.when ? `<span class="tw-when">${escapeHtml(card.when)}</span>` : '') +
        '<span class="tw-more" aria-hidden="true">View details</span>' +
        '</span>';
      button.addEventListener('click', () => {
        if (swiped) return;
        openModal(card.page || 1);
      });
      track.appendChild(makeSlide(button));
    });

    const slides = Array.from(track.children);
    const total = slides.length;
    slides.forEach((slide, i) => slide.setAttribute('aria-label', `${i + 1} of ${total}`));

    let index = 0;
    let timer = null;
    let swiped = false;
    let userPaused = false;
    const holds = new Set(); // hover, focus, touch, hidden, modal

    if (total < 2) {
      show(0);
      return;
    }

    // Controls row: dots, pause/play, previous, next
    const controls = document.createElement('div');
    controls.className = 'tw-controls';
    controls.innerHTML =
      '<div class="tw-dots"></div>' +
      `<button type="button" class="tw-btn tw-pause" aria-label="Pause slideshow">${ICON_PAUSE}</button>` +
      `<button type="button" class="tw-btn tw-prev" aria-label="Previous card">${ICON_PREV}</button>` +
      `<button type="button" class="tw-btn tw-next" aria-label="Next card">${ICON_NEXT}</button>`;
    wrap.appendChild(controls);

    const dotsBox = controls.querySelector('.tw-dots');
    const dots = slides.map((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'tw-dot';
      dot.setAttribute('aria-label', `Show card ${i + 1} of ${total}`);
      dot.addEventListener('click', () => { show(i); restart(); });
      dotsBox.appendChild(dot);
      return dot;
    });

    const pauseBtn = controls.querySelector('.tw-pause');
    controls.querySelector('.tw-prev').addEventListener('click', () => { show(index - 1); restart(); });
    controls.querySelector('.tw-next').addEventListener('click', () => { show(index + 1); restart(); });
    pauseBtn.addEventListener('click', () => {
      userPaused = !userPaused;
      pauseBtn.innerHTML = userPaused ? ICON_PLAY : ICON_PAUSE;
      pauseBtn.setAttribute('aria-label', userPaused ? 'Play slideshow' : 'Pause slideshow');
      restart();
    });
    if (reduceMotion) {
      userPaused = true;
      pauseBtn.innerHTML = ICON_PLAY;
      pauseBtn.setAttribute('aria-label', 'Play slideshow');
    }

    // Pause while someone is looking at or using the card
    slider.addEventListener('mouseenter', () => hold('hover', true));
    slider.addEventListener('mouseleave', () => hold('hover', false));
    wrap.addEventListener('focusin', () => hold('focus', true));
    wrap.addEventListener('focusout', event => {
      if (!wrap.contains(event.relatedTarget)) hold('focus', false);
    });
    document.addEventListener('visibilitychange', () => hold('hidden', document.hidden));
    document.addEventListener('dcc-this-week-modal', event => hold('modal', event.detail.open));

    // Swipe (touch and mouse drag)
    let startX = null;
    let startY = null;
    viewport.addEventListener('pointerdown', event => {
      startX = event.clientX;
      startY = event.clientY;
      swiped = false;
      if (event.pointerType === 'touch') hold('touch', true);
    });
    const endSwipe = event => {
      if (startX === null) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      startX = null;
      if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
        swiped = true;
        show(index + (dx < 0 ? 1 : -1));
        setTimeout(() => { swiped = false; }, 50);
      }
      if (event.pointerType === 'touch') hold('touch', false);
      else restart();
    };
    viewport.addEventListener('pointerup', endSwipe);
    viewport.addEventListener('pointercancel', event => { startX = null; if (event.pointerType === 'touch') hold('touch', false); });

    show(0);
    restart();

    function show(i) {
      index = (i + total) % total;
      track.style.transform = `translateX(-${index * 100}%)`;
      slides.forEach((slide, n) => {
        const active = n === index;
        slide.setAttribute('aria-hidden', active ? 'false' : 'true');
        slide.inert = !active;
      });
      dots.forEach((dot, n) => dot.setAttribute('aria-current', n === index ? 'true' : 'false'));
    }

    function hold(reason, on) {
      if (on) holds.add(reason); else holds.delete(reason);
      restart();
    }

    function restart() {
      clearTimeout(timer);
      if (userPaused || holds.size) return;
      timer = setTimeout(() => { show(index + 1); restart(); }, SLIDE_MS);
    }
  }

  function makeSlide(content) {
    const slide = document.createElement('div');
    slide.className = 'tw-slide';
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.appendChild(content);
    return slide;
  }

  /* ---------------- Carousel pop-up ---------------- */

  function openModal(page) {
    if (!api.available()) {
      window.open('https://canva.link/m8alnjujgkkb0vx', '_blank', 'noopener');
      return;
    }
    if (!modal) modal = buildModal();
    modal.opener = document.activeElement;
    modal.go(Number(page) - 1 || 0);
    modal.el.hidden = false;
    document.body.classList.add('tw-modal-open');
    document.dispatchEvent(new CustomEvent('dcc-this-week-modal', { detail: { open: true } }));
    modal.closeBtn.focus();
  }

  function closeModal() {
    if (!modal || modal.el.hidden) return;
    modal.el.hidden = true;
    document.body.classList.remove('tw-modal-open');
    document.dispatchEvent(new CustomEvent('dcc-this-week-modal', { detail: { open: false } }));
    if (modal.opener && typeof modal.opener.focus === 'function') modal.opener.focus();
  }

  function buildModal() {
    const pages = data.carousel;
    const el = document.createElement('div');
    el.className = 'tw-modal';
    el.hidden = true;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'DCC This Week');
    el.innerHTML =
      '<div class="tw-modal-backdrop"></div>' +
      '<div class="tw-modal-frame">' +
      '<div class="tw-modal-top"><span>DCC This Week</span>' +
      `<button type="button" class="tw-btn tw-close" aria-label="Close">${ICON_CLOSE}</button></div>` +
      '<div class="tw-modal-stage"><img alt=""></div>' +
      '<div class="tw-modal-nav">' +
      `<button type="button" class="tw-btn tw-mprev" aria-label="Previous page">${ICON_PREV}</button>` +
      '<span class="tw-modal-count" aria-live="polite"></span>' +
      `<button type="button" class="tw-btn tw-mnext" aria-label="Next page">${ICON_NEXT}</button>` +
      '</div></div>';
    document.body.appendChild(el);

    const img = el.querySelector('.tw-modal-stage img');
    const count = el.querySelector('.tw-modal-count');
    const stage = el.querySelector('.tw-modal-stage');
    const closeBtn = el.querySelector('.tw-close');
    let current = 0;

    function go(i) {
      current = Math.max(0, Math.min(pages.length - 1, i));
      const page = pages[current];
      img.src = BASE + page.image;
      img.alt = page.alt || `Page ${current + 1}`;
      count.textContent = `${current + 1} / ${pages.length}`;
      el.querySelector('.tw-mprev').disabled = current === 0;
      el.querySelector('.tw-mnext').disabled = current === pages.length - 1;
      [current - 1, current + 1].forEach(n => {
        if (pages[n]) { const pre = new Image(); pre.src = BASE + pages[n].image; }
      });
    }

    el.querySelector('.tw-modal-backdrop').addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);
    el.querySelector('.tw-mprev').addEventListener('click', () => go(current - 1));
    el.querySelector('.tw-mnext').addEventListener('click', () => go(current + 1));

    el.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); closeModal(); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); go(current - 1); }
      else if (event.key === 'ArrowRight') { event.preventDefault(); go(current + 1); }
      else if (event.key === 'Tab') {
        // Keep keyboard focus inside the pop-up
        const focusable = Array.from(el.querySelectorAll('button:not([disabled])'));
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });

    let sx = null;
    let sy = null;
    stage.addEventListener('pointerdown', event => { sx = event.clientX; sy = event.clientY; });
    stage.addEventListener('pointerup', event => {
      if (sx === null) return;
      const dx = event.clientX - sx;
      const dy = event.clientY - sy;
      sx = null;
      if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) go(current + (dx < 0 ? 1 : -1));
    });

    return { el, go, closeBtn, opener: null };
  }
})();
