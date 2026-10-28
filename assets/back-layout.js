/* ==========================================================
 * EMRS 后台 · PC 外壳与交互 (back-layout.js)
 * 职责:注入侧边栏 + 顶栏(保证 20 个页面导航一致、零死链)
 *       + 通用交互(抽屉 / 弹窗 / Toast / Tab / 表单校验)
 * ⚠️ 独立于手机端 layout.js,不修改 styles.css
 * 激活页面由 <body data-page="xxx"> 指定
 * ========================================================== */
(function () {
  'use strict';

  /* ---------- 导航配置(href 全部指向真实存在的 back-*.html)---------- */
  var NAV = [
    { type: 'item', page: 'dashboard', icon: 'icon-tab-chart', name: '工作台', href: 'back-dashboard.html' },
    { type: 'group', name: '组织与人员' },
    { type: 'item', page: 'org',      icon: 'icon-folder',      name: '组织架构',     href: 'back-org.html',      sub: true },
    { type: 'item', page: 'positions',icon: 'icon-book',        name: '职位字典',     href: 'back-positions.html',sub: true },
    { type: 'item', page: 'staff',    icon: 'icon-tab-people',  name: '工作人员',     href: 'back-staff.html',    sub: true, badgeKey: 'pendingCount' },
    { type: 'item', page: 'patients', icon: 'icon-avatar-patient', name: '病患',      href: 'back-patients.html', sub: true },
    { type: 'item', page: 'qrcode',   icon: 'icon-tab-tasks',   name: '二维码中心',   href: 'back-qrcode.html',   sub: true },
    { type: 'group', name: '任务' },
    { type: 'item', page: 'component',icon: 'icon-tab-tasklib', name: '任务组件库',   href: 'back-component-lib.html' },
    { type: 'group', name: '主数据' },
    { type: 'item', page: 'drugs',    icon: 'icon-tab-drugs',   name: '药品库',       href: 'back-drugs.html' },
    { type: 'item', page: 'edu',       icon: 'icon-document', name: '健康教育',     href: 'back-edu.html' },
    { type: 'group', name: '系统' },
    { type: 'item', page: 'audit',    name: '操作审计日志', disabled: true },
    { type: 'item', page: 'perms',    name: '权限矩阵',       disabled: true }
  ];

  var ICONS = 'assets/icons-png/';

  /* ---------- 侧边栏 ---------- */
  function renderSide(active) {
    var html = '<aside class="back-side">';
    html += '<div class="side-logo"><div class="lg-mark">智</div>'
          +  '<div class="lg-txt">智病历 AIS<small>管理后台</small></div></div>';
    html += '<nav class="side-nav">';
    NAV.forEach(function (n) {
      if (n.type === 'group') {
        html += '<div class="nav-group-label">' + n.name + '</div>';
        return;
      }
      if (n.disabled) {
        html += '<div class="nav-item disabled" title="本期不做">'
              +   '<span style="width:16px;text-align:center;font-size:10px;">·</span>'
              +   '<span>' + n.name + '</span><span style="margin-left:auto;font-size:10px;">本期不做</span></div>';
        return;
      }
      var cls = 'nav-item' + (n.page === active ? ' active' : '') + (n.sub ? ' nav-sub-i' : '');
      html += '<a class="' + cls + '" href="' + n.href + '">'
            +   (n.icon ? '<img src="' + ICONS + n.icon + '.png" alt="">' : '<span style="width:16px;"></span>')
            +   '<span>' + n.name + '</span>'
            +   (n.badgeKey ? '<span class="n-badge" data-badge="' + n.badgeKey + '">0</span>' : '')
            + '</a>';
      if (n.sub) html = html; // 子项通过 CSS 缩进
    });
    html += '</nav>';
    html += '<div class="side-foot">'
          +   '<a href="back-help.html">关于本系统</a> · <a href="index.html">返回小程序端</a>'
          + '</div>';
    html += '</aside>';
    return html;
  }

  /* ---------- 顶栏 ---------- */
  function renderTop(crumb) {
    var c = (crumb || []).map(function (x) {
      return x.href ? '<a href="' + x.href + '">' + x.name + '</a>' : '<b>' + x.name + '</b>';
    }).join(' &nbsp;/&nbsp; ');

    // 当前医院徽章(全页最重要 — 用户首次要求"明显一点")
    var h = Back.currentHospital();
    var hpill = h
      ? '<div class="top-hospital" title="当前所选医院(本院所有数据均按此过滤)">'
        +   (h.image
              ? '<span class="th-img"><img src="' + h.image + '" alt=""></span>'
              : '<span class="th-mark">' + (h.short || h.name).charAt(0) + '</span>')
        +   '<span class="th-text">'
        +     '<b>' + h.name + '</b>'
        +     '<span class="th-sub">' + h.level + ' · ' + h.area + '</span>'
        +   '</span>'
        +   '<a class="th-switch" href="back-hospital-pick.html" data-action="switch-hospital">切换</a>'
        + '</div>'
      : '<div class="top-hospital none" title="尚未选择医院">'
        +   '<span class="th-mark warn">!</span>'
        +   '<span class="th-text"><b>未选择医院</b><span class="th-sub">所有操作将无法定位数据</span></span>'
        +   '<a class="th-switch" href="back-hospital-pick.html">立即选择</a>'
        + '</div>';

    return '<header class="back-top">'
         +  '<div class="top-left">'
         +    hpill
         +    '<div class="top-crumb">' + c + '</div>'
         +  '</div>'
         +  '<div class="top-search"><img src="' + ICONS + 'icon-search.png" alt="">'
         +  '<input placeholder="搜索人员 / 病患 / 组件 / 药品"></div>'
         +  '<div class="top-user"><div class="tu-av">管</div><span>后台管理员</span><span style="margin:0 6px;color:var(--line)">|</span><a class="btn-text" href="back-login.html" data-action="logout">退出</a></div>'
         + '</header>';
  }

  /* ---------- 挂载 ---------- */
  function mount() {
    var b = document.body;
    if (b.hasAttribute('data-noshell')) return;   // 登录页等无壳页面
    var active = b.getAttribute('data-page') || '';
    var crumb = null;
    var ce = b.getAttribute('data-crumb');
    if (ce) { try { crumb = JSON.parse(ce); } catch (e) { crumb = null; } }
    if (!crumb) crumb = [{ name: '后台管理' }];

    b.className = 'back-body';
    b.insertAdjacentHTML('afterbegin', renderTop(crumb) + renderSide(active));

    // 侧边栏待分配角标
    var bd = document.querySelector('[data-badge="pendingCount"]');
    if (bd && window.BACK_DATA) {
      var n = window.BACK_DATA.pendingCount;
      bd.textContent = n; if (!n) bd.style.display = 'none';
    }
  }

  /* ==========================================================
   * 通用交互
   * ========================================================== */
  var Back = {};

  /* --- 抽屉 --- */
  Back.drawer = function (id, open) {
    var d = document.getElementById(id);
    if (!d) return;
    var m = document.getElementById(d.getAttribute('data-mask') || (id + '-mask'));
    if (open) {
      d.classList.add('on'); if (m) m.classList.add('on');
      document.body.style.overflow = 'hidden';
    } else {
      d.classList.remove('on'); if (m) m.classList.remove('on');
      document.body.style.overflow = '';
    }
  };
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t.classList && t.classList.contains('drawer-mask')) t.classList.remove('on');
    if (t.classList && t.classList.contains('modal-mask')) t.classList.remove('on');
    if (t.classList && (t.classList.contains('d-close') || t.classList.contains('m-close'))) {
      var box = t.closest('.drawer, .modal');
      if (box) { box.classList.remove('on'); document.body.style.overflow = ''; }
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.drawer.on, .modal-mask.on').forEach(function (x) {
        x.classList.remove('on');
      });
      document.body.style.overflow = '';
    }
  });

  /* --- 弹窗 --- */
  Back.modal = function (id, open) {
    var m = document.getElementById(id);
    if (!m) return;
    m.classList[open ? 'add' : 'remove']('on');
    document.body.style.overflow = open ? 'hidden' : '';
  };

  /* --- Toast --- */
  Back.toast = function (msg, type) {
    var color = { ok: '#2E7D32', warn: '#E66B2E', err: '#C62828' }[type || 'ok'];
    var bg = { ok: '#E8F5E9', warn: '#FFF3E0', err: '#FFEBEE' }[type || 'ok'];
    var t = document.createElement('div');
    t.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:400;'
      + 'background:#fff;border:1px solid ' + color + ';border-left:4px solid ' + color + ';'
      + 'background:' + bg + ';color:' + color + ';padding:9px 16px;border-radius:8px;'
      + 'font-size:12.5px;font-weight:500;box-shadow:0 6px 20px rgba(15,23,42,.16);max-width:60vw;';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.style.transition = 'opacity .25s'; t.style.opacity = '0';
      setTimeout(function () { t.remove(); }, 260); }, 2100);
  };

  /* --- 表单校验 --- */
  /* rules: { 字段名: { required:true, msg:'...' } } */
  Back.validate = function (formEl, rules) {
    var ok = true, first = null;
    formEl.querySelectorAll('.fi').forEach(function (fi) { fi.classList.remove('has-err'); });
    Object.keys(rules).forEach(function (name) {
      var r = rules[name];
      var inp = formEl.querySelector('[name="' + name + '"]');
      if (!inp) return;
      var fi = inp.closest('.fi');
      var v = (inp.value || '').trim();
      var bad = false, msg = r.msg || '此项为必填';
      if (r.required && !v) bad = true;
      if (!bad && v && r.minLen && v.length < r.minLen) { bad = true; msg = '至少 ' + r.minLen + ' 个字(当前 ' + v.length + ')'; }
      if (!bad && v && r.maxLen && v.length > r.maxLen) { bad = true; msg = '最多 ' + r.maxLen + ' 个字(当前 ' + v.length + ')'; }
      if (!bad && v && r.pattern && !r.pattern.test(v)) { bad = true; msg = r.msg || '格式不正确'; }
      if (bad) {
        ok = false;
        if (fi) { fi.classList.add('has-err'); var em = fi.querySelector('.err-msg'); if (em) em.textContent = msg; }
        if (!first) first = fi;
      }
    });
    if (first) { first.scrollIntoView({ block: 'center' }); var i = first.querySelector('.ipt,.sel'); if (i) i.focus(); }
    return ok;
  };

  /* --- Tab 切换(通用:同容器内 data-tab-group)--- */
  Back.bindTabs = function (groupSel) {
    document.querySelectorAll(groupSel).forEach(function (g) {
      var btns = g.querySelectorAll('[data-tab]');
      btns.forEach(function (b) {
        b.addEventListener('click', function () {
          var key = b.getAttribute('data-tab');
          btns.forEach(function (x) { x.classList.toggle('active', x === b); });
          var scope = g.getAttribute('data-scope') ? document.getElementById(g.getAttribute('data-scope')) : document;
          var panes = (scope || document).querySelectorAll('[data-pane]');
          panes.forEach(function (p) {
            p.classList.toggle('hidden', p.getAttribute('data-pane') !== key);
          });
        });
      });
    });
  };

  /* --- URL 参数 --- */
  Back.qs = function (k) {
    return new URLSearchParams(location.search).get(k) || '';
  };

  /* --- 状态色辅助 --- */
  Back.onOff = function (s) {
    return s === 'on'
      ? '<span class="badge badge-pass">启用</span>'
      : '<span class="badge badge-gray">停用</span>';
  };
  Back.staffAv = function (s, size) {
    var sizeCls = size === 'xs' ? 'av-xs' : 'av-sm';
    var ch = (s.name || '?').charAt(0);
    var bg = s.avatar === 'override' ? '#2E7DD7' : BACK_DATA.avatarColor(s.name);
    var mark = s.avatar === 'override' ? '<i class="av-replaced">✓</i>' : '';
    return '<span class="' + sizeCls + '" style="background:' + bg + '">' + ch + mark + '</span>';
  };
  Back.staffName = function (id) {
    var s = BACK_DATA.member(id);
    return s ? s.name : '<span class="text-4">—</span>';
  };

  /* --- 当前所选医院(顶栏核心)--- */
  Back.currentHospital = function () {
    if (!window.BACK_DATA) return null;
    var id = BACK_DATA.getCurrentHospitalId();
    return BACK_DATA.hospital(id) || null;
  };
  Back.requireHospital = function () {
    var h = Back.currentHospital();
    if (!h) {
      Back.toast('请先选择医院', 'warn');
      setTimeout(function () { location.href = 'back-hospital-pick.html'; }, 700);
      return null;
    }
    return h;
  };
  Back.requireHospitalAndApply = function () {
    var h = Back.requireHospital();
    if (h) document.body.setAttribute('data-hid', h.id);
    return h;
  };

  /* 按当前医院过滤数据集。
     kind ∈ depts | staff | patients | drugs | components | pending */
  Back.hospFilter = function (items, kind) {
    var h = Back.currentHospital();
    if (!h) return [];
    var cds = BACK_DATA.deptListByHospital(h.id).map(function (d) { return d.id; });
    if (kind === 'depts') return items.filter(function (x) { return x.hospitalId === h.id; });
    if (kind === 'staff') return items.filter(function (x) { return cds.indexOf(x.deptId) >= 0; });
    if (kind === 'patients') return items.filter(function (x) {
      /* ⚠️ 2026-10-26:主管医生已下沉到「患者-项目参与」维度,
       *    科室按**主项目**(第一条在管参与记录)下的主管医生推导。 */
      var mp = BACK_DATA.mainProj(x);
      var mem = mp && mp.docId ? BACK_DATA.member(mp.docId) : null;
      var d = mem ? BACK_DATA.dept(mem.deptId) : null;
      return !!(d && d.hospitalId === h.id);
    });
    if (kind === 'drugs') return items.filter(function (x) { return x.hospitalId === h.id; });
    if (kind === 'components') return items.filter(function (x) { return cds.indexOf(x.deptId) >= 0; });
    if (kind === 'pending') return items.filter(function (x) { return x.hospitalId == null || x.hospitalId === h.id; });
    return items;
  };

  /* 当前作用域小提示(放在 page-head 之后)—— 复用 .hp-scope */
  Back.scopeStrip = function (extraHtml) {
    var h = Back.currentHospital();
    if (!h) return '';
    return '<div class="hp-scope"><img src="' + ICONS + 'icon-info.png">'
      +   '<div><b>当前作用域:' + h.name + '</b>(' + h.level + ' · ' + h.area
      +   ')。' + (extraHtml || '后续所有列表均按本院过滤') + '<span style="margin-left:8px">'
      +   '<a href="back-hospital-pick.html" style="color:var(--brand);text-decoration:underline">切换医院</a>'
      +   '</span></div></div>';
  };

  document.addEventListener('DOMContentLoaded', mount);
  window.Back = Back;
})();