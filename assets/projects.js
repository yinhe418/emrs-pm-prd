/* ==========================================================
 * EMRS · 项目 mock 数据(hub 模式)
 * patient-home / patient-project-detail 共用
 * 数据由 admin-projects 维护(占位),此处 mock
 * ========================================================== */
(function () {
  'use strict';

  // 项目库 — 与 admin-projects.html / admin-project-edit.html 字段对应
  var PROJECTS = [
    {
      id: '90d_health',
      name: '90 天卒中连续健康管理',
      duration: '90 天',
      price: 100,
      priceLabel: '¥ 100',
      tag: '管理',
      icon: 'assets/icons-png/icon-tab-projects.png',
      summary: '出院后 90 天随访管理',
      description:
        '出院后 90 天随访计划:每日血压记录、用药反馈、3 次主动电话回访 (D7 / D30 / D90)、个体目标核对与必要的报告上传。'
        + '异常时工作时段 (8:00 - 17:00) 沟通,夜间留言工作日首次回应,紧急情况立即 120,本软件不作治疗决策。'
    },
    {
      id: 'carotid',
      name: '颈动脉斑块管理研究',
      duration: '365 天',
      price: 200,
      priceLabel: '¥ 200',
      tag: '研究',
      icon: 'assets/icons-png/icon-microscope.png',
      summary: '12 月 LDL-C 跟踪 · 需研究者确认',
      description:
        '针对颈动脉斑块患者的长期跟踪研究:每 3 月 1 次血脂全套 (D90 / D180 / D365),'
        + '配合颈动脉超声随访。加入前需研究者确认资格,资料严格脱敏使用,仅供研究分析,不向第三方营销。'
    },
    {
      id: '365d_health',
      name: '365 天长周期管理',
      duration: '365 天',
      price: 0,
      priceLabel: '¥ 待定',
      tag: '管理',
      icon: 'assets/icons-png/icon-calendar.png',
      summary: '1 年长周期 · 高复发风险患者',
      description:
        '长周期 1 年管理方案,适合多次发作或高复发风险的患者。包含血压、血脂、生活方式全程随访。'
        + '价格由医院 / 科室在使用前确定,本期仅占位。'
    }
  ];

  /**
   * 根据 id 找项目;找不到返回 null
   */
  function getProject(id) {
    if (!id) return null;
    for (var i = 0; i < PROJECTS.length; i++) {
      if (PROJECTS[i].id === id) return PROJECTS[i];
    }
    return null;
  }

  /**
   * 读取当前已签约项目 id 数组;不存在返回 []
   */
  function getSubscribed() {
    try {
      var raw = localStorage.getItem('emrs_subscribed_projects');
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  /**
   * 判断某项目是否已签约
   */
  function isSubscribed(id) {
    return getSubscribed().indexOf(id) !== -1;
  }

  /**
   * 把 id 加入已签约(去重);返回最新数组
   */
  function subscribe(id) {
    var arr = getSubscribed();
    if (arr.indexOf(id) === -1) arr.push(id);
    try { localStorage.setItem('emrs_subscribed_projects', JSON.stringify(arr)); } catch (e) {}
    return arr;
  }

  // 暴露
  window.PROJECTS = PROJECTS;
  window.PROJECT_HELPERS = {
    getProject: getProject,
    getSubscribed: getSubscribed,
    isSubscribed: isSubscribed,
    subscribe: subscribe
  };
})();