/* ==========================================================
 * EMRS 后台 · 后端 API 客户端(BackApi)
 * ----------------------------------------------------------
 * 契约来源:docs/architecture/backend-architecture.md
 *   §13.1 通用约定(基址 / 认证 / 分页 / id 类型)
 *   §13.2 统一响应包络 {code, message, data, requestId, serverTime, errors?}
 *   §13.3 错误码规范
 *
 * ⚠️ 为什么路径写**相对路径** '/api/adm/v1/...':
 *    后端**没有 CORS 中间件**,跨源直连会被浏览器拦。
 *    所以前端一律走同源相对路径,由 C 仓的 serve.py 反向代理到后端
 *    (serve.py 会原样保留 Authorization 头)。
 *    ⚠️ **不要**在这里写死 http://127.0.0.1:8080。
 *
 * ⚠️ 前缀为什么是 `/api/adm/v1` 而不是 /api/v1:
 *    后端网关把对外路径分成两个入口 —— 后台 /api/adm/v1/…、小程序 /api/mini/v1/…,
 *    网关剥掉 /api/adm(或 /api/mini)后再转发给后端,后端内部仍是 /api/v1/…。
 *    所以**浏览器直接看到的**公开路径必须带 /adm 段;少写会绕开网关的入口分流。
 *    (旧 /api/v1/… 是过渡别名,暂时还能通,但不要依赖它。)
 *
 * ⚠️ 令牌存 **sessionStorage**,不存 localStorage:
 *    令牌是短期凭据,关掉标签页就该失效;localStorage 会被同域其它页面读到。
 *    (原型里 localStorage 只用来存「演示态」,两者语义不同,别混用。)
 *
 * ⚠️ id 一律用**容错比较**(String(a) === String(b)):
 *    URL 参数 / sessionStorage 取出来的是字符串,与接口返回的数字直接 === 会静默失配。
 * ========================================================== */
var BackApi = (function () {
  'use strict';

  /* API 基址(相对路径 —— 靠 serve.py 的反代,见文件头注释)
   * ⚠️ 带 /adm 段是网关的**后台入口**;serve.py 直跑时会把这个前缀剥回 /api 再转发。 */
  var API_BASE = '/api/adm/v1';

  /* sessionStorage 键名 */
  var TOKEN_KEY = 'emrs.admin.token';
  var SESSION_KEY = 'emrs.admin.session';

  /* ⚠️ 50200 = **serve.py 自己造的**码,不是后端业务码。
   *    用来区分「后端返回的业务错误」与「后端根本没连上」。
   *    后端业务码见 §13.3,区间是 400xx / 401xx / … / 50301,不会撞 50200。 */
  var CODE_BACKEND_UNREACHABLE = 50200;

  /* ---- §13.3 错误码 → 面向用户的中文标签 ---- */
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

  function store() {
    try { return window.sessionStorage; } catch (_) { return null; }
  }

  /* ---------- 会话(令牌 + 登录用户信息) ---------- */

  function getToken() {
    var s = store();
    if (!s) return '';
    try { return s.getItem(TOKEN_KEY) || ''; } catch (_) { return ''; }
  }

  /* 返回 {token, expiresAt, displayName, hospital:{id,name,shortName,level}} 或 null */
  function getSession() {
    var s = store();
    if (!s) return null;
    try {
      var raw = s.getItem(SESSION_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      return (obj && obj.token) ? obj : null;
    } catch (_) { return null; }
  }

  /* 存登录结果(data = 后端 loginResponse:{token, expiresIn, hospital, displayName}) */
  function saveSession(data) {
    if (!data || !data.token) return null;
    var s = store();
    var session = {
      token: data.token,
      expiresAt: Date.now() + (Number(data.expiresIn) || 28800) * 1000,
      displayName: data.displayName || '',
      hospital: data.hospital || null
    };
    if (s) {
      try {
        s.setItem(TOKEN_KEY, data.token);
        s.setItem(SESSION_KEY, JSON.stringify(session));
      } catch (_) { /* 隐私模式等场景下写不进去,不影响本次会话 */ }
    }
    return session;
  }

  function clearSession() {
    var s = store();
    if (!s) return;
    try {
      s.removeItem(TOKEN_KEY);
      s.removeItem(SESSION_KEY);
    } catch (_) {}
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

  /* 核心:发一个请求,成功 resolve data,失败 reject 一个规范化的 Error。
   *
   * opts:
   *   method  'GET' | 'POST' | ...
   *   body    对象 → 自动 JSON.stringify 并带 Content-Type
   *   auth    默认 true → 自动带 Authorization: Bearer <token>
   */
  function request(path, opts) {
    opts = opts || {};
    var url = (path.charAt(0) === '/') ? path : (API_BASE + '/' + path);
    var headers = {};
    var body = null;

    if (opts.body !== undefined && opts.body !== null) {
      headers['Content-Type'] = 'application/json; charset=utf-8';
      body = JSON.stringify(opts.body);
    }
    if (opts.auth !== false) {
      var token = getToken();
      if (token) headers['Authorization'] = 'Bearer ' + token;
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

  /* ---------- 端点封装 ---------- */

  /* POST /api/adm/v1/auth/login —— §13.4
   * ⚠️ hospitalCode 契约上是必填,但后端实现里是**可选**(不带就跨院按登录名找,
   *    必须唯一命中);原型表单只有「账号 + 密码」,所以不传。 */
  function login(username, password) {
    return request('/api/adm/v1/auth/login', {
      method: 'POST',
      auth: false,
      body: { username: username, password: password }
    });
  }

  /* GET /api/adm/v1/platform/hospitals/ —— 公开接口(不需要令牌) */
  function listHospitals() {
    return request('/api/adm/v1/platform/hospitals/', { auth: false });
  }

  /* GET /api/adm/v1/staff —— 需令牌
   * status: '0,1' 已设置 / '2,3' 待分配 / '4' 已归档(§13.4「三个 Tab 的取数口径」) */
  function listStaff(status, page, pageSize) {
    var q = [];
    if (status) q.push('status=' + encodeURIComponent(status));
    if (page) q.push('page=' + page);
    q.push('pageSize=' + (pageSize || 20));
    return request('/api/adm/v1/staff?' + q.join('&'));
  }

  /* GET /api/adm/v1/positions —— 需令牌(职位字典全局,不按医院过滤) */
  function listPositions() {
    return request('/api/adm/v1/positions');
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
    for (var i = 0; i < name.length; i++) h += name.charCodeAt(i);
    return cs[h % cs.length];
  }

  /* id 容错比较(§13.1:前端不要用 === 比较来自不同来源的 id) */
  function idEq(a, b) {
    return String(a) === String(b);
  }

  return {
    API_BASE: API_BASE,
    CODE_BACKEND_UNREACHABLE: CODE_BACKEND_UNREACHABLE,
    CODE_TEXT: CODE_TEXT,

    esc: esc,
    idEq: idEq,

    getToken: getToken,
    getSession: getSession,
    saveSession: saveSession,
    clearSession: clearSession,
    requireAuth: requireAuth,

    request: request,
    login: login,
    listHospitals: listHospitals,
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
