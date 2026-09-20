/* ==========================================================
 * EMRS · 桌面端预览模式(layout.js)
 * 视口 >= 768: 注入 phone-stage → phone-wrapper(真实 iPhone 外框) + 左右导航
 * 视口 481-767: 只注入 phone-stage → phone-wrapper
 * 视口 <= 480: 啥都不做,直接全屏 App
 * 改视口大小时重新评估(支持旋转/调整窗口)
 *
 * 包裹结构(三层):
 *   <div class="phone-stage">              <!-- flex:1 1 auto; min-height:0,中间可压缩区 -->
 *     <div class="phone-wrapper">          <!-- 钛金属边框 + 侧边按键,scale 由 JS 计算 -->
 *       <div class="phone-screen">         <!-- 实际屏幕区域,内部滚动 -->
 *         <div class="app">...</div>       <!-- 原小程序,移入此层 -->
 *       </div>
 *     </div>
 *   </div>
 * ========================================================== */
(function () {
  'use strict';

  // 角色 -> { 主页面, 菜单项 }
  var ROLE_MAP = {
    index: {
      label: '演示入口',
      icon: 'icon-tab-home',
      home: 'index.html',
      pages: [
        { name: '演示入口', icon: 'icon-tab-home', href: 'index.html' },
        { name: '角色切换', icon: 'icon-tab-switch', href: 'role-switch.html' }
      ]
    },
    patient: {
      label: '患者端',
      icon: 'icon-role-patient',
      home: 'patient-home.html',
      pages: [
        { name: '首页', icon: 'icon-tab-home', href: 'patient-home.html' },
        { name: '任务列表', icon: 'icon-tab-tasks', href: 'patient-tasks.html' },
        { name: '血压任务', icon: 'icon-bp', href: 'patient-task-bp.html' },
        { name: '用药任务', icon: 'icon-pill', href: 'patient-task-med.html' },
        { name: '随访任务', icon: 'icon-calendar', href: 'patient-task-followup.html' },
        { name: '资料上传', icon: 'icon-camera', href: 'patient-task-upload.html' },
        { name: '个人计划', icon: 'icon-document', href: 'patient-plan.html' },
        { name: '健康资讯', icon: 'icon-book', href: 'patient-edu.html' },
        { name: '即时通讯', icon: 'icon-im', href: 'patient-im.html' },
        { name: '扫码进入', icon: 'icon-camera', href: 'patient-scan.html' },
        { name: '家属代填', icon: 'icon-family', href: 'patient-elderly-help.html' },
        { name: '老年关怀', icon: 'icon-info', href: 'patient-auth.html' },
        { name: '项目登记', icon: 'icon-microscope', href: 'patient-research.html' },
        { name: '项目详情', icon: 'icon-folder', href: 'patient-project-detail.html' },
        { name: '90 天报告', icon: 'icon-document', href: 'patient-report-90.html' },
        { name: '紧急求助', icon: 'icon-sos', href: 'patient-emergency.html' },
        { name: '急救记录', icon: 'icon-document', href: 'patient-emergency-recorded.html' },
        { name: '最近急诊', icon: 'icon-call', href: 'patient-emergency-nearest.html' }
      ]
    },
    doctor: {
      label: '主管医生',
      icon: 'icon-role-doctor',
      home: 'doctor-home.html',
      pages: [
        { name: '主页', icon: 'icon-tab-home', href: 'doctor-home.html' },
        { name: '任务列表', icon: 'icon-tab-tasks', href: 'doctor-tasks.html' },
        { name: '任务详情', icon: 'icon-document', href: 'doctor-task-detail.html' },
        { name: '患者列表', icon: 'icon-tab-people', href: 'doctor-patients.html' },
        { name: '患者详情', icon: 'icon-info', href: 'doctor-patient-detail.html' },
        { name: '分配护士', icon: 'icon-tab-people', href: 'doctor-assign-nurse.html' },
        { name: '下发任务', icon: 'icon-plus', href: 'doctor-issue-task.html' },
        { name: '即时通讯', icon: 'icon-tab-im', href: 'doctor-im.html' }
      ]
    },
    nurse: {
      label: '护士',
      icon: 'icon-role-nurse',
      home: 'nurse-home.html',
      pages: [
        { name: '主页', icon: 'icon-tab-home', href: 'nurse-home.html' },
        { name: '任务列表', icon: 'icon-tab-tasks', href: 'nurse-tasks.html' },
        { name: '任务详情', icon: 'icon-document', href: 'nurse-task-detail.html' },
        { name: '患者列表', icon: 'icon-tab-people', href: 'nurse-patients.html' },
        { name: '患者详情', icon: 'icon-info', href: 'nurse-patient-detail.html' },
        { name: '转交患者', icon: 'icon-transfer', href: 'nurse-transfer.html' }
      ]
    },
    director: {
      label: '科室主任',
      icon: 'icon-role-director',
      home: 'director-home.html',
      pages: [
        { name: '主页', icon: 'icon-tab-home', href: 'director-home.html' },
        { name: '项目详情', icon: 'icon-tab-projects', href: 'director-project-detail.html' },
        { name: '评估查看', icon: 'icon-tab-eval', href: 'director-evaluation.html' }
      ]
    },
    admin: {
      label: '系统维护',
      icon: 'icon-role-admin',
      home: 'admin-projects.html',
      pages: [
        { name: '项目管理', icon: 'icon-tab-projects', href: 'admin-projects.html' },
        { name: '项目编辑', icon: 'icon-edit', href: 'admin-project-edit.html' },
        { name: '任务库', icon: 'icon-tab-tasklib', href: 'admin-task-lib.html' },
        { name: '任务编辑', icon: 'icon-edit', href: 'admin-task-edit.html' },
        { name: '药品库', icon: 'icon-tab-drugs', href: 'admin-drugs.html' },
        { name: '药品编辑', icon: 'icon-edit', href: 'admin-drug-edit.html' }
      ]
    }
  };

  // 左侧角色快捷入口(固定顺序)
  var ROLE_SHORTCUTS = [
    { key: 'patient',   icon: 'icon-role-patient' },
    { key: 'doctor',    icon: 'icon-role-doctor' },
    { key: 'nurse',     icon: 'icon-role-nurse' },
    { key: 'director',  icon: 'icon-role-director' },
    { key: 'admin',     icon: 'icon-role-admin' }
  ];

  // 当前页文件名(去掉 query / hash,避免 patient-rate.html?member=xxx 被误判)
  var path = window.location.pathname.split('/').pop() || 'index.html';
  var currentFile = path;

  // 根据文件名推断角色
  function detectRole(file) {
    if (file.indexOf('patient') === 0) return 'patient';
    if (file.indexOf('doctor') === 0 || file.indexOf('doctor-') === 0) return 'doctor';
    if (file.indexOf('nurse') === 0) return 'nurse';
    if (file.indexOf('director') === 0) return 'director';
    if (file.indexOf('admin') === 0) return 'admin';
    if (file === 'index.html' || file === 'role-switch.html') return 'index';
    return 'index';
  }

  function svgIcon(id) {
    return '<svg aria-hidden="true"><use href="assets/icons.svg#' + id + '"></use></svg>';
  }

  function buildLeftNav(currentRole) {
    var html = '<div class="preview-nav preview-nav-left">';
    html += '<div class="preview-nav-title">角色入口</div>';
    ROLE_SHORTCUTS.forEach(function (r) {
      var role = ROLE_MAP[r.key];
      var isCurrent = r.key === currentRole;
      html += '<a href="' + role.home + '" class="preview-nav-item' + (isCurrent ? ' current' : '') + '">';
      html += '<span class="preview-nav-icon">' + svgIcon(r.icon) + '</span>';
      html += '<span>' + role.label + '</span>';
      html += '</a>';
    });
    html += '<div class="preview-nav-divider"></div>';
    html += '<a href="role-switch.html" class="preview-nav-item">';
    html += '<span class="preview-nav-icon">' + svgIcon('icon-switch') + '</span>';
    html += '<span>切换角色</span>';
    html += '</a>';
    html += '<a href="index.html" class="preview-nav-item">';
    html += '<span class="preview-nav-icon">' + svgIcon('icon-tab-home') + '</span>';
    html += '<span>演示入口</span>';
    html += '</a>';
    html += '</div>';
    return html;
  }

  function buildRightNav(currentRole) {
    var role = ROLE_MAP[currentRole] || ROLE_MAP.index;
    var html = '<div class="preview-nav preview-nav-right">';
    html += '<div class="preview-nav-title">' + role.label + ' · 页面</div>';
    if (currentRole === 'index') {
      html += '<div class="preview-nav-empty">演示入口页。点击左侧角色进入对应端。</div>';
    } else {
      role.pages.forEach(function (p) {
        var isCurrent = p.href === currentFile;
        html += '<a href="' + p.href + '" class="preview-nav-item' + (isCurrent ? ' current' : '') + '">';
        html += '<span class="preview-nav-icon">' + svgIcon(p.icon) + '</span>';
        html += '<span>' + p.name + '</span>';
        html += '</a>';
      });
    }
    html += '</div>';
    return html;
  }

  // 把 .app 从 phone-screen(若有)移回 body 顶层
  // 不删 .app 本身,只删 stage + wrapper + screen 容器链
  function unwrapApp() {
    var app = document.querySelector('.app');
    if (!app) return;
    var screen = app.parentNode;
    if (!screen || !screen.classList || !screen.classList.contains('phone-screen')) return;
    var wrapper = screen.parentNode;
    var stage = wrapper ? wrapper.parentNode : null;
    // 先把 app 移出来,避免被一起删
    document.body.appendChild(app);
    // 从最外层(若有)向下删
    if (stage && stage.parentNode) {
      stage.parentNode.removeChild(stage);
    } else if (wrapper && wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper);
    } else if (screen && screen.parentNode) {
      screen.parentNode.removeChild(screen);
    }
  }

  // 把现有 .app 包进 phone-stage → phone-wrapper → phone-screen(若未包)
  function wrapApp() {
    unwrapApp(); // 先确保 .app 在 body 顶层

    var app = document.querySelector('.app');
    if (!app) return null;

    // 已经包过(避免重复)
    if (app.closest('.phone-screen')) return app;

    // 三层结构: stage → wrapper → screen → app
    var stage = document.createElement('div');
    stage.className = 'phone-stage';

    var wrapper = document.createElement('div');
    wrapper.className = 'phone-wrapper';

    var screen = document.createElement('div');
    screen.className = 'phone-screen';

    // 状态栏(顶部时间/电量)
    var statusBar = document.createElement('div');
    statusBar.className = 'phone-status-bar';
    var now = new Date();
    var hh = now.getHours();
    var mm = now.getMinutes();
    var time = (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
    statusBar.innerHTML =
      '<span class="time">' + time + '</span>' +
      '<span class="icons"><span>5G</span><span>&#9679;&#9679;&#9679;</span><span>&#9707;</span></span>';
    screen.appendChild(statusBar);

    // 刘海(放屏幕内顶部)
    var notch = document.createElement('div');
    notch.className = 'phone-notch';
    screen.appendChild(notch);

    // 装配(从 body 向下)
    document.body.appendChild(stage);
    stage.appendChild(wrapper);
    wrapper.appendChild(screen);
    screen.appendChild(app);

    // 侧边按键(挂在 wrapper 上,出现在外框外缘)
    wrapper.appendChild(makeSideBtn('phone-button-vol'));
    wrapper.appendChild(makeSideBtn('phone-button-vol2'));
    wrapper.appendChild(makeSideBtn('phone-button-power'));

    return app;
  }

  function makeSideBtn(cls) {
    var btn = document.createElement('div');
    btn.className = cls;
    return btn;
  }

  // 等比缩放 phone-wrapper,保证始终完整落在 phone-stage 内
  // .phone-stage 是 flex:1 1 0%; min-height:0; overflow:hidden
  // 用 requestAnimationFrame 确保布局完成后再读 clientHeight
  function fitPhone() {
    requestAnimationFrame(function () {
      var wrapper = document.querySelector('.phone-wrapper');
      if (!wrapper) return;
      var stage = document.querySelector('.phone-stage');
      var availH = stage ? stage.clientHeight : window.innerHeight - 32;
      var availW = window.innerWidth - 32;
      var scale = Math.min(
        availH / 868,
        availW / 414,
        1
      );
      wrapper.style.transform = 'scale(' + Math.max(scale, 0.4) + ')';
      wrapper.style.transformOrigin = 'center center';
    });
  }

  function applyPreview() {
    var w = window.innerWidth;

    // 移除旧的导航 / 切换栏 / phone-stage(wrapper/screen 由 unwrapApp 安全拆,不删 .app)
    document.body.classList.remove('preview-mode');
    var olds = document.querySelectorAll('.preview-nav, .preview-switch-bar, .phone-stage');
    olds.forEach(function (n) {
      if (n.parentNode) n.parentNode.removeChild(n);
    });

    if (w <= 480) {
      unwrapApp(); // 兜底:拆掉 wrapper,保证移动端全屏 App
      return;
    }

    document.body.classList.add('preview-mode');

    // 包裹 .app(只在需要时包一次,wrapApp 内部会先 unwrapApp)
    wrapApp();

    // 重新计算缩放
    fitPhone();

    var role = detectRole(currentFile);

    // 1) 下方切换栏(总展示,768+)
    if (w >= 768) {
      var barHtml = buildSwitchBar(role);
      document.body.insertAdjacentHTML('beforeend', barHtml);
    }

    // 2) 左右导航在 >=1100 显示(覆盖主流桌面视口 1280-1920)
    if (w >= 1100) {
      var leftHtml = buildLeftNav(role);
      var rightHtml = buildRightNav(role);
      document.body.insertAdjacentHTML('beforeend', leftHtml);
      document.body.insertAdjacentHTML('beforeend', rightHtml);

      // 滚动到当前项
      setTimeout(function () {
        var current = document.querySelector('.preview-nav-item.current');
        if (current && current.scrollIntoView) {
          var nav = current.closest('.preview-nav');
          if (nav) {
            var navRect = nav.getBoundingClientRect();
            var itemRect = current.getBoundingClientRect();
            if (itemRect.top < navRect.top || itemRect.bottom > navRect.bottom) {
              current.scrollIntoView({ block: 'center' });
            }
          }
        }
      }, 60);
    }
  }

  // === 下方切换栏:按角色分组 ===
  function buildSwitchBar(currentRole) {
    var groups = [
      { key: 'system',   title: '演示入口', cls: 'system',
        items: [
          { name: '演示入口', icon: 'icon-tab-home',  href: 'index.html' },
          { name: '角色切换', icon: 'icon-switch',   href: 'role-switch.html' }
        ]
      },
      { key: 'patient',  title: '患者端',   cls: 'patient',  items: ROLE_MAP.patient.pages },
      { key: 'doctor',   title: '主管医生', cls: 'doctor',   items: ROLE_MAP.doctor.pages },
      { key: 'nurse',    title: '护士',     cls: 'nurse',    items: ROLE_MAP.nurse.pages },
      { key: 'director', title: '科室主任', cls: 'director', items: ROLE_MAP.director.pages },
      { key: 'admin',    title: '系统维护', cls: 'admin',    items: ROLE_MAP.admin.pages }
    ];

    var html = '<div class="preview-switch-bar">';
    html += '<div class="preview-switch-bar-header">';
    html += '<span>页面跳转 · ' + (ROLE_MAP[currentRole] ? ROLE_MAP[currentRole].label : '演示入口') + '</span>';
    html += '<span class="hint">共 ' + groups.reduce(function (s, g) { return s + g.items.length; }, 0) + ' 个页面 · 当前页高亮</span>';
    html += '</div>';

    groups.forEach(function (g) {
      html += '<div class="preview-switch-group ' + g.cls + '">';
      html += '<div class="preview-switch-group-title"><span class="dot"></span>' + g.title + '</div>';
      html += '<div class="preview-switch-items">';
      g.items.forEach(function (p) {
        var isCurrent = p.href === currentFile;
        html += '<a href="' + p.href + '" class="preview-switch-item' + (isCurrent ? ' current' : '') + '" title="' + p.name + '">';
        html += svgIcon(p.icon);
        html += '<span>' + p.name + '</span>';
        html += '</a>';
      });
      html += '</div>';
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  // 监听 DOMContentLoaded 后才执行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyPreview);
  } else {
    applyPreview();
  }

  // 视口变化时重新评估
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      applyPreview();
      fitPhone();
    }, 120);
  });
})();