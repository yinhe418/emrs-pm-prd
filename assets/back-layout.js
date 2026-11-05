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
    /* 项目管理(2026-11-05 新增,PM 产出 back-project*.html):
     * 归**任务组**、排在「任务组件库」之后 —— 项目是任务的编排载体,
     * 项目里的任务模板就是从任务组件库挑组件拼出来的,同组相邻能表达上下游。
     * ⚠️ 口径已拍板:项目模块归**医院视图**(超管未选院的平台视图不出现),
     *    真前端路由 /projects(不带 /admin 前缀),平台视图的灰项「项目设置」撤掉。
     *    本原型侧栏只有医院视图一套(没有平台视图),故此处直接挂上。 */
    { type: 'item', page: 'projects',icon: 'icon-tab-projects', name: '项目管理',     href: 'back-projects.html' },
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
  /* ⚠️ 顶栏的「当前医院 / 切换当前医院」判据 = **登录会话**(契约 §13.11.8 第 13/14 条):
   *    令牌是不透明串,前端解析不出「我是谁 / 我在管哪家医院」⇒
   *    **事实源是令牌的作用域**,本地只缓存一份**显示用**摘要。
   *    · 平台超管(未选院)⇒ 显示「未选择医院」+「选择医院」入口
   *    · 平台超管(已选院)⇒ 显示该院 +「切换当前医院」入口(⛔ 只有超管有)
   *    · 院管             ⇒ 显示本院,**没有**切换入口(院管只属于一家医院)
   *    · 没有会话(直接浏览静态原型)⇒ 沿用演示数据层的当前医院,保留「切换」以便看多院数据 */
  function renderTop(crumb) {
    var c = (crumb || []).map(function (x) {
      return x.href ? '<a href="' + x.href + '">' + x.name + '</a>' : '<b>' + x.name + '</b>';
    }).join(' &nbsp;/&nbsp; ');

    var api = window.BackApi || null;
    var sess = api ? api.getSession() : null;
    var isPlatform = api ? api.isPlatformAdmin() : false;
    var hpill;

    if (sess) {
      if (sess.hospital) {
        var short = sess.hospital.shortName || sess.hospital.name || '?';
        hpill = '<div class="top-hospital" title="当前医院(由登录会话的作用域决定,后端按它过滤数据)">'
          +   '<span class="th-mark">' + esc(short.charAt(0)) + '</span>'
          +   '<span class="th-text">'
          +     '<b>' + esc(sess.hospital.name) + '</b>'
          +     '<span class="th-sub">' + esc(sess.hospital.level || '') + ' · 登录会话</span>'
          +   '</span>'
          /* ⛔ 院管**没有**切换入口(契约 §13.11.7.2) */
          +   (isPlatform
                ? '<a class="th-switch" href="back-hospital-pick.html" data-action="switch-hospital">切换当前医院</a>'
                : '')
          + '</div>';
      } else {
        /* 平台超管还没选院 */
        hpill = '<div class="top-hospital none" title="平台超级管理员:尚未选择医院">'
          +   '<span class="th-mark warn">!</span>'
          +   '<span class="th-text"><b>平台超级管理员 · 未选择医院</b>'
          +     '<span class="th-sub">选定一家即可进入该院后台</span></span>'
          +   '<a class="th-switch" href="back-hospital-pick.html">选择医院</a>'
          + '</div>';
      }
    } else {
      // 没有会话:演示态。沿用演示数据层的当前医院,保留「切换」以便浏览多院数据。
      var h = Back.currentHospital();
      hpill = h
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
    }

    var uname = sess ? (sess.displayName || '后台用户') : '后台管理员';

    return '<header class="back-top">'
         +  '<div class="top-left">'
         +    hpill
         +    '<div class="top-crumb">' + c + '</div>'
         +  '</div>'
         +  '<div class="top-search"><img src="' + ICONS + 'icon-search.png' + '" alt="">'
         +  '<input placeholder="搜索人员 / 病患 / 组件 / 药品"></div>'
         +  '<div class="top-user"><div class="tu-av">' + esc(uname.charAt(0)) + '</div><span>' + esc(uname) + '</span><span style="margin:0 6px;color:var(--line)">|</span><a class="btn-text" href="back-login.html" data-action="logout">退出</a></div>'
         + '</header>';
  }

  /* HTML 转义(顶栏要显示后端返回的显示名 / 医院名) */
  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---------- 挂载 ---------- */
  var CURRENT_CRUMB = [{ name: '后台管理' }];

  function mount() {
    var b = document.body;
    if (b.hasAttribute('data-noshell')) return;   // 登录页等无壳页面
    var active = b.getAttribute('data-page') || '';
    var crumb = null;
    var ce = b.getAttribute('data-crumb');
    if (ce) { try { crumb = JSON.parse(ce); } catch (e) { crumb = null; } }
    if (!crumb) crumb = [{ name: '后台管理' }];
    CURRENT_CRUMB = crumb;

    b.className = 'back-body';
    b.insertAdjacentHTML('afterbegin', renderTop(crumb) + renderSide(active));

    // 侧边栏待分配角标
    var bd = document.querySelector('[data-badge="pendingCount"]');
    if (bd && window.BACK_DATA) {
      var n = window.BACK_DATA.pendingCount;
      bd.textContent = n; if (!n) bd.style.display = 'none';
    }

    /* ⚠️ 页面加载时问一次后端「我是谁 / 我在管哪家医院」(契约 §13.11.8 第 13 条):
     *    令牌是不透明串 ⇒ 刷新页面后本地摘要可能过期,以服务端为准。
     *    校正到不同了才重画顶栏(避免闪一下)。 */
    if (window.BackApi) refreshSession();
  }

  /* 用 GET /platform/session 的结果校正会话摘要;变了就重画顶栏 */
  function refreshSession() {
    BackApi.getSessionScope().then(function (data) {
      if (!data) return;
      var s = BackApi.getSession();
      if (!s) return;
      var changed = false;
      if (data.scope && s.scope !== data.scope) { s.scope = data.scope; changed = true; }
      if (data.displayName && s.displayName !== data.displayName) { s.displayName = data.displayName; changed = true; }
      var oldId = s.hospital ? String(s.hospital.id) : '';
      var newId = data.hospital ? String(data.hospital.id) : '';
      if (oldId !== newId) { s.hospital = data.hospital || null; changed = true; }
      if (!changed) return;
      BackApi.updateSession(s);
      repaintTop();
    }).catch(function () {
      /* 40101 / 后端不可达:不在这里打断页面(页面自己的守卫会处理) */
    });
  }

  function repaintTop() {
    var old = document.querySelector('.back-top');
    if (!old) return;
    var tmp = document.createElement('div');
    tmp.innerHTML = renderTop(CURRENT_CRUMB);
    var fresh = tmp.firstChild;
    if (fresh) old.parentNode.replaceChild(fresh, old);
  }

  /* ---------- 登出(全站统一)----------
   * ⚠️ 契约 §13.11.8 第 10 条:POST /auth/logout + **清空两种存储**。
   * ⚠️ 顶栏「退出」在每个后台页都有 ⇒ 处理器挂在 layout 上,不在各页重复写。 */
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-action="logout"]') : null;
    if (!t) return;
    e.preventDefault();
    var p = (window.BackApi && BackApi.logout)
      ? BackApi.logout()
      : Promise.resolve();
    p.then(function () { location.href = 'back-login.html'; });
  });

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
    /* 点遮罩关闭:遮罩与抽屉**一起**关。
     * ⚠️ 2026-11-05 修:原来只摘遮罩的 on,抽屉还开着 → 遮罩没了、抽屉盖在页面上,
     *    点哪儿都点不到后面的按钮。 */
    if (t.classList && t.classList.contains('drawer-mask')) {
      t.classList.remove('on');
      var dd = t.id ? document.querySelector('.drawer[data-mask="' + t.id + '"]') : null;
      if (dd) dd.classList.remove('on');
      document.body.style.overflow = '';
    }
    if (t.classList && t.classList.contains('modal-mask')) {
      t.classList.remove('on');
      document.body.style.overflow = '';
    }
    if (t.classList && (t.classList.contains('d-close') || t.classList.contains('m-close'))) {
      var box = t.closest('.drawer, .modal');
      if (box) {
        box.classList.remove('on');
        /* 抽屉的遮罩是独立元素(有 data-mask 指回来),必须一起关,
         * 否则会留一层 pointer-events:auto 的透明遮罩挡住整页。 */
        var mkId = box.getAttribute('data-mask');
        var mk = mkId ? document.getElementById(mkId) : null;
        if (mk) mk.classList.remove('on');
        /* 弹窗的 on 类在**遮罩**上(Back.modal 切的就是遮罩),这里补切一次 */
        var pm = box.parentElement;
        if (pm && pm.classList && pm.classList.contains('modal-mask')) pm.classList.remove('on');
        document.body.style.overflow = '';
      }
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.drawer.on, .modal-mask.on').forEach(function (x) {
        x.classList.remove('on');
        /* 抽屉的遮罩一起关 */
        var mkId = x.getAttribute && x.getAttribute('data-mask');
        var mk = mkId ? document.getElementById(mkId) : null;
        if (mk) mk.classList.remove('on');
      });
      document.querySelectorAll('.drawer-mask.on').forEach(function (x) { x.classList.remove('on'); });
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
      + 'font-size:12.5px;font-weight:500;box-shadow:0 6px 20px rgba(15,23,42,.16);max-width:60vw;'
      /* ⛔ toast 是被动提示,**不许拦点击** —— 否则它正好压住表单顶部的必填项 */
      + 'pointer-events:none;';
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

  /* --- 状态色辅助 ---
   * ⚠️ status 已数值化(DB TINYINT):1 启用 / 0 停用。
   *    不要写 `s === 'on'`;也不要用 truthy 判断 —— 0(停用)是 falsy。
   */
  Back.onOff = function (s) {
    return s === 1
      ? '<span class="badge badge-pass">启用</span>'
      : '<span class="badge badge-gray">停用</span>';
  };
  /* staff.status 5 值 → 文案 / 样式(1 在职 / 0 停用 / 2 待认领 / 3 处理中 / 4 已归档) */
  Back.staffStatus = function (s) {
    if (s === 1) return '<span class="badge badge-pass">在职</span>';
    if (s === 0) return '<span class="badge badge-gray">已停用</span>';
    if (s === 2) return '<span class="badge badge-block">待认领</span>';
    if (s === 3) return '<span class="badge badge-info">处理中</span>';
    if (s === 4) return '<span class="badge badge-gray">已归档</span>';
    return '<span class="text-4">—</span>';
  };
  Back.staffAv = function (s, size) {
    var sizeCls = size === 'xs' ? 'av-xs' : 'av-sm';
    /* 待分配的人 name 为空,取微信昵称首字(avatarText 同口径) */
    var dispName = s.name || s.nickName || '?';
    var ch = (s.avatarText || dispName).charAt(0);
    var bg = s.avatarSource === 'override' ? '#2E7DD7' : BACK_DATA.avatarColor(dispName);
    var mark = s.avatarSource === 'override' ? '<i class="av-replaced">✓</i>' : '';
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
      /* ⚠️ 院管没有「选院」这件事 ⇒ 回工作台;平台超管才去选院页 */
      var isPlatform = (window.BackApi && BackApi.isPlatformAdmin());
      Back.toast(isPlatform ? '请先选择医院' : '未取到医院上下文', 'warn');
      setTimeout(function () {
        location.href = isPlatform ? 'back-hospital-pick.html' : 'back-dashboard.html';
      }, 700);
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
     kind ∈ depts | staff | patients | drugs | components | pending
     ⚠️ id 数值化后,凡是比较 hospitalId / departmentId 的地方都用**容错比较** ——
     *    当前医院 id 可能来自 localStorage(字符串),直接 `===` 会把整院数据筛空。 */
  Back.hospFilter = function (items, kind) {
    var h = Back.currentHospital();
    if (!h) return [];
    var cds = BACK_DATA.deptListByHospital(h.id).map(function (d) { return d.id; });
    var sameHosp = function (x) { return String(x.hospitalId) === String(h.id); };
    if (kind === 'depts') return items.filter(sameHosp);
    /* ⚠️ staff 口径:按 staff 自己的 hospital_id 列过滤(2026-10-28 起每行都带 hospitalId)。
     *    合并前 pending 行没有 hospitalId,老写法 `x.hospitalId == null` 恒真 →
     *    待分配 Tab 会显示别院的人。现在每行都有 hospitalId,这个洞自动消失。
     *    ⚠️ 待分配 / 已归档的人也在本院范围内 —— 是否属于某个 Tab 由 status 决定,
     *    「选人」下拉另由 staffWithRole(status === 1 && 已分科室)把关。 */
    if (kind === 'staff') return items.filter(sameHosp);
    if (kind === 'patients') return items.filter(function (x) {
      /* ⚠️ 2026-10-26:主管医生已下沉到「患者-项目参与」维度,
       *    科室按**主项目**(第一条在管参与记录)下的主管医生推导。 */
      var mp = BACK_DATA.mainProj(x);
      var mem = mp && mp.docId ? BACK_DATA.member(mp.docId) : null;
      var d = mem ? BACK_DATA.dept(mem.departmentId) : null;
      return !!(d && String(d.hospitalId) === String(h.id));
    });
    if (kind === 'drugs') return items.filter(sameHosp);
    if (kind === 'components') return items.filter(function (x) {
      return cds.some(function (cid) { return String(cid) === String(x.departmentId); });
    });
    if (kind === 'pending') return items.filter(function (x) {
      return x.hospitalId == null || String(x.hospitalId) === String(h.id);
    });
    return items;
  };

  /* 当前作用域小提示(放在 page-head 之后)—— 复用 .hp-scope */
  Back.scopeStrip = function (extraHtml) {
    var h = Back.currentHospital();
    if (!h) return '';
    /* ⛔ 切换入口只给平台超管(院管只属于一家医院) */
    var isPlatform = (window.BackApi && BackApi.isPlatformAdmin());
    var link = isPlatform
      ? '<span style="margin-left:8px"><a href="back-hospital-pick.html" style="color:var(--brand);text-decoration:underline">切换当前医院</a></span>'
      : '';
    return '<div class="hp-scope"><img src="' + ICONS + 'icon-info.png">'
      +   '<div><b>当前作用域:' + h.name + '</b>(' + h.level + ' · ' + h.area
      +   ')。' + (extraHtml || '后续所有列表均按本院过滤') + link
      +   '</div></div>';
  };

  document.addEventListener('DOMContentLoaded', mount);
  window.Back = Back;
})();