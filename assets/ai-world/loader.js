/* Rehman AI Services — AI World Simulation loader.
   Loads the 3D world only when its section comes near the screen, and only if WebGL works. */
(function () {
  var me = document.currentScript;
  var base = me && me.src ? me.src.replace(/[^\/]*$/, '') : 'assets/ai-world/';
  function hasWebGL() {
    try { var c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl'))); }
    catch (e) { return false; }
  }
  function boot(root) {
    if (root.__aiwBooted) return; root.__aiwBooted = true;
    if (!hasWebGL()) { root.classList.add('aiw-nowebgl'); return; }
    root.classList.add('aiw-loading-on');
    import(base + 'world.js').then(function (m) {
      m.mount(root, { standalone: root.hasAttribute('data-standalone') });
    }).catch(function () { root.classList.remove('aiw-loading-on'); root.classList.add('aiw-nowebgl'); });
  }
  function gated() { return document.documentElement.classList.contains('auth-gate'); }
  function whenUngated(fn) {
    if (!gated()) return fn();
    var mo = new MutationObserver(function () { if (!gated()) { mo.disconnect(); fn(); } });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }
  function init() { whenUngated(start); }
  function start() {
    var roots = document.querySelectorAll('[data-ai-world]');
    for (var i = 0; i < roots.length; i++) (function (root) {
      if (root.hasAttribute('data-standalone') || !('IntersectionObserver' in window)) return boot(root);
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); boot(root); } }, { rootMargin: '400px 0px' });
      io.observe(root);
    })(roots[i]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
