/* ==========================================================
 * EMRS 后台 PC · 项目模块 mock 数据层(back-project-data.js)
 * --------------------------------------------------------------
 * 配套页面:back-projects.html · back-project-edit.html · back-project-detail.html
 * 产品设计:docs/prd/prd-project-module/prd.md
 *
 * ⚠️ 本文件只服务**后台 PC 侧**项目模块,不与移动端那一代混:
 *    · 项目主档(主题/周期/定价/起止日/主负责医生)**复用** assets/projects.js
 *      的 window.PROJECTS(同一份项目主档,不复制一份改数值);
 *    · 但移动端那份**没有**「归属科室」和「任务模板」(基线 project 表也无
 *      department_id、项目↔任务模板更是无表),所以本文件给 PC 侧补两个字段。
 *    ⛔ 不改 window.PROJECTS —— 那是患者端/医生端页面在用的,别混。
 *
 * ⚠️ 两个字段对应两处**结构缺口**(需求单见 docs/prd/prd-project-module/gap-for-ar.md):
 *    G1 · 归属科室 departmentId      —— 基线 project 表缺这列
 *    G2 · 项目级任务模板 templates[] —— 基线完全没有这张表
 *
 * ⚠️ 目标人角色位用**位掩码**,位序与基线 task_instance.scope_mask 一致:
 *    1 = 主管医生 · 2 = 护士 · 4 = 患者 · 0 非法(至少一位)
 *    (gap-for-ar.md G4)
 * ========================================================== */
(function () {
  'use strict';

  var KEY = 'emrs.mock.projects';
  var FORMAT_V = 1;

  /* ---- 目标人角色位(位掩码)---- */
  var TARGETS = [
    { bit: 1, key: 'doctor',  label: '主管医生' },
    { bit: 2, key: 'nurse',   label: '护士' },
    { bit: 4, key: 'patient', label: '患者' }
  ];

  /* ---- 组件级 mock 的来源 ----
   * ⚠️ 组件走 BACK_DATA.components(任务组件库,已上线模块),本文件不复制组件。
   *    8 个种子组件**全部归属神经内科(departmentId = 1)**,
   *    ⇒ 神经外科的项目在「从任务库添加组件」抽屉里会看到空态(该科室还没配组件),
   *    这是**真实存在的状态**,不是数据缺失。 */
  function baseProjects() {
    var src = window.PROJECTS || [];
    return src.map(function (p) {
      return {
        id: p.id,
        hospitalId: p.hospitalId,
        name: p.name,
        tag: p.tag || '管理',
        durationDays: p.durationDays,
        price: p.price,
        startDate: p.startDate,
        endDate: p.endDate,
        leadDoctorId: p.leadDoctorId,
        status: p.status,
        icon: p.icon || 'assets/icons-png/icon-tab-projects.png',
        summary: p.summary || ''
      };
    });
  }

  /* ---- 归属科室 + 任务模板 覆盖层 ----
   * sched.type: 'daily' 每天 · 'pre' 出院前(days = 出院前第 N 天,默认 0)
   *             'dayn' D N 天(days = N)
   * target:    位掩码(1 主管医生 / 2 护士 / 4 患者)
   */
  var OVERLAY = {
    '90d_health': {
      departmentId: 1,
      templates: [
        { id: 't1',  componentId: 7, sched: { type: 'pre',  days: 0 }, target: 1,          status: 1 },
        { id: 't2',  componentId: 8, sched: { type: 'pre',  days: 0 }, target: 1,          status: 1 },
        { id: 't3',  componentId: 5, sched: { type: 'pre',  days: 0 }, target: 1 | 4,      status: 1 },
        { id: 't4',  componentId: 3, sched: { type: 'pre',  days: 0 }, target: 4,          status: 1 },
        { id: 't5',  componentId: 4, sched: { type: 'dayn', days: 7  }, target: 2,          status: 1 },
        { id: 't6',  componentId: 5, sched: { type: 'dayn', days: 30 }, target: 4 | 1,      status: 1 },
        { id: 't7',  componentId: 4, sched: { type: 'dayn', days: 30 }, target: 2,          status: 1 },
        { id: 't8',  componentId: 1, sched: { type: 'daily', days: 0 }, target: 4,          status: 1 },
        { id: 't9',  componentId: 2, sched: { type: 'daily', days: 0 }, target: 4,          status: 1 },
        { id: 't10', componentId: 6, sched: { type: 'dayn', days: 90 }, target: 2 | 4,      status: 1 }
      ]
    },
    'carotid': {
      departmentId: 1,
      templates: [
        { id: 'c1', componentId: 1, sched: { type: 'daily', days: 0 }, target: 4,     status: 1 },
        { id: 'c2', componentId: 5, sched: { type: 'dayn', days: 90 },  target: 4 | 1, status: 1 },
        { id: 'c3', componentId: 4, sched: { type: 'dayn', days: 180 }, target: 2,     status: 1 },
        { id: 'c4', componentId: 4, sched: { type: 'dayn', days: 365 }, target: 2,     status: 1 }
      ]
    },
    '365d_health': {
      departmentId: 1,
      templates: [
        { id: 'h1', componentId: 1, sched: { type: 'daily', days: 0 }, target: 4,       status: 1 },
        { id: 'h2', componentId: 3, sched: { type: 'daily', days: 0 }, target: 2 | 4,   status: 1 }
      ]
    }
  };

  /* ---- PC 侧独有的三条(演示「另一个科室」/「已停用」/「长期项目」三种状态)----
   * ⚠️ 这几条**只存在于后台 PC 侧**,不进 window.PROJECTS(移动端不显示)。 */
  var EXTRA = [
    {
      /* ⚠️ 2026-11-05 用户提:「项目周期 是不是可以增加一个长期 …就没有结束时间,只能手动结束」
       * 产品语义:长期 = 没有结束时间 + 不会自动到期 / 不自动停用 + 模板天数不再受周期上限约束。
       * ⚠️ `longTerm: true` + `durationDays: 0` + `endDate: ''` **只是 mock 写法**,
       *    **不是存储口径** —— 「长期」在 DB / API 怎么存(0 / NULL / 加列)由 AR 定。
       *    页面一律按 `longTerm` 标记判定,不假设「0 = 长期」。 */
      id: 'lt_evergreen', hospitalId: 1, departmentId: 1,
      name: '长期随访 · 卒中二级预防', tag: '管理',
      durationDays: 0, longTerm: true, price: 0,
      startDate: '2026-11-01', endDate: '',
      leadDoctorId: 2, status: 1,
      icon: 'assets/icons-png/icon-tab-projects.png',
      summary: '长期项目 · 没有结束时间,只能手动结束',
      /* 「出院后第 365 天」在长期项目里**不被周期卡住**(普通项目会被拦) */
      templates: [
        { id: 'lt1', componentId: 1, sched: { type: 'dayn', days: 365 }, target: 1, status: 1 }
      ]
    },
    {
      id: 'nsurg_30d', hospitalId: 1, departmentId: 2,
      name: '神经外科 · 术后 30 天随访', tag: '管理',
      durationDays: 30, price: 0,
      startDate: '2026-10-01', endDate: '2026-10-31',
      leadDoctorId: 8, status: 1,
      icon: 'assets/icons-png/icon-tab-projects.png',
      summary: '神经外科自建 · 尚未配置任务模板',
      templates: []
    },
    {
      id: 'old_60d', hospitalId: 1, departmentId: 1,
      name: '旧版 60 天随访', tag: '管理',
      durationDays: 60, price: 0,
      startDate: '2026-01-01', endDate: '2026-03-01',
      leadDoctorId: 2, status: 0,
      icon: 'assets/icons-png/icon-tab-projects.png',
      summary: '已停用 · 已被 90 天方案取代',
      templates: []
    }
  ];

  /* ---- 组装种子 ---- */
  function seed() {
    var list = baseProjects();
    list.forEach(function (p) {
      var ov = OVERLAY[p.id] || {};
      p.departmentId = ov.departmentId != null ? ov.departmentId : 1;
      p.templates = (ov.templates || []).map(function (t, i) {
        return { id: t.id, componentId: t.componentId, sched: t.sched, target: t.target,
                 status: t.status, order: i + 1 };
      });
    });
    return list.concat(EXTRA.map(function (p) {
      p.templates = (p.templates || []).map(function (t, i) {
        return { id: t.id, componentId: t.componentId, sched: t.sched, target: t.target,
                 status: t.status, order: i + 1 };
      });
      return p;
    }));
  }

  var projects = seed();

  /* ---- 演示态持久化(同 back-data.js 的 staff 做法)----
   * 为什么项目要持久化:「新建项目 → 保存 → 回列表」是本模块的主演示动线,
   * 不持久化的话一跳回去就没了,演示链断掉。 */
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ v: FORMAT_V, rows: projects }));
    } catch (_) {}
    return projects;
  }
  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (_) { raw = null; }
    if (!raw) return false;
    var obj;
    try { obj = JSON.parse(raw); } catch (e) { return false; }
    if (!obj || obj.v !== FORMAT_V || !Array.isArray(obj.rows) || !obj.rows.length) return false;
    var map = {};
    projects.forEach(function (p) { map[p.id] = p; });
    obj.rows.forEach(function (p) {
      if (!p || p.id == null) return;
      map[p.id] = p;
    });
    var ids = Object.keys(map);
    projects.length = 0;
    ids.forEach(function (k) { projects.push(map[k]); });
    return true;
  }
  function reset() {
    try { localStorage.removeItem(KEY); } catch (_) {}
    projects.length = 0;
    seed().forEach(function (p) { projects.push(p); });
    return projects;
  }
  load();

  /* ---- 查询 ---- */
  function byId(id) {
    if (!id) return null;
    for (var i = 0; i < projects.length; i++) {
      if (String(projects[i].id) === String(id)) return projects[i];
    }
    return null;
  }
  function ofHospital(hid) {
    return projects.filter(function (p) { return String(p.hospitalId) === String(hid); });
  }
  function templatesOf(pid) {
    var p = byId(pid);
    if (!p) return [];
    return (p.templates || []).slice().sort(function (a, b) { return a.order - b.order; });
  }
  function nextId(prefix) {
    var max = 0;
    projects.forEach(function (p) {
      (p.templates || []).forEach(function (t) {
        var m = String(t.id).replace(/^[a-z]+_?/, '');
        var n = parseInt(m, 10);
        if (!isNaN(n) && n > max) max = n;
      });
    });
    return prefix + (max + 1);
  }

  /* ---- 写 ---- */
  function addProject(p) {
    p.templates = p.templates || [];
    projects.push(p);
    save();
    return p;
  }
  function updateProject(id, patch) {
    var p = byId(id);
    if (!p) return null;
    Object.keys(patch).forEach(function (k) { p[k] = patch[k]; });
    save();
    return p;
  }
  function addTemplate(pid, tpl) {
    var p = byId(pid);
    if (!p) return null;
    p.templates = p.templates || [];
    tpl.order = p.templates.length + 1;
    p.templates.push(tpl);
    save();
    return tpl;
  }
  function updateTemplate(pid, tid, patch) {
    var p = byId(pid);
    if (!p) return null;
    var t = (p.templates || []).filter(function (x) { return String(x.id) === String(tid); })[0];
    if (!t) return null;
    Object.keys(patch).forEach(function (k) { t[k] = patch[k]; });
    save();
    return t;
  }
  function removeTemplate(pid, tid) {
    var p = byId(pid);
    if (!p) return;
    p.templates = (p.templates || []).filter(function (x) { return String(x.id) !== String(tid); });
    (p.templates || []).forEach(function (t, i) { t.order = i + 1; });
    save();
  }
  function moveTemplate(pid, tid, dir) {
    var p = byId(pid);
    if (!p) return;
    var list = (p.templates || []).slice().sort(function (a, b) { return a.order - b.order; });
    var idx = -1;
    list.forEach(function (t, i) { if (String(t.id) === String(tid)) idx = i; });
    if (idx < 0) return;
    var to = idx + dir;
    if (to < 0 || to >= list.length) return;
    var tmp = list[idx]; list[idx] = list[to]; list[to] = tmp;
    list.forEach(function (t, i) { t.order = i + 1; });
    p.templates = list;
    save();
  }

  /* ---- 展示派生 ---- */
  /* 日期维度 → 阶段文案 */
  function schedLabel(s) {
    if (!s) return '—';
    if (s.type === 'daily') return '每天';
    if (s.type === 'pre')   return s.days > 0 ? ('出院前 ' + s.days + ' 天') : '出院前';
    /* ⚠️ 2026-11-05 措辞明确化(用户:「第N天,一般指出院的第N天」):
     *   「D N 天」里的 D 有歧义(入院日?出院日?)⇒ 统一写成「出院后第 N 天」。 */
    if (s.type === 'dayn')  return '出院后第 ' + s.days + ' 天';
    return '—';
  }
  /* 日期维度 → 排序键(出院前 → 每天 → 出院后第 N 天) */
  function schedOrder(s) {
    if (!s) return 9999;
    if (s.type === 'pre')   return 0;
    if (s.type === 'daily') return 1;
    if (s.type === 'dayn')  return 2;
    return 9999;
  }
  /* 目标人位掩码 → 文案 */
  function targetLabel(mask) {
    var names = TARGETS.filter(function (t) { return mask & t.bit; })
                      .map(function (t) { return t.label; });
    return names.length ? names.join(' + ') : '未指定';
  }
  function targetBits(mask) {
    return TARGETS.filter(function (t) { return mask & t.bit; });
  }

  window.BACK_PROJ = {
    projects: projects,
    TARGETS: TARGETS,
    byId: byId,
    ofHospital: ofHospital,
    templatesOf: templatesOf,
    nextId: nextId,
    addProject: addProject,
    updateProject: updateProject,
    addTemplate: addTemplate,
    updateTemplate: updateTemplate,
    removeTemplate: removeTemplate,
    moveTemplate: moveTemplate,
    save: save,
    reset: reset,
    schedLabel: schedLabel,
    schedOrder: schedOrder,
    targetLabel: targetLabel,
    targetBits: targetBits
  };
})();
