// Lightweight IntersectionObserver-based scroll animations.
// Usage: add data-anim="fade-up|zoom-in|flip-left|flip-right"
// Optional: data-anim-duration="700", data-anim-delay="120", data-anim-ease="ease-out", data-anim-once="false"
(function () {
  const defaults = {
    root: null,
    rootMargin: '0px 0px -15% 0px',
    threshold: 0.2,
  };

  let observer;
  const observed = new Set();

  function toMs(val) {
    const n = parseInt(val, 10);
    return Number.isFinite(n) ? `${n}ms` : undefined;
  }

  function applyVars(el) {
    const dur = el.getAttribute('data-anim-duration');
    const delay = el.getAttribute('data-anim-delay');
    const ease = el.getAttribute('data-anim-ease');
    const distance = el.getAttribute('data-anim-distance');
    const scale = el.getAttribute('data-anim-scale');
    const rotate = el.getAttribute('data-anim-rotate');
    const blur = el.getAttribute('data-anim-blur');
    if (dur) el.style.setProperty('--sa-duration', toMs(dur));
    if (delay) el.style.setProperty('--sa-delay', toMs(delay));
    if (ease) el.style.setProperty('--sa-ease', ease);
    if (distance) el.style.setProperty('--sa-distance', distance.endsWith('px') ? distance : `${parseInt(distance,10)}px`);
    if (scale) el.style.setProperty('--sa-scale', scale);
    if (rotate) el.style.setProperty('--sa-rotate', rotate.endsWith('deg') ? rotate : `${parseInt(rotate,10)}deg`);
    if (blur) el.style.setProperty('--sa-blur', blur.endsWith('px') ? blur : `${parseInt(blur,10)}px`);
  }

  function observe(el) {
    if (!el || observed.has(el)) return;
    applyVars(el);
    el.classList.add('sa');
    observer.observe(el);
    observed.add(el);
  }

  function handle(entries) {
    for (const entry of entries) {
      const el = entry.target;
      const onceAttr = el.getAttribute('data-anim-once');
      const once = !(onceAttr === 'false' || onceAttr === '0'); // default true

      if (entry.isIntersecting) {
        applyVars(el); // re-apply in case attributes changed
        el.classList.add('is-inview');
        if (once) observer.unobserve(el);
      } else if (!once) {
        el.classList.remove('is-inview');
      }
    }
  }

  function init(options) {
    if (observer) return; // already initialized
    const cfg = Object.assign({}, defaults, options || {});
    observer = new IntersectionObserver(handle, {
      root: cfg.root,
      rootMargin: cfg.rootMargin,
      threshold: cfg.threshold,
    });
    refresh();
  }

  function applyStagger(container) {
    const stepAttr = container.getAttribute('data-anim-stagger');
    const step = parseInt(stepAttr || '0', 10);
    if (!Number.isFinite(step) || step <= 0) return;
    const startAttr = container.getAttribute('data-anim-stagger-start');
    let acc = parseInt(startAttr || '0', 10);
    const children = container.querySelectorAll(':scope > *');
    children.forEach((child) => {
      if (!child.getAttribute('data-anim')) {
        child.setAttribute('data-anim', 'fade-up');
      }
      if (!child.getAttribute('data-anim-delay')) {
        child.setAttribute('data-anim-delay', `${acc}`);
      }
      acc += step;
    });
  }

  function refresh() {
    // Apply stagger on containers first
    document.querySelectorAll('[data-anim-stagger]').forEach(applyStagger);
    const nodes = document.querySelectorAll('[data-anim]');
    nodes.forEach(observe);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); });
  } else {
    init();
  }

  window.ScrollAnim = { init, refresh };
})();
