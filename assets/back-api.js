/* ==========================================================
 * EMRS 后台 · 后端 API 客户端(BackApi)
 * ----------------------------------------------------------
 * 契约来源:docs/architecture/backend-architecture.md
 *   §13.1 通用约定(基址 / 认证 / 分页 / id 类型)
 *   §13.2 统一响应包络 {code, message, data, requestId, serverTime, errors?}
 *   §13.3 错误码规范
 *   §13.11 两级管理员 · 登录名全平台唯一 ·「记住我」令牌层(2026-10-30 用户拍板)
 *   §13.11.8 FE 落地清单(1–14 条,本文件逐条对应)
 *
 * ⚠️ 为什么路径写**相对路径** '/api/adm/v1/...':
 *    后端**没有 CORS 中间件**,跨源直连会被浏览器拦。
 *    所以前端一律走同源相对路径,由 C 仓的 serve.py 反向代理到后端
 *    (serve.py 会原样保留 Authorization 头)。
 *    ⚠️ **不要**在这里写死 http://127.0.0.1:8080。
 *
 * ⚠️ 前缀为什么是 `/api/adm/v1` 而不是 /api/v1:
 *    后端网关把对外路径分成两个入口 —— 后台 /api/adm/v1/…、小程序 /api/mini/v1/…,
 *    网关剥掉 /adm(或 /mini)后再转发给后端,后端内部仍是 /api/v1/…。
 *    所以**浏览器直接看到的**公开路径必须带 /adm 段;少写会绕开网关的入口分流。
 *    (旧 /api/v1/… 是过渡别名,暂时还能通,但不要依赖它。)
 *
 * ⚠️ id 一律用**容错比较**(String(a) === String(b)):
 *    URL 参数 / sessionStorage 取出来的是字符串,与接口返回的数字直接 === 会静默失配。
 * ========================================================== */
var BackApi = (function () {
  'use strict';

  /* API 基址(相对路径 —— 靠 serve.py 的反代,见文件头注释)
   * ⚠️ 带 /adm 段是网关的**后台入口**;serve.py 直跑时会把这个前缀剥回 /api 再转发。 */
  var API_BASE = '/api/adm/v1';

  /* ---------- 存储键名(§13.11.6.6 令牌存储口径)----------
   * ⚠️ rememberMe = false ⇒ access token 存 **sessionStorage**
   * ⚠️ rememberMe = true  ⇒ access + refresh token 存 **localStorage**
   * ⚠️ 登出时**两个存储都要清**。
   * ⛔ refresh token 不进 URL、不进埋点、不进日志、不进会话摘要。 */
  var TOKEN_KEY = 'emrs.admin.token';
  var SESSION_KEY = 'emrs.admin.session';
  var REFRESH_KEY = 'emrs.admin.refreshToken';

  /* ---------- 「当前医院」上下文(契约 x-frontend-routes / §13.11.9.1)----------
   * ⛔ **键名照抄契约**,⛔ 不许自定;⛔ 值**只放 id**(不放名称 / 摘要)。
   * ⛔ 存 **sessionStorage**(按标签页独立;⛔ 不保留 localStorage 备选)。
   * ⚠️ 这是「当前医院」的**唯一事实源** —— 切院**只写它**,
   *    ⛔ 不调任何后端端点、⛔ 不换令牌(2026-10-30 用户拍板)。 */
  var CURRENT_HOSPITAL_KEY = 'emrs.admin.currentHospitalId';

  /* 目标医院请求头(契约 x-target-hospital:医院 id 的**唯一**传输方式) */
  var TARGET_HOSPITAL_HEADER = 'X-Target-Hospital-Id';

  /* access token TTL(契约 §13.11.6:8 小时,滑动续期) */
  var ACCESS_TTL = 28800;
  /* 「记住我」:长效凭据 7 天**绝对过期**(不滑动) */
  var REFRESH_TTL_MS = 7 * 24 * 3600 * 1000;

  /* ⚠️ 50200 = **serve.py 自己造的**码,不是后端业务码。
   *    用来区分「后端返回的业务错误」与「后端根本没连上」。
   *    后端业务码见 §13.3,区间是 400xx / 401xx / … / 50301,不会撞 50200。 */
  var CODE_BACKEND_UNREACHABLE = 50200;

  /* ---- §13.3 错误码 → 面向用户的中文标签 ----
   * ⚠️ **40104 已退役**(2026-10-30 用户拍板「登录名全平台唯一」):
   *    「同一个登录名命中 ≥2 家医院」不可能发生 ⇒ 该码不再产生 ⇒ 这里不再有它的文案。 */
  var CODE_TEXT = {
    40001: '参数缺失或格式错误',
    40002: '字段超长',
    40003: '非法排序字段',
    40101: '未登录或令牌已过期',
    40102: '账号或密码不正确',
    40103: '账号已锁定',
    40301: '无权访问其它医院的数据',
    40302: '没有该操作的权限',
    40401: '资源不存在',
    40402: '资源已停用或已归档',
    40901: '数据冲突(唯一键重复)',
    40902: '当前状态不允许该操作',
    40903: '同样的请求正在处理中,请稍后重试',
    42201: '业务规则不满足',
    42202: '数值超出允许范围',
    42901: '操作过于频繁,请稍后重试',
    50001: '服务内部错误',
    50301: '依赖服务不可用',
    50200: '后端未连接'
  };

  /* ==========================================================
   * 契约 mock(§13.11 的 3 个新端点**后端尚未实现**)
   * ----------------------------------------------------------
   * ⚠️ 为什么要 mock:
   *    §13.11 的三个端点(/auth/refresh、/auth/logout、/platform/session)
   *    + 登录响应里的 scope 字段,后端**都还没实现**
   *    ⇒ 原型直接调真后端,新流程走不通。
   *    所以本层带一个**契约形状完全一致**的本地 mock。
   *
   * ⛔ **切院没有端点**(2026-10-30 用户拍板;契约 x-frontend-routes ④ + x-target-hospital):
   *    「当前医院」= **前端上下文**(只存 id)⇒ 切院**不调后端、不换令牌**;
   *    之后每个**医院作用域**请求带请求头 `X-Target-Hospital-Id`,由服务端逐请求判定。
   *
   * ⚠️ 三种模式(BackApi.setMock):
   *    'auto'(默认) —— 先打真后端;后端不可达 / 端点未实现(404/405/501)⇒ 落 mock
   *    true         —— 强制走 mock(演示两级管理员流程用)
   *    false        —— 强制走真后端
   *
   * ⚠️ **模式必须跨页持久**(2026-10-30 ORC 复核发现):
   *    模式只存在内存里的话,每跳一次页就复位成 'auto' ⇒ 变成「半 mock 半真」:
   *    · GET /platform/hospitals/ 真后端**已实现**(200)⇒ 列表走真数据,mock 的
   *      「已停用」医院永远不出现;
   *    · POST /auth/login 真后端也**已实现**(账号不存在 ⇒ 40102 业务错)⇒
   *      40102 不是「端点未实现」⇒ 不落 mock ⇒ 超管账号根本登不进去。
   *    ⇒ 模式落 localStorage('emrs.mock.mode'),跨页、跨刷新都保持。
   *
   * ⚠️ mock 的账号约定(**不写任何口令**):
   *    用户名里含 `platform` ⇒ **平台超级管理员**(登录后 scope=platform ⇒ 进选院页)
   *    其余用户名        ⇒ **医院管理员**(scope=hospital ⇒ 直接进工作台)
   *    口令:mock 不校验(演示用;⛔ 仓里不落任何真实口令)。
   * ========================================================== */

  /* mock 模式开关的落盘键(与 emrs.mock.hospitals 同风格) */
  var MOCK_MODE_KEY = 'emrs.mock.mode';

  /* 读模式:⛔ 落盘的是**字符串** 'auto' | 'true' | 'false'
   *    (localStorage 存布尔会被 String() 成 "true"/"false",
   *    读回来必须严格比字符串 —— 别踩 YAML 1.1 那个 on/off 的同类坑)。
   *    读不到 / 值非法 ⇒ 回落 'auto'。 */
  function readMockMode() {
    var raw = '';
    try { raw = window.localStorage.getItem(MOCK_MODE_KEY) || ''; } catch (_) { raw = ''; }
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return 'auto';
  }

  var MOCK_MODE = readMockMode();
  var mockActive = false;

  /* mock 的医院列表:种子取自演示数据层(back-data.js),新增的存 localStorage 保持跨页一致 */
  var MOCK_HOSPITALS_KEY = 'emrs.mock.hospitals';

  /* ⚠️ mock 专用的一条「已停用」医院(只存在于 mock 层,不进演示数据层 back-data.js)。
   * 目的:让「停用医院不可选」这条产品行为在 demo 里**看得见**(点它 ⇒ 提示、不跳转)。
   * 真后端的 GET /platform/hospitals 只返回 status=on ⇒ 真机上不会出现这张卡。 */
  var MOCK_OFF_HOSPITAL = {
    id: '3', name: 'H 市康复医院', shortName: 'H 市康复院', level: '二级甲等',
    area: 'H 市 / 城北区', address: '', phone: '', bedCount: 260,
    intro: '演示用:已停用的医院 —— 不可选。', imageUrl: '', status: 'off'
  };

  function seedMockHospitals() {
    var out = [];
    var src = (window.BACK_DATA && window.BACK_DATA.hospitals) ? window.BACK_DATA.hospitals : [];
    src.forEach(function (h) {
      out.push({
        id: String(h.id),
        name: h.name,
        shortName: h.short || h.name,
        level: h.level || '未定级',
        area: h.area || '',
        address: '',
        phone: h.phone || '',
        bedCount: h.beds || 0,
        intro: h.intro || '',
        imageUrl: h.image || '',
        status: (h.status === 1 || h.status === 'on') ? 'on' : 'off'
      });
    });
    if (!out.length) {
      out.push({
        id: '1', name: 'H 市第一医院', shortName: 'H 市一院', level: '三级甲等',
        area: 'H 市 / 城东区', address: '', phone: '', bedCount: 0,
        intro: '', imageUrl: '', status: 'on'
      });
    }
    /* 追加 mock 专用的「已停用」医院(见 MOCK_OFF_HOSPITAL 的说明) */
    var hasOff = out.some(function (h) { return h.id === MOCK_OFF_HOSPITAL.id; });
    if (!hasOff) out.push(MOCK_OFF_HOSPITAL);
    return out;
  }

  function mockHospitals() {
    var raw = null;
    try { raw = localStorage.getItem(MOCK_HOSPITALS_KEY); } catch (_) { raw = null; }
    if (raw) {
      try {
        var arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length) {
          /* 已存列表里也保证有那条「已停用」演示医院(旧的 localStorage 缓存也要有) */
          var hasOff = arr.some(function (h) { return h.id === MOCK_OFF_HOSPITAL.id; });
          if (!hasOff) {
            arr.push(MOCK_OFF_HOSPITAL);
            try { localStorage.setItem(MOCK_HOSPITALS_KEY, JSON.stringify(arr)); } catch (_) {}
          }
          return arr;
        }
      } catch (_) { /* 落到种子 */ }
    }
    var seeded = seedMockHospitals();
    try { localStorage.setItem(MOCK_HOSPITALS_KEY, JSON.stringify(seeded)); } catch (_) {}
    return seeded;
  }

  function saveMockHospitals(list) {
    try { localStorage.setItem(MOCK_HOSPITALS_KEY, JSON.stringify(list)); } catch (_) {}
  }

  /* mock 令牌簿:长效凭据 → {username, scope, expiresAt} */
  var mockRefreshBook = {};

  function mockToken(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function mockBrief(h) {
    return { id: h.id, name: h.name, shortName: h.shortName, level: h.level };
  }

  function mockLogin(username, password, rememberMe) {
    var isPlatform = /platform/i.test(String(username || ''));
    var list = mockHospitals();
    var target = null;
    for (var i = 0; i < list.length; i++) { if (list[i].status === 'on') { target = list[i]; break; } }
    var scope = isPlatform ? 'platform' : 'hospital';
    var refreshToken = rememberMe ? mockToken('mockrt') : null;
    if (refreshToken) {
      mockRefreshBook[refreshToken] = {
        username: username, scope: scope, expiresAt: Date.now() + REFRESH_TTL_MS
      };
    }
    return {
      token: mockToken(scope === 'platform' ? 'mockplat' : 'mockhosp'),
      expiresIn: ACCESS_TTL,
      scope: scope,
      refreshToken: refreshToken,
      hospital: (scope === 'hospital' && target) ? mockBrief(target) : null,
      displayName: scope === 'platform' ? '平台管理员' : '后台管理员'
    };
  }

  function mockRefresh(refreshToken) {
    var rec = mockRefreshBook[refreshToken];
    if (!rec || rec.expiresAt < Date.now()) {
      var e = new Error('长效凭据无效 / 已吊销 / 已过期');
      e.code = 40101; e.httpStatus = 401; e.errors = [];
      throw e;
    }
    var list = mockHospitals();
    var target = null;
    for (var i = 0; i < list.length; i++) { if (list[i].status === 'on') { target = list[i]; break; } }
    return {
      token: mockToken('mockhosp'),
      expiresIn: ACCESS_TTL,
      scope: rec.scope,
      refreshToken: null,          /* ⚠️ 契约:刷新响应里 refreshToken **恒为 null**(不旋转) */
      hospital: (rec.scope === 'hospital' && target) ? mockBrief(target) : null,
      displayName: rec.scope === 'platform' ? '平台管理员' : '后台管理员'
    };
  }

  function mockLogout(refreshToken) {
    if (refreshToken) delete mockRefreshBook[refreshToken];
    return null;                   /* 幂等:永远 200 */
  }

  function mockSessionScope() {
    var s = getSession();
    if (!s) {
      var e0 = new Error('未登录或令牌已过期');
      e0.code = 40101; e0.httpStatus = 401; e0.errors = [];
      throw e0;
    }
    return {
      scope: s.scope || 'hospital',
      hospital: s.hospital || null,
      displayName: s.displayName || '',
      expiresIn: Math.max(0, Math.round(((s.expiresAt || 0) - Date.now()) / 1000))
    };
  }

  function mockListHospitals() {
    var list = mockHospitals();
    return { items: list.slice(), total: list.length };
  }

  /* mock 的建院:字段校验照契约(名称必填 2–50 字、等级在枚举内、床位 10–10000、
   * 名称全局唯一 ⇒ 40901)。⚠️ **不建管理员账号**(契约:本端点只建 hospital 行)。 */
  function mockCreateHospital(payload) {
    var fail = function (c, msg) {
      var e = new Error(msg);
      e.code = c; e.httpStatus = (c === 40901) ? 409 : 400; e.errors = [];
      throw e;
    };
    var p = payload || {};
    var name = String(p.name || '').trim();
    if (name.length < 2 || name.length > 50) fail(40001, '医院名称 2–50 字');
    var levels = ['三级甲等', '三级乙等', '二级甲等', '二级乙等', '未定级'];
    var level = p.level || '未定级';
    if (levels.indexOf(level) === -1) fail(40001, '医院等级不在枚举内');
    var beds = p.bedCount ? Number(p.bedCount) : null;
    if (beds !== null && (isNaN(beds) || beds < 10 || beds > 10000)) fail(40001, '床位数须在 10–10000');
    var list = mockHospitals();
    for (var i = 0; i < list.length; i++) {
      if (list[i].name === name) fail(40901, '医院名称已存在');
    }
    var maxId = 0;
    list.forEach(function (h) { var n = Number(h.id) || 0; if (n > maxId) maxId = n; });
    var created = {
      id: String(maxId + 1),
      name: name,
      shortName: p.shortName || name,
      level: level,
      area: p.area || '',
      address: p.address || '',
      phone: p.phone || '',
      bedCount: beds || 0,
      intro: p.intro || '',
      imageUrl: p.imageUrl || '',
      status: p.status || 'on'
    };
    list.push(created);
    saveMockHospitals(list);
    return created;
  }

  /* ---------- mock 的「本院数据」两个端点 ----------
   * ⚠️ 为什么也要 mock:验收口径是「mock 模式下**所有**请求都命中 mock,
   *    网络面板里不能出现任何真后端 200」。人员 / 职位两个端点真后端**已实现**,
   *    不 mock 的话它们会照样打真后端 ⇒ 口径不达标。
   * ⚠️ 字段形状照契约 StaffListItem / PositionSummary(C1:id 一律字符串)。 */

  function mockStaffItem(s) {
    var d = window.BACK_DATA || null;
    var dept = d ? d.dept(s.departmentId) : null;
    var pos = d ? d.pos(s.positionId) : null;
    var idOr = function (v) {
      return (v === null || v === undefined || v === '') ? '' : String(v);
    };
    return {
      id: String(s.id),
      hospitalId: String(s.hospitalId),
      departmentId: String(s.departmentId),
      departmentName: dept ? dept.name : '',
      positionId: String(s.positionId),
      positionName: pos ? pos.name : '',
      name: s.name || '',
      nickName: s.nickName || null,
      phone: s.phone || '',
      phoneMasked: (d && d.maskPhone) ? d.maskPhone(s.phone) : (s.phone || ''),
      status: Number(s.status),              /* 契约:状态是 **number** 5 值 */
      openIdMasked: '',
      wechatBound: !!s.avatarSource,
      avatarSource: s.avatarSource || '',
      avatarUrl: '',
      qrCodeId: '',
      scannedAt: s.scannedAt || '',
      claimedByStaffId: idOr(s.claimedByStaffId),
      claimedAt: s.claimedAt || '',
      claimExpiresAt: s.claimExpiresAt || '',
      archiveReason: s.archiveReason || '',
      archivedAt: s.archivedAt || '',
      archivedByStaffId: idOr(s.archivedByStaffId)
    };
  }

  /* GET /api/adm/v1/staff —— status 形如 '0,1' / '2,3' / '4' */
  function mockListStaff(status, page, pageSize) {
    var want = String(status === undefined || status === null ? '' : status)
      .split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s !== ''; });
    var src = (window.BACK_DATA && window.BACK_DATA.staff) ? window.BACK_DATA.staff : [];
    var rows = src.filter(function (s) {
      if (!want.length) return true;
      return want.indexOf(String(s.status)) >= 0;
    }).map(mockStaffItem);
    var p = Number(page) || 1, ps = Number(pageSize) || 20;
    return {
      items: rows.slice((p - 1) * ps, (p - 1) * ps + ps),
      total: rows.length, page: p, pageSize: ps
    };
  }

  /* GET /api/adm/v1/positions —— 全局字典(跨院) */
  function mockListPositions() {
    var d = window.BACK_DATA || null;
    var src = (d && d.positions) ? d.positions : [];
    var items = src.map(function (p) {
      var cat = (d && d.POS_CATS && d.POS_CATS[p.cat]) ? d.POS_CATS[p.cat] : null;
      var n = 0;
      if (d && d.staff) {
        d.staff.forEach(function (s) { if (String(s.positionId) === String(p.id)) n++; });
      }
      return {
        id: String(p.id),
        name: p.name,
        categoryCode: p.cat,
        categoryName: cat ? cat.label : p.cat,
        roleSlots: p.roles || [],
        isDeptDirector: p.name === '科室主任',
        isSeeded: !!p.seeded,
        sortOrder: p.order,
        status: p.status === 1 ? 'on' : 'off',
        staffCount: n
      };
    });
    return { items: items, total: items.length };
  }

  /* mock 模式下「后端不可达 / 端点未实现」的判定 */
  function isUnimplemented(err) {
    if (!err) return false;
    if (err.unreachable) return true;
    return err.httpStatus === 404 || err.httpStatus === 405 || err.httpStatus === 501;
  }

  /* 统一入口:按当前模式决定走 mock 还是真后端 */
  function callMock(mockFn, realFn) {
    if (MOCK_MODE === true) { mockActive = true; return Promise.resolve().then(mockFn); }
    if (MOCK_MODE === false) { mockActive = false; return realFn(); }
    return realFn().then(function (r) { mockActive = false; return r; }, function (err) {
      if (isUnimplemented(err)) { mockActive = true; return mockFn(); }
      throw err;
    });
  }

  /* ---------- 小工具 ---------- */

  /* HTML 转义:接口返回的姓名 / 科室名等一律先转义再插 DOM */
  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sessionStore() {
    try { return window.sessionStorage; } catch (_) { return null; }
  }
  function localStore() {
    try { return window.localStorage; } catch (_) { return null; }
  }

  function readKey(store, key) {
    if (!store) return '';
    try { return store.getItem(key) || ''; } catch (_) { return ''; }
  }
  function writeKey(store, key, val) {
    if (!store) return;
    try { store.setItem(key, val); } catch (_) {}
  }
  function removeKey(store, key) {
    if (!store) return;
    try { store.removeItem(key); } catch (_) {}
  }

  /* ---------- 会话(令牌 + 登录用户信息)----------
   * ⚠️ 会话摘要里**不含** refresh token —— 它单独存 localStorage(§13.11.6.6)。 */

  function getToken() {
    /* ⚠️ 先读 localStorage(rememberMe=true 的持久令牌),再读 sessionStorage */
    return readKey(localStore(), TOKEN_KEY) || readKey(sessionStore(), TOKEN_KEY);
  }

  function parseSession(raw) {
    if (!raw) return null;
    try {
      var obj = JSON.parse(raw);
      return (obj && obj.token) ? obj : null;
    } catch (_) { return null; }
  }

  /* 返回会话摘要 {token, expiresAt, displayName, scope, hospital, rememberMe} 或 null */
  function getSession() {
    var s = parseSession(readKey(localStore(), SESSION_KEY)) || parseSession(readKey(sessionStore(), SESSION_KEY));
    return s;
  }

  /* 长效凭据(只在 localStorage;⛔ 不进会话摘要) */
  function getRefreshToken() {
    return readKey(localStore(), REFRESH_KEY);
  }

  /* 存登录 / 换发 / 刷新结果
   * data      = {token, expiresIn, scope, refreshToken, hospital, displayName}
   * rememberMe= true ⇒ 存 localStorage(access + refresh);false ⇒ 只存 sessionStorage
   * keepRefresh = true ⇒ 保留已有的长效凭据(刷新 / 切院时用;那两次响应里 refreshToken 恒为 null) */
  function saveSession(data, rememberMe, keepRefresh) {
    if (!data || !data.token) return null;
    var prev = getSession();
    if (rememberMe === undefined || rememberMe === null) {
      rememberMe = prev ? !!prev.rememberMe : false;
    }
    var scope = data.scope || (data.hospital ? 'hospital' : 'platform');
    var session = {
      token: data.token,
      expiresAt: Date.now() + (Number(data.expiresIn) || ACCESS_TTL) * 1000,
      displayName: data.displayName || (prev && prev.displayName) || '',
      scope: scope,
      hospital: data.hospital || null,
      /* ⛔ **不再保留「第二把令牌」**(2026-10-30 用户拍板,契约 §13.11.4.1 / §13.11.11 第 2 行):
       *    旧模型要留一把「平台作用域令牌」是为了切院时换发带院作用域的令牌;
       *    新模型**切院不换令牌** ⇒ 一把令牌用到底 ⇒ 这个字段整条作废。 */
      rememberMe: !!rememberMe
    };
    /* 清掉「另一个存储」里的旧令牌:避免 rememberMe 切换后残留上一把 */
    if (rememberMe) {
      removeKey(sessionStore(), TOKEN_KEY); removeKey(sessionStore(), SESSION_KEY);
    } else {
      removeKey(localStore(), TOKEN_KEY); removeKey(localStore(), SESSION_KEY);
    }
    var target = rememberMe ? localStore() : sessionStore();
    writeKey(target, TOKEN_KEY, data.token);
    writeKey(target, SESSION_KEY, JSON.stringify(session));
    /* 长效凭据:rememberMe=true 才存;keepRefresh 时保留旧的(刷新响应恒不带新值) */
    if (rememberMe) {
      var rt = keepRefresh ? getRefreshToken() : (data.refreshToken || '');
      if (rt) writeKey(localStore(), REFRESH_KEY, rt);
      else removeKey(localStore(), REFRESH_KEY);
    } else {
      removeKey(localStore(), REFRESH_KEY);
    }
    return session;
  }

  function clearSession() {
    [sessionStore(), localStore()].forEach(function (st) {
      removeKey(st, TOKEN_KEY); removeKey(st, SESSION_KEY); removeKey(st, REFRESH_KEY);
    });
    /* ⚠️ 契约(§13.11.6.6 / x-frontend-routes 的 storage 段):登出后**三种存储都要清**
     *    —— access / refresh / **currentHospitalId**。
     *    ⛔ 不清的话:同一标签页里换一个账号登录,会**继承上一个账号的目标医院**
     *    ⇒ 请求头带着别人的院 id ⇒ 越权 / 串院。 */
    removeKey(sessionStore(), CURRENT_HOSPITAL_KEY);
  }

  /* ---------- 「当前医院」上下文(契约 x-frontend-routes)---------- */
  /* 读当前医院 id(契约键见上面的 CURRENT_HOSPITAL_KEY)。
   * ⛔ 读不到就是空,**绝不回落**到演示数据层的 BACK_DATA.getCurrentHospitalId()
   *    —— 它在没选过时**默认返回第一家医院** ⇒ 拿它当目标医院 = 给超管发一个错的院 id
   *    ⇒ 越权 / 串院风险(契约 x-target-hospital 的判定表 P1:超管缺该头 ⇒ 40001)。 */
  function getCurrentHospitalId() {
    return readKey(sessionStore(), CURRENT_HOSPITAL_KEY);
  }
  /* 写当前医院 id(切院 = **只写它**;⛔ 不调后端、⛔ 不换令牌)。 */
  function setCurrentHospitalId(id) {
    if (id === undefined || id === null || id === '') return '';
    var v = String(id);
    writeKey(sessionStore(), CURRENT_HOSPITAL_KEY, v);
    return v;
  }

  /* 合并更新会话摘要(页面加载时用 GET /platform/session 的结果校正用)。
   * ⚠️ 只改**显示用**的字段(scope / hospital / displayName)——
   *    令牌本身由 saveSession 负责换发,这里不动。 */
  function updateSession(patch) {
    var s = getSession();
    if (!s || !patch) return s;
    if (patch.scope) s.scope = patch.scope;
    if (patch.hospital !== undefined) s.hospital = patch.hospital;
    if (patch.displayName) s.displayName = patch.displayName;
    var target = s.rememberMe ? localStore() : sessionStore();
    writeKey(target, SESSION_KEY, JSON.stringify(s));
    return s;
  }

  /* 当前作用域:'hospital' | 'platform'(会话摘要里读;⛔ 不猜) */
  function getScope() {
    var s = getSession();
    return s ? (s.scope || (s.hospital ? 'hospital' : 'platform')) : '';
  }

  /* 是不是平台超级管理员?
   * ⚠️ 判据 = **身份**,不是场景(契约 §13.11.7.2):登录 / 刷新响应里的 `scope`。
   * ⛔ 令牌**不携带**任何医院 / 作用域(契约 §13.11.4.1)⇒ 没有「令牌里的平台标记」可读。
   * ⚠️ 切院**不改**令牌、也不改 scope ⇒ 超管选完院之后 scope 仍是 'platform'。 */
  function isPlatformAdmin() {
    var s = getSession();
    if (!s) return false;
    return s.scope === 'platform';
  }

  /* 页面守卫:没有令牌就跳登录页。
   * ⚠️ 令牌过期(40101)也走这里 —— 由调用方 catch 后再调一次。 */
  function requireAuth() {
    if (!getToken()) {
      location.href = 'back-login.html';
      return false;
    }
    return true;
  }

  /* 异步版页面守卫(§13.11.8 第 7 条):
   * access 过期但长效凭据还在 ⇒ 静默换一把;换不到才跳登录页。 */
  function ensureSession() {
    var s = getSession();
    if (s && s.token && (s.expiresAt || 0) > Date.now()) return Promise.resolve(s);
    if (getRefreshToken()) {
      return refreshAccessToken().then(function (ok) { return ok ? getSession() : null; });
    }
    return Promise.resolve(null);
  }

  /* ---------- 请求 ---------- */

  /* 把一个响应规范化成「成功给 data / 失败抛 ApiError」 */
  function toError(resp, env) {
    var backendMsg = (env && typeof env.message === 'string') ? env.message : '';
    var code = (env && typeof env.code === 'number') ? env.code : (resp.status * 100);
    var e = new Error(backendMsg || ('请求失败(HTTP ' + resp.status + ')'));
    e.code = code;
    e.httpStatus = resp.status;
    e.backendMessage = backendMsg;
    e.requestId = (env && env.requestId) ||
      (resp.headers && resp.headers.get ? (resp.headers.get('X-Request-Id') || '') : '');
    e.errors = (env && env.errors) || [];
    e.unreachable = (code === CODE_BACKEND_UNREACHABLE);
    return e;
  }

  /* 拼完整 URL:一律带 API_BASE 前缀(/api/adm/v1)。
   * ⚠️ 端点封装里写的是**契约相对路径**('/auth/login'、'/staff?…'),
   *    这里统一补前缀;已经带前缀的原样透传(兼容历史写法)。 */
  function buildUrl(path) {
    if (path === API_BASE || path.indexOf(API_BASE + '/') === 0) return path;
    return API_BASE + (path.charAt(0) === '/' ? path : '/' + path);
  }

  /* 这条路径是不是**医院作用域**(契约 x-target-hospital 的 routeClasses)?
   * ⚠️ 判据写成**排除法**:平台级 / 身份级 / 公开端点**一律不加**目标医院头,
   *    其余(科室 / 人员 / 职位 / 邀请码 / 文件上传)才是医院作用域。
   * ⚠️ path 传的是**契约相对路径**('/staff?…'),前缀由 buildUrl 补 ⇒ 这里按相对路径判。 */
  function isHospitalScopedPath(path) {
    var p = String(path || '').split('?')[0];
    if (p.indexOf('/auth/') === 0) return false;       /* 身份级:登录 / 刷新 / 登出 */
    if (p.indexOf('/platform/') === 0) return false;   /* 平台级 + 身份级:会话 / 医院列表 / 建院 */
    if (p.indexOf('/files/') === 0) return false;      /* 公开:文件读取 */
    if (p === '/healthz' || p === '/readyz') return false;
    /* ⚠️ 契约里文件**上传**属医院作用域;本单口径把 /files/* 整段排除
     *    (原型目前没有 /files 调用 ⇒ 无实际影响)。 */
    return true;
  }

  /* 发一次请求(不做 401 重试) */
  function rawRequest(path, opts) {
    opts = opts || {};
    var url = buildUrl(path);
    var headers = {};
    var body = null;

    if (opts.body !== undefined && opts.body !== null) {
      headers['Content-Type'] = 'application/json; charset=utf-8';
      body = JSON.stringify(opts.body);
    }
    if (opts.auth !== false) {
      /* ⛔ 令牌**只有一把**(切院不换令牌)⇒ 不再支持「指定用哪把」。 */
      var token = getToken();
      if (token) headers['Authorization'] = 'Bearer ' + token;
    }

    /* ---------- 目标医院请求头(契约 x-target-hospital)----------
     * · 「当前医院」= **前端上下文**(只存 id);**有值才带**这个头。
     * · ⛔ **没有值就不带** —— 超管还没选院 ⇒ 服务端按判定表 P1 回 40001
     *   ⇒ ⛔ **不许**自动填一个默认医院 id(那是越权 / 串院)。
     * · ⛔ 也不许回落演示数据层的 BACK_DATA.getCurrentHospitalId()
     *   (它没选过时默认返回第一家医院)。 */
    if (isHospitalScopedPath(path)) {
      var targetHospital = getCurrentHospitalId();
      if (targetHospital) headers[TARGET_HOSPITAL_HEADER] = targetHospital;
    }

    return fetch(url, {
      method: opts.method || 'GET',
      headers: headers,
      body: body,
      cache: 'no-store',
      credentials: 'same-origin'
    }).then(function (resp) {
      return resp.text().then(function (text) {
        var env = null;
        if (text) {
          try { env = JSON.parse(text); } catch (_) { env = null; }
        }
        /* ⚠️ 判定顺序:HTTP 非 2xx **或** 包络 code !== 0 ⇒ 失败。
         *    不能只看 HTTP 状态 —— 后端用状态码表达业务错误(401/403/409…)。 */
        if (!resp.ok || !env || typeof env.code !== 'number' || env.code !== 0) {
          throw toError(resp, env);
        }
        return env.data;
      });
    }, function (netErr) {
      /* fetch 只在**网络层**失败时 reject:代理没起 / 后端不可达 / 断网 */
      var e = new Error('无法连接后端服务');
      e.code = CODE_BACKEND_UNREACHABLE;
      e.unreachable = true;
      e.backendMessage = '无法连接后端服务(请确认 serve.py 与后端 admin-api 都在运行)';
      e.requestId = '';
      e.errors = [];
      throw e;
    });
  }

  /* 带 401 静默刷新重试的请求(§13.11.8 第 7/8/9 条) */
  function request(path, opts) {
    opts = opts || {};
    return rawRequest(path, opts).catch(function (err) {
      if (opts.auth === false) throw err;
      if (!err || err.code !== 40101) throw err;
      /* access 过期 ⇒ 静默换一把;成功就重放原请求。
       * ⛔ 只重试一次(不无限重试);失败由调用方跳登录页。 */
      return refreshAccessToken().then(function (ok) {
        if (!ok) throw err;
        return rawRequest(path, opts);
      });
    });
  }

  /* 静默刷新(单飞:并发 401 只发一次 refresh) */
  var refreshInFlight = null;

  function refreshAccessToken() {
    if (refreshInFlight) return refreshInFlight;
    var rt = getRefreshToken();
    if (!rt) return Promise.resolve(false);
    refreshInFlight = refresh(rt).then(function (data) {
      if (!data || !data.token) return false;
      /* ⚠️ 刷新响应里 refreshToken 恒为 null ⇒ 保存时必须保留旧的那把 */
      saveSession(data, true, true);
      return true;
    }).catch(function () { return false; }).then(function (r) {
      refreshInFlight = null;
      return r;
    });
    return refreshInFlight;
  }

  /* ---------- 端点封装 ---------- */

  /* POST /api/adm/v1/auth/login —— §13.4 / §13.11
   * ⚠️ 请求体**只有三个字段**:{username, password, rememberMe?}
   *    ⛔ **不发**任何医院字段(医院从**账号行**推导,前端不参与)/ duration / expiresIn / ttl。
   *    医院从**账号行**推导:院管 = 该行写死的医院;平台超管 = 哨兵 0(不属于任何医院)。
   * ⚠️ 响应里的 data.scope 决定去哪:hospital ⇒ 工作台;platform ⇒ 选院页。 */
  function login(username, password, rememberMe) {
    var body = { username: username, password: password };
    if (rememberMe) body.rememberMe = true;
    return callMock(
      function () { return mockLogin(username, password, !!rememberMe); },
      function () { return request('/auth/login', { method: 'POST', auth: false, body: body }); }
    ).then(function (data) {
      /* 归一化:老后端的响应里没有 scope ⇒ 用 hospital 是否为空推(等价口径) */
      if (data && !data.scope) data.scope = data.hospital ? 'hospital' : 'platform';
      if (data && data.refreshToken === undefined) data.refreshToken = null;
      return data;
    });
  }

  /* POST /api/adm/v1/auth/refresh —— §13.11.6
   * ⚠️ **不需要** access token;作用域由服务端从账号行推导(前端不参与)。 */
  function refresh(refreshToken) {
    return callMock(
      function () { return mockRefresh(refreshToken); },
      function () {
        return rawRequest('/auth/refresh', { method: 'POST', auth: false, body: { refreshToken: refreshToken } });
      }
    );
  }

  /* POST /api/adm/v1/auth/logout —— §13.11.6
   * ⚠️ **不需要** access token(access 已过期也要能登出);⛔ 幂等。
   * ⚠️ 服务端会删掉该账号的**全部**会话 ⇒ 前端本地两个存储也都要清。 */
  function logout(refreshToken) {
    var rt = refreshToken || getRefreshToken();
    var p = rt
      ? callMock(
          function () { return mockLogout(rt); },
          function () { return rawRequest('/auth/logout', { method: 'POST', auth: false, body: { refreshToken: rt } }); }
        )
      : Promise.resolve(null);
    return p.then(function () { clearSession(); return { ok: true }; }, function (err) {
      /* 登出失败也清本地(反枚举:后端永远 200,失败只可能是网络问题) */
      clearSession();
      return { ok: false, error: err };
    });
  }

  /* GET /api/adm/v1/platform/session —— §13.11.4.2
   * 令牌是不透明串,前端解析不出「我是谁」⇒ 刷新页面后必须问一次。
   * ⚠️ 它只返回**身份**(scope / displayName / 院管的 home),
   *    ⛔ **不返回「当前医院」** —— 当前医院是前端上下文,从 sessionStorage 读回
   *    (契约 x-frontend-routes 的 /dashboard entryGuard)。 */
  function getSessionScope() {
    return callMock(
      function () { return mockSessionScope(); },
      function () { return request('/platform/session', { method: 'GET' }); }
    );
  }

  /* GET /api/adm/v1/platform/hospitals/ —— 公开接口(不需要令牌) */
  function listHospitals() {
    return callMock(
      function () { return mockListHospitals(); },
      function () { return request('/platform/hospitals/', { auth: false }); }
    );
  }

  /* POST /api/adm/v1/platform/hospitals —— 新建医院(**仅平台超管**;院管 ⇒ 40302)
   * ⚠️ 契约语义:本端点**只创建 hospital 行**,不建管理员账号 / 邀请码 / 默认科室
   *    ⇒ 新院建完暂时没人能登录,运营需随后用 mkadmin 建账号。 */
  function createHospital(payload) {
    return callMock(
      function () { return mockCreateHospital(payload); },
      function () { return request('/platform/hospitals', { method: 'POST', body: payload }); }
    );
  }

  /* GET /api/adm/v1/staff —— 需令牌
   * status: '0,1' 已设置 / '2,3' 待分配 / '4' 已归档(§13.4「三个 Tab 的取数口径」) */
  function listStaff(status, page, pageSize) {
    var q = [];
    if (status) q.push('status=' + encodeURIComponent(status));
    if (page) q.push('page=' + page);
    q.push('pageSize=' + (pageSize || 20));
    return callMock(
      function () { return mockListStaff(status, page, pageSize); },
      function () { return request('/staff?' + q.join('&')); }
    );
  }

  /* GET /api/adm/v1/positions —— 需令牌(职位字典全局,不按医院过滤) */
  function listPositions() {
    return callMock(
      function () { return mockListPositions(); },
      function () { return request('/positions'); }
    );
  }

  /* ---------- 展示辅助 ---------- */

  /* 错误 → 一行面向用户的中文(带 §13.3 错误码) */
  function errorText(err) {
    if (!err) return '未知错误';
    var label = CODE_TEXT[err.code] || '';
    var msg = err.backendMessage || err.message || '';
    if (err.unreachable) return '后端未连接 · ' + msg;
    if (label && msg && msg !== label) return label + ' · ' + msg;
    return label || msg || '请求失败';
  }

  /* 表格里的「加载中」行 —— 复用既有 .empty 样式,不新增 CSS */
  function loadingHtml(what) {
    return '<div class="empty"><img src="assets/icons-png/icon-empty-box.png" alt="">'
      + '<div class="e-t">正在加载…</div>'
      + '<div class="e-d">正在向后端请求 ' + esc(what || '') + '</div></div>';
  }

  /* 表格里的「出错」行 —— 把 §13.3 的错误码与文案都显示出来 */
  function errorHtml(err) {
    var extra = err && err.unreachable
      ? '后端 admin-api 没有响应。请先启动后端,再刷新本页。'
      : '接口返回了错误,请按上面的提示处理后重试。';
    var rid = (err && err.requestId)
      ? '<div class="e-d">请求 ID:' + esc(err.requestId) + '</div>' : '';
    return '<div class="empty"><img src="assets/icons-png/icon-warning.png" alt="">'
      + '<div class="e-t">' + esc(errorText(err)) + '</div>'
      + '<div class="e-d">' + esc(extra) + '</div>' + rid + '</div>';
  }

  /* 空数据行 */
  function emptyHtml(title, desc) {
    return '<div class="empty"><img src="assets/icons-png/icon-empty-box.png" alt="">'
      + '<div class="e-t">' + esc(title || '暂无数据') + '</div>'
      + '<div class="e-d">' + esc(desc || '') + '</div></div>';
  }

  /* 把三态包成表格的一行 */
  function stateRow(colspan, html) {
    return '<tr><td colspan="' + colspan + '">' + html + '</td></tr>';
  }

  /* RFC3339 → 'YYYY-MM-DD HH:mm'(契约里的时间一律 RFC3339,展示层再格式化) */
  function fmtTime(iso) {
    if (!iso) return '—';
    return String(iso).slice(0, 10) + ' ' + String(iso).slice(11, 16);
  }

  /* RFC3339 → 'HH:mm' */
  function fmtTimeHM(iso) {
    if (!iso) return '—';
    return String(iso).slice(11, 16);
  }

  /* 停留天数(**派生值**):由 scannedAt 现算,不入库 */
  function daysSince(iso) {
    if (!iso) return 0;
    var t = new Date(iso).getTime();
    if (isNaN(t)) return 0;
    return Math.max(0, Math.floor((Date.now() - t) / 86400000));
  }

  /* 头像占位:取姓名 / 昵称首字(接口不返回 avatarText,前端现算) */
  function avatarText(s) {
    var n = (s && (s.name || s.nickName)) || '?';
    return n.charAt(0);
  }

  /* 头像底色:按名字散列(与原型 back-data.js 的配色口径一致) */
  function avatarColor(name) {
    var cs = ['#2E7DD7', '#43A047', '#8E63CE', '#E66B2E', '#5BBFC5', '#1565C0'];
    var h = 0;
    for (var i = 0; i < name.length; i++) h += name.charAt(i);
    return cs[h % cs.length];
  }

  /* id 容错比较(§13.1:前端不要用 === 比较来自不同来源的 id) */
  function idEq(a, b) {
    return String(a) === String(b);
  }

  /* 演示模式开关:'auto' | true | false
   * ⚠️ **同时改内存 + 落 localStorage**(跨页持久,见文件头注释) */
  function setMock(mode) {
    var v;
    if (mode === true) v = 'true';
    else if (mode === false) v = 'false';
    else v = 'auto';                       /* 其它值一律当 'auto' */
    MOCK_MODE = (v === 'true') ? true : (v === 'false' ? false : 'auto');
    try { window.localStorage.setItem(MOCK_MODE_KEY, v); } catch (_) {}
    return MOCK_MODE;
  }
  /* 「重置为 auto」:演示完切回真后端不用手工清 localStorage */
  function resetMock() { return setMock('auto'); }
  function mockMode() { return MOCK_MODE; }
  /* 当前这一轮实际走的是不是 mock(页面据此显示提示条) */
  function isMockActive() { return mockActive; }

  return {
    API_BASE: API_BASE,
    CODE_BACKEND_UNREACHABLE: CODE_BACKEND_UNREACHABLE,
    CODE_TEXT: CODE_TEXT,
    TOKEN_KEY: TOKEN_KEY,
    SESSION_KEY: SESSION_KEY,
    REFRESH_KEY: REFRESH_KEY,

    esc: esc,
    idEq: idEq,

    getToken: getToken,
    getSession: getSession,
    getRefreshToken: getRefreshToken,
    saveSession: saveSession,
    updateSession: updateSession,
    clearSession: clearSession,
    requireAuth: requireAuth,
    ensureSession: ensureSession,
    getScope: getScope,
    isPlatformAdmin: isPlatformAdmin,
    getCurrentHospitalId: getCurrentHospitalId,
    setCurrentHospitalId: setCurrentHospitalId,

    setMock: setMock,
    resetMock: resetMock,
    mockMode: mockMode,
    isMockActive: isMockActive,

    request: request,
    login: login,
    refresh: refresh,
    logout: logout,
    getSessionScope: getSessionScope,
    listHospitals: listHospitals,
    createHospital: createHospital,
    listStaff: listStaff,
    listPositions: listPositions,

    errorText: errorText,
    loadingHtml: loadingHtml,
    errorHtml: errorHtml,
    emptyHtml: emptyHtml,
    stateRow: stateRow,

    fmtTime: fmtTime,
    fmtTimeHM: fmtTimeHM,
    daysSince: daysSince,
    avatarText: avatarText,
    avatarColor: avatarColor
  };
})();
