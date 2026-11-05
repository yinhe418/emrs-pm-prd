/* ==========================================================
 * EMRS 后台 PC · 项目模块 mock 数据层(back-project-data.js)
 * --------------------------------------------------------------
 * 配套页面:back-projects.html · back-project-edit.html · back-project-detail.html
 * 产品设计:docs/prd/prd-project-module/prd.md(v2.0 · 执行层重新设计)
 *
 * ⚠️ 本文件只服务**后台 PC 侧**项目模块,不与移动端那一代混:
 *    · 项目主档(主题/周期/定价/起止日/主负责医生)**复用** assets/projects.js
 *      的 window.PROJECTS(同一份项目主档,不复制一份改数值);
 *    · 但移动端那份**没有**「归属科室」和「项目任务」(基线 project 表也无
 *      department_id、项目↔组件更是无配置行),所以本文件给 PC 侧补两个字段。
 *    ⛔ 不改 window.PROJECTS —— 那是患者端/医生端页面在用的,别混。
 *
 * ⚠️ 两个字段对应两处**结构缺口**(需求单见 docs/prd/prd-project-module/gap-for-ar.md):
 *    G1 · 归属科室 departmentId      —— 基线 project 表缺这列
 *    G2 · 项目任务 tasks[]           —— 基线完全没有这张配置行
 *
 * ⚠️ 2026-11-05 执行层重新设计(v2.0),本文件随之改了三处:
 *    ① 概念:不再有旧的中间实体(模板,已作废 2026-11-05),项目**直接绑组件** ⇒ tasks[]
 *    ② 时间:两档 —— every(每 N 天,重复) / dayn(第 N 天,单次);
 *       **D0 = 患者入组日**;⛔ 没有以出院为基准的档位
 *    ③ 角色:由「多选位掩码」改为 **executor(执行人) + tracker(下一步跟踪人)** 两个单选
 *
 * ⚠️ 角色值只是 **mock 的角色位**,不是具体人:
 *    doctor = 该患者在本项目下的主管医生 · nurse = 主责护士 · patient = 患者本人
 *    生成任务时才解析成具体人(生成层本期不做,只在本文件注释里说明)。
 * ========================================================== */
(function () {
  'use strict';

  var KEY = 'emrs.mock.projects';
  /* v3(2026-11-05 执行层重新设计):
   *   tasks[].sched = { type: 'every' | 'dayn', days: N }  (旧 'pre' / 'daily' 一并作废)
   *   tasks[] 增加 executor / tracker(角色位 key),去掉 target 位掩码
   * v4(2026-11-05 晚):
   *   角色约束上线(执行人必填 / 跟踪人仅医护 / 两角色不得相同);
   *   v3 的 localStorage 里可能存着「nurse → nurse」这类旧组合 ⇒ 直接丢弃重新播种。 */
  var FORMAT_V = 4;

  /* ---- 角色位(单选,不是掩码)----
   * 🔴 2026-11-05 晚用户拍板(STATE §五 39③):
   *    ① 执行人**必填**;
   *    ② 跟踪人**只能是医生 / 护士**(⛔ 不能是患者);
   *    ③ **执行人角色 ≠ 跟踪人角色**(performer_role <> tracker_role)。
   * ⇒ 两个字段的可选集合不同,不能共用一个 ROLES。 */
  var EXECUTOR_ROLES = [
    { key: 'doctor',  label: '主管医生' },
    { key: 'nurse',   label: '主责护士' },
    { key: 'patient', label: '患者' }
  ];
  var TRACKER_ROLES = [
    { key: 'doctor',  label: '主管医生' },
    { key: 'nurse',   label: '主责护士' }
  ];
  /* 兼容旧引用(roleLabel / pairLabel 用);不含「无」 */
  var ROLES = EXECUTOR_ROLES;

  /* ---- 组件级 mock 的来源 ----
   * ⚠️ 组件走 BACK_DATA.components(任务组件库,已上线模块),本文件不复制组件。
   *    8 个种子组件**全部归属神经内科(departmentId = 1)**,
   *    ⇒ 神经外科的项目在「从任务组件库添加」抽屉里会看到空态(该科室还没配组件),
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

  /* ---- 归属科室 + 项目任务 覆盖层 ----
   * sched.type: 'every' 每 N 天(重复;days = 间隔 N,默认 1;N = 1 显示「每天」)
   *             'dayn'  第 N 天(单次;days = N,0 = 入组当天 D0)
   * executor / tracker: 角色位 key(doctor / nurse / patient);tracker 为 '' = 无跟踪人
   *     ⇒ 无跟踪人时,执行人完成后任务直接结束,不产生跟踪环节、不发跟踪通知。
   * ⚠️ `'需人工判读'` 只是条目标记,不是自动判读结论:
   *    上传检查报告类任务系统无法判断正常/异常,只把这个标记交给跟踪人。
   *    临床阈值与判定规则归 clinical-expert(docs/clinical/follow-up-rules.md),本文件不写。
   */
  var OVERLAY = {
    '90d_health': {
      departmentId: 1,
      tasks: [
        { id: 't1',  componentId: 7, sched: { type: 'dayn',  days: 0  }, executor: 'doctor',  tracker: '',        status: 1 },
        { id: 't2',  componentId: 8, sched: { type: 'dayn',  days: 0  }, executor: 'doctor',  tracker: '',        status: 1 },
        { id: 't3',  componentId: 5, sched: { type: 'dayn',  days: 0  }, executor: 'patient', tracker: 'doctor',  status: 1, manualReview: true },
        { id: 't4',  componentId: 3, sched: { type: 'dayn',  days: 0  }, executor: 'patient', tracker: '',        status: 1 },
        { id: 't5',  componentId: 4, sched: { type: 'dayn',  days: 7  }, executor: 'nurse',   tracker: 'doctor',  status: 1 },
        { id: 't6',  componentId: 5, sched: { type: 'dayn',  days: 30 }, executor: 'patient', tracker: 'doctor',  status: 1, manualReview: true },
        { id: 't7',  componentId: 4, sched: { type: 'dayn',  days: 30 }, executor: 'nurse',   tracker: 'doctor',  status: 1 },
        { id: 't8',  componentId: 1, sched: { type: 'every', days: 1  }, executor: 'patient', tracker: 'nurse',   status: 1 },
        { id: 't9',  componentId: 2, sched: { type: 'every', days: 1  }, executor: 'patient', tracker: '',        status: 1 },
        /* ⚠️ 2026-11-05 修正:原 nurse → nurse 同角色组合违反「执行人 ≠ 跟踪人角色」,改为 nurse → doctor */
        { id: 't10', componentId: 6, sched: { type: 'dayn',  days: 90 }, executor: 'nurse',   tracker: 'doctor',  status: 1 }
      ]
    },
    'carotid': {
      departmentId: 1,
      tasks: [
        { id: 'c1', componentId: 1, sched: { type: 'every', days: 1   }, executor: 'patient', tracker: 'nurse',  status: 1 },
        { id: 'c2', componentId: 5, sched: { type: 'dayn',  days: 90  }, executor: 'patient', tracker: 'doctor', status: 1, manualReview: true },
        { id: 'c3', componentId: 4, sched: { type: 'dayn',  days: 180 }, executor: 'nurse',   tracker: 'doctor', status: 1 },
        { id: 'c4', componentId: 4, sched: { type: 'dayn',  days: 365 }, executor: 'nurse',   tracker: 'doctor', status: 1 }
      ]
    },
    '365d_health': {
      departmentId: 1,
      tasks: [
        { id: 'h1', componentId: 1, sched: { type: 'every', days: 1 }, executor: 'patient', tracker: 'nurse', status: 1 },
        { id: 'h2', componentId: 3, sched: { type: 'every', days: 1 }, executor: 'patient', tracker: 'nurse', status: 1 }
      ]
    }
  };

  /* ---- PC 侧独有的三条(演示「另一个科室」/「已停用」/「长期项目」三种状态)----
   * ⚠️ 这几条**只存在于后台 PC 侧**,不进 window.PROJECTS(移动端不显示)。 */
  var EXTRA = [
    {
      /* 长期 = 没有结束时间 + 不会自动到期 / 不自动停用 + 单次档不再受周期上限约束。
       * ⚠️ `longTerm: true` + `durationDays: 0` + `endDate: ''` **只是 mock 写法**,
       *    **不是存储口径** —— 存储由 AR 定。页面一律按 `longTerm` 标记判定,不假设「0 = 长期」。 */
      id: 'lt_evergreen', hospitalId: 1, departmentId: 1,
      name: '长期随访 · 卒中二级预防', tag: '管理',
      durationDays: 0, longTerm: true, price: 0,
      startDate: '2026-11-01', endDate: '',
      leadDoctorId: 2, status: 1,
      icon: 'assets/icons-png/icon-tab-projects.png',
      summary: '长期项目 · 没有结束时间,只能手动结束',
      /* 「第 365 天」在长期项目里**不被周期卡住**(普通项目会被拦) */
      tasks: [
        { id: 'lt1', componentId: 1, sched: { type: 'dayn',  days: 365 }, executor: 'doctor',  tracker: '',      status: 1 },
        /* ⚠️ 仅用于演示「每 N 天」N > 1 的展示口径,不代表任何临床建议。
         *    临床合理性(医护侧 / 患者侧间隔)待 clinical-expert 确认。 */
        { id: 'lt2', componentId: 1, sched: { type: 'every', days: 3   }, executor: 'patient', tracker: 'nurse', status: 1 }
      ]
    },
    {
      id: 'nsurg_30d', hospitalId: 1, departmentId: 2,
      name: '神经外科 · 术后 30 天随访', tag: '管理',
      durationDays: 30, price: 0,
      startDate: '2026-10-01', endDate: '2026-10-31',
      leadDoctorId: 8, status: 1,
      icon: 'assets/icons-png/icon-tab-projects.png',
      summary: '神经外科自建 · 尚未配置任务',
      tasks: []
    },
    {
      id: 'old_60d', hospitalId: 1, departmentId: 1,
      name: '旧版 60 天随访', tag: '管理',
      durationDays: 60, price: 0,
      startDate: '2026-01-01', endDate: '2026-03-01',
      leadDoctorId: 2, status: 0,
      icon: 'assets/icons-png/icon-tab-projects.png',
      summary: '已停用 · 已被 90 天方案取代',
      tasks: []
    }
  ];

  /* ---- 组装种子 ---- */
  function norm(list) {
    return (list || []).map(function (t, i) {
      return {
        id: t.id,
        componentId: t.componentId,
        sched: t.sched,
        executor: t.executor || '',
        tracker: t.tracker || '',
        manualReview: !!t.manualReview,
        status: t.status,
        order: i + 1
      };
    });
  }
  function seed() {
    var list = baseProjects();
    list.forEach(function (p) {
      var ov = OVERLAY[p.id] || {};
      p.departmentId = ov.departmentId != null ? ov.departmentId : 1;
      p.tasks = norm(ov.tasks);
    });
    return list.concat(EXTRA.map(function (p) {
      p.tasks = norm(p.tasks);
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
    /* 结构版本不匹配(v1/v2 的旧两层模型,已作废 2026-11-05)⇒ 直接丢弃,回落到种子 */
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
  function tasksOf(pid) {
    var p = byId(pid);
    if (!p) return [];
    return (p.tasks || []).slice().sort(function (a, b) {
      if (a.order !== b.order) return a.order - b.order;
      return 0;
    });
  }
  function nextId(prefix) {
    var max = 0;
    projects.forEach(function (p) {
      (p.tasks || []).forEach(function (t) {
        var m = String(t.id).replace(/^[a-z]+_?/, '');
        var n = parseInt(m, 10);
        if (!isNaN(n) && n > max) max = n;
      });
    });
    return prefix + (max + 1);
  }

  /* ---- 写 ---- */
  function addProject(p) {
    p.tasks = p.tasks || [];
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

  /* ---- 展示派生 ---- */
  /* 何时做 → 文案 */
  function schedLabel(s) {
    if (!s) return '—';
    if (s.type === 'every') {
      var n = (s.days == null) ? 1 : Number(s.days);
      return n > 1 ? ('每 ' + n + ' 天') : '每天';
    }
    if (s.type === 'dayn') return '第 ' + Number(s.days || 0) + ' 天';
    return '—';
  }
  /* 时间轴分组顺序:每 N 天 → 第 N 天 */
  function schedOrder(s) {
    if (!s) return 9999;
    if (s.type === 'every') return 0;
    if (s.type === 'dayn')  return 1;
    return 9999;
  }
  /* 角色位 key → 文案 */
  function roleLabel(key) {
    if (!key) return '';
    for (var i = 0; i < ROLES.length; i++) if (ROLES[i].key === key) return ROLES[i].label;
    return '—';
  }
  /* 执行人角色与跟踪人角色是否相同(同角色 = 违反 D30) */
  function roleConflict(t) {
    return !!(t && t.executor && t.tracker && t.executor === t.tracker);
  }

  /* 执行人 → 跟踪人 一行文案 */
  function pairLabel(t) {
    var ex = roleLabel(t.executor) || '未指定执行人';
    return t.tracker ? (ex + ' → ' + roleLabel(t.tracker)) : (ex + ' → 无(执行完成即结束)');
  }
  /* 角色使用统计 */
  function roleUsage(pid, field) {
    var used = {};
    tasksOf(pid).forEach(function (t) {
      var k = t[field];
      if (k) used[k] = (used[k] || 0) + 1;
    });
    return used;
  }

  window.BACK_PROJ = {
    projects: projects,
    ROLES: ROLES,
    EXECUTOR_ROLES: EXECUTOR_ROLES,
    TRACKER_ROLES: TRACKER_ROLES,
    roleConflict: roleConflict,
    byId: byId,
    ofHospital: ofHospital,
    tasksOf: tasksOf,
    nextId: nextId,
    addProject: addProject,
    updateProject: updateProject,
    save: save,
    reset: reset,
    schedLabel: schedLabel,
    schedOrder: schedOrder,
    roleLabel: roleLabel,
    pairLabel: pairLabel,
    roleUsage: roleUsage
  };
})();
