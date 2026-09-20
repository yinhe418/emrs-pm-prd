/* ==========================================================
 * EMRS · 患者端字号切换(§7.1.5)
 * 作用范围:患者端 5 个核心页(patient-auth / patient-home / patient-tasks / patient-plan / patient-edu)
 * 持久化:localStorage 'emrs_font_size'(normal / large / xl)
 * 默认:normal(14px)
 * ========================================================== */
(function () {
  'use strict';
  var KEY = 'emrs_font_size';
  var ALLOWED = ['normal', 'large', 'xl'];
  var current = 'normal';
  try {
    var saved = localStorage.getItem(KEY);
    if (saved && ALLOWED.indexOf(saved) !== -1) current = saved;
  } catch (e) {}

  function apply(size) {
    var html = document.documentElement;
    html.classList.remove('font-size-large', 'font-size-xl');
    if (size === 'large') html.classList.add('font-size-large');
    else if (size === 'xl') html.classList.add('font-size-xl');
    current = size;
    try { localStorage.setItem(KEY, size); } catch (e) {}
    // 同步按钮 active
    var btns = document.querySelectorAll('#fontToggle button[data-size]');
    btns.forEach(function (b) {
      if (b.getAttribute('data-size') === size) b.classList.add('active');
      else b.classList.remove('active');
    });
  }

  // 暴露全局切换函数 + 立即应用
  window.setFontSize = function (size, btn) {
    if (ALLOWED.indexOf(size) === -1) return;
    apply(size);
  };
  // DOM 就绪后回填按钮状态
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { apply(current); });
  } else {
    apply(current);
  }
})();