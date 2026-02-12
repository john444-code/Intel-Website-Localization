// main.js - moved JS from HTML and initialized behavior
(() => {
  'use strict';

  const translationsCache = new Map();

  // Utilities
  const qs = (sel, ctx = document) => ctx.querySelector(sel);
  const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // Smooth scroll for same-page anchors
  function initSmoothScroll() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', `#${id}`);
      }
    });
  }

  // Mobile nav toggle
  function initNavToggle() {
    const toggle = qs('.nav-toggle');
    const nav = qs('.nav');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      nav.classList.toggle('is-open');
    });
    // close nav when clicking outside
    document.addEventListener('click', (e) => {
      if (!nav.classList.contains('is-open')) return;
      if (!nav.contains(e.target) && !toggle.contains(e.target)) {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // AJAX form handler for forms with data-ajax attribute
  function initAjaxForms() {
    qsa('form[data-ajax]').forEach((form) => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const action = form.getAttribute('action') || window.location.href;
        const method = (form.getAttribute('method') || 'POST').toUpperCase();
        const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
        const fd = new FormData(form);
        try {
          if (submitBtn) submitBtn.disabled = true;
          const res = await fetch(action, { method, body: fd });
          if (!res.ok) throw new Error(`Request failed: ${res.status}`);
          // dispatch success event with parsed JSON/text if possible
          let payload;
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('application/json')) payload = await res.json();
          else payload = await res.text();
          form.dispatchEvent(new CustomEvent('ajax:success', { detail: payload }));
        } catch (err) {
          form.dispatchEvent(new CustomEvent('ajax:error', { detail: err }));
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      });
    });
  }

  // i18n: load translations and apply to elements with data-i18n attribute
  async function loadTranslations(lang) {
    if (translationsCache.has(lang)) return translationsCache.get(lang);
    try {
      const res = await fetch(`/locales/${lang}.json`);
      if (!res.ok) throw new Error('Translations not found');
      const json = await res.json();
      translationsCache.set(lang, json);
      return json;
    } catch {
      // fallback to en if available
      if (lang !== 'en') return loadTranslations('en');
      return {};
    }
  }

  function applyTranslations(translations) {
    qsa('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      const val = translations[key];
      if (val === undefined) return;
      if (el.hasAttribute('data-i18n-html')) el.innerHTML = val;
      else el.textContent = val;
    });
  }

  function initLanguageSwitcher() {
    const switchers = qsa('[data-lang-switch]');
    if (switchers.length === 0) return;
    const saved = localStorage.getItem('site_lang') || navigator.language.split('-')[0] || 'en';
    let current = saved;
    async function setLang(lang) {
      const translations = await loadTranslations(lang);
      applyTranslations(translations);
      current = lang;
      localStorage.setItem('site_lang', lang);
      switchers.forEach((s) => {
        if (s.tagName === 'SELECT') s.value = lang;
        else s.setAttribute('data-lang-current', lang);
      });
      document.documentElement.lang = lang;
    }
    // initialize UI
    switchers.forEach((el) => {
      if (el.tagName === 'SELECT') {
        el.value = current;
        el.addEventListener('change', () => setLang(el.value));
      } else {
        el.addEventListener('click', (e) => {
          const target = e.target.closest('[data-lang]');
          if (!target) return;
          setLang(target.getAttribute('data-lang'));
        });
      }
    });
    // initial load
    setLang(current).catch(() => {});
  }

  // Accessibility: focus visible class for keyboard users
  function initFocusVisiblePolyfill() {
    let hadKeyboardEvent = false;
    function handleKeyDown() {
      hadKeyboardEvent = true;
      document.documentElement.classList.add('user-is-tabbing');
    }
    function handleMouseDown() {
      hadKeyboardEvent = false;
      document.documentElement.classList.remove('user-is-tabbing');
    }
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('mousedown', handleMouseDown, true);
    window.addEventListener('touchstart', handleMouseDown, true);
  }

  // Initialize all behaviors
  function init() {
    initSmoothScroll();
    initNavToggle();
    initAjaxForms();
    initLanguageSwitcher();
    initFocusVisiblePolyfill();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // expose for debugging if needed
  window.__siteMain = { loadTranslations, applyTranslations, init };
})();