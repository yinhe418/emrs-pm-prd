/* 健康教育内容库 —— 后台编辑 ↔ 患者端展示 的共享数据层
 * 使用方:PC 后台「主数据 / 健康教育」(back-edu.html / back-edu-edit.html)
 *        小程序患者端「健康教育」(patient-edu.html / patient-edu-detail.html)
 * 持久化:localStorage 'emrs_eduArticles'(存整个数组的 JSON)
 *   ⚠️ 必须用 emrs_ 下划线前缀 —— assets/layout.js 的「重置演示状态」只清 emrs_* 前缀,
 *      用点号会导致后台改了发布状态后重置不回去,演示状态无法复原。
 * ⚠️ 独立于 assets/back-data.js(那是医院/科室/人员数据集,不要往里塞)
 * ⚠️ 正文只写描述性健康建议,不写临床数值阈值 / 剂量 / 指南结论
 */
var EDU_DATA = (function () {
  'use strict';

  var KEY = 'emrs_eduArticles';
  /* 持久化格式版本号 —— id 数值化后必须 +1,否则读到旧数据('E1' / 'H1')会全盘失配 */
  var FORMAT_V = 2;

  /* ---------- 种子数据(8 条:医院 1 六条 + 医院 2 两条)---------- */
  var SEED = [
    {
      id: 1,
      hospitalId: 1,
      title: '卒中再发警示(Fast)',
      subtitle: '口角歪斜/肢体无力/言语不清',
      icon: 'icon-alert.png',
      cover: '',
      content: '<h3>出现这些表现要立即就医</h3>'
        + '<p>口角歪斜、肢体无力、言语不清是常见的卒中表现,一旦出现请立即拨打 120,不要等待症状自行缓解。</p>'
        + '<p>等待救援期间,请把症状出现的时间记录下来,便于医生到院后评估。</p>'
        + '<figure class="edu-fig"><img src="assets/icons-png/icon-alert.png" alt=""><figcaption>口角歪斜 / 肢体无力 / 言语不清</figcaption></figure>',
      status: 'published',
      order: 1,
      updatedAt: '2026-10-20 09:00',
      publishedAt: '2026-10-20 09:00'
    },
    {
      id: 2,
      hospitalId: 1,
      title: '出院用药须知',
      subtitle: '阿司匹林/他汀/抗凝药',
      icon: 'icon-tab-drugs.png',
      cover: '',
      content: '<h3>按时服药,不要自行停药</h3>'
        + '<p>出院后请按出院医嘱定时、定量服用药物,不要自行增减服用次数或停药。</p>'
        + '<p>服药期间如出现身体不适,请记录下来并及时告知主管医生。</p>'
        + '<figure class="edu-fig"><img src="assets/icons-png/icon-tab-drugs.png" alt=""><figcaption>按医嘱规律服药</figcaption></figure>',
      status: 'published',
      order: 2,
      updatedAt: '2026-10-20 09:10',
      publishedAt: '2026-10-20 09:10'
    },
    {
      id: 3,
      hospitalId: 1,
      title: '血压 / 血脂管理',
      subtitle: '达标标准 · 测量方法',
      icon: 'icon-info.png',
      cover: '',
      content: '<h3>规律监测,记录变化</h3>'
        + '<p>血压、血脂等指标需要定期测量并记录,便于复诊时医生了解整体变化趋势。</p>'
        + '<p>测量请在安静状态下进行,记录测量时间与结果,复诊时带给医生看。</p>'
        + '<figure class="edu-fig"><img src="assets/icons-png/icon-bp.png" alt=""><figcaption>规律测量并记录</figcaption></figure>',
      status: 'published',
      order: 3,
      updatedAt: '2026-10-20 09:20',
      publishedAt: '2026-10-20 09:20'
    },
    {
      id: 4,
      hospitalId: 1,
      title: '戒烟 / 限酒',
      subtitle: '二级预防核心',
      icon: 'icon-no-smoke.png',
      cover: '',
      content: '<h3>戒烟限酒,二级预防的重要一环</h3>'
        + '<p>戒烟有助于降低再次卒中的风险,建议在家人和医生的支持下逐步完成。</p>'
        + '<p>饮酒尽量避免,同时保持规律作息与清淡饮食。</p>'
        + '<figure class="edu-fig"><img src="assets/icons-png/icon-no-smoke.png" alt=""><figcaption>戒烟与限酒</figcaption></figure>',
      status: 'published',
      order: 4,
      updatedAt: '2026-10-20 09:30',
      publishedAt: '2026-10-20 09:30'
    },
    {
      id: 5,
      hospitalId: 1,
      title: '饮食指导',
      subtitle: '低盐低脂 · 营养均衡',
      icon: 'icon-utensils.png',
      cover: '',
      content: '<h3>清淡饮食,营养均衡</h3>'
        + '<p>日常饮食以清淡为主,注意荤素搭配、营养均衡,避免过于油腻。</p>'
        + '<p>如有吞咽困难或进食不适,请及时告知医生和护士,按指导安排进食。</p>'
        + '<figure class="edu-fig"><img src="assets/icons-png/icon-utensils.png" alt=""><figcaption>清淡饮食 · 营养均衡</figcaption></figure>',
      status: 'published',
      order: 5,
      updatedAt: '2026-10-20 09:40',
      publishedAt: '2026-10-20 09:40'
    },
    {
      id: 6,
      hospitalId: 1,
      title: '康复训练',
      subtitle: '被动运动 · 步行训练',
      icon: 'icon-transfer.png',
      cover: '',
      content: '<h3>循序渐进,适度活动</h3>'
        + '<p>在康复治疗师指导下进行适度活动与功能训练,循序渐进,不追求速度和强度。</p>'
        + '<p>训练中出现头晕、乏力等不适,请立即停止并告知医护人员。</p>'
        + '<figure class="edu-fig"><img src="assets/icons-png/icon-transfer.png" alt=""><figcaption>被动运动 · 步行训练</figcaption></figure>',
      status: 'unpublished',
      order: 6,
      updatedAt: '2026-10-21 10:00',
      publishedAt: ''
    },
    {
      id: 7,
      hospitalId: 2,
      title: '卒中后随访要点',
      subtitle: '定期复诊 · 指标监测',
      icon: 'icon-book.png',
      cover: '',
      content: '<h3>定期复诊,带齐记录</h3>'
        + '<p>按出院医嘱安排的时间定期复诊,复诊时携带用药记录与日常监测记录。</p>'
        + '<p>复诊时如出现新的不适,请主动告知医生。</p>'
        + '<figure class="edu-fig"><img src="assets/icons-png/icon-book.png" alt=""><figcaption>定期复诊 · 指标监测</figcaption></figure>',
      status: 'published',
      order: 1,
      updatedAt: '2026-10-20 09:00',
      publishedAt: '2026-10-20 09:00'
    },
    {
      id: 8,
      hospitalId: 2,
      title: '家属照护提示',
      subtitle: '陪伴 · 提醒 · 记录',
      icon: 'icon-family.png',
      cover: '',
      content: '<h3>陪伴与提醒</h3>'
        + '<p>家属可协助记录服药、监测和日常活动情况,并在复诊时提供给医生。</p>'
        + '<p>发现患者出现异常表现时,及时联系医生或拨打 120。</p>'
        + '<figure class="edu-fig"><img src="assets/icons-png/icon-family.png" alt=""><figcaption>陪伴 · 提醒 · 记录</figcaption></figure>',
      status: 'unpublished',
      order: 2,
      updatedAt: '2026-10-21 10:00',
      publishedAt: ''
    }
  ];

  /* 可选封面图标白名单(不在表内的图标回落到 icon-document.png) */
  var ICONS = [
    'icon-alert.png', 'icon-tab-drugs.png', 'icon-info.png', 'icon-no-smoke.png',
    'icon-utensils.png', 'icon-transfer.png', 'icon-book.png', 'icon-family.png',
    'icon-bp.png', 'icon-run.png', 'icon-document.png'
  ];

  /* ---------- 工具 ---------- */
  function clone(o) {
    try { return JSON.parse(JSON.stringify(o)); }
    catch (e) { return o; }
  }

  function now() {
    var d = new Date();
    function p(n) { return n < 10 ? '0' + n : '' + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
      + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function read() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { raw = null; }
    /* 没存过 → 用种子。存过但解析不了 → 也退回种子(数据损坏自愈) */
    if (raw === null || raw === '') return clone(SEED);
    try {
      var obj = JSON.parse(raw);
      /* ⚠️ 2026-10-28 id 数值化:加了版本号。
       *    浏览器里可能还留着**改造前**的数据(id 是 'E1'、hospitalId 是 'H1')。
       *    改造后 filterHosp 拿数字 hospitalId 去比 'H1' 会**全部过滤空**,
       *    教育文章列表直接消失。所以版本对不上就丢弃旧数据、回到种子 ——
       *    健康教育本来就是演示态数据,「数据损坏自愈」是本文件既有约定。 */
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return clone(SEED);
      if (obj.v !== FORMAT_V) return clone(SEED);
      var arr = obj.rows;
      if (!Array.isArray(arr)) return clone(SEED);
      /* 存的是空数组 → 就是「一篇都没了」,必须尊重,不能偷偷还原种子 */
      return arr;
    } catch (e) {
      return clone(SEED);
    }
  }

  function write(arr) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ v: FORMAT_V, rows: arr }));
    } catch (e) { /* 隐私模式忽略 */ }
    return arr;
  }

  /* 按 order 升序(order 相同则按 id 兜底,保证顺序稳定) */
  function byOrder(arr) {
    return arr.slice().sort(function (a, b) {
      var x = Number(a.order) || 0, y = Number(b.order) || 0;
      if (x === y) {
        /* ⚠️ id 已是数字:不能再用 localeCompare —— '10' 会排在 '2' 前面 */
        var ia = Number(a.id) || 0, ib = Number(b.id) || 0;
        if (ia !== ib) return ia - ib;
        return String(a.id).localeCompare(String(b.id));
      }
      return x - y;
    });
  }

  /* 按医院过滤(容错比较:hospitalId 可能来自 URL / localStorage 的字符串) */
  function filterHosp(arr, hospitalId) {
    if (!hospitalId) return arr;
    return arr.filter(function (a) { return String(a.hospitalId) === String(hospitalId); });
  }

  /* 新 id = 现存最大数字 id + 1 */
  function nextId(arr) {
    var max = 0;
    arr.forEach(function (a) {
      var n = Number(a.id);
      if (!isNaN(n) && n > max) max = n;
    });
    return max + 1;
  }

  /* ---------- 对外 API ---------- */

  /* 全部文章(按 order 升序);hospitalId 为空表示不过滤 */
  function list(hospitalId) {
    return clone(byOrder(filterHosp(read(), hospitalId)));
  }

  /* 已发布文章(按 order 升序) */
  function published(hospitalId) {
    return list(hospitalId).filter(function (a) { return a.status === 'published'; });
  }

  /* 单篇
   * ⚠️ 容错比较:id 是数字,URL 参数 / <select>.value 传进来的是字符串,
   *    直接 `===` 会查不到(教育文章详情页直接空白)。 */
  function byId(id) {
    if (id === undefined || id === null || id === '') return null;
    var arr = read();
    for (var i = 0; i < arr.length; i++) {
      if (String(arr[i].id) === String(id)) return clone(arr[i]);
    }
    return null;
  }

  /* 新增 / 更新;id 为空时自动生成;返回保存后的对象 */
  function upsert(article) {
    var arr = read();
    var a = clone(article || {});
    var idx = -1, i;
    if (a.id) {
      for (i = 0; i < arr.length; i++) { if (String(arr[i].id) === String(a.id)) { idx = i; break; } }
    }

    if (idx >= 0) {
      /* ⚠️ id 统一成数字:编辑页传进来的是 URL 参数(字符串 '3'),
       *    不转成数字会让同一篇文章出现「3」和 3 两条 */
      a.id = Number(arr[idx].id);
      if (!a.publishedAt) a.publishedAt = arr[idx].publishedAt || '';
      if (a.status !== 'published') a.status = 'unpublished';
      if (typeof a.order !== 'number' || !a.order) a.order = arr[idx].order;
      a.updatedAt = now();
      if (a.status === 'published' && !a.publishedAt) a.publishedAt = a.updatedAt;
      arr[idx] = a;
    } else {
      if (!a.id) a.id = nextId(arr);
      else a.id = Number(a.id);   /* id 统一成数字 */
      if (a.status !== 'published') a.status = 'unpublished';
      a.updatedAt = now();
      if (a.status === 'published' && !a.publishedAt) a.publishedAt = a.updatedAt;
      if (!a.publishedAt) a.publishedAt = '';
      if (typeof a.order !== 'number' || !a.order) {
        var maxOrder = 0;
        for (i = 0; i < arr.length; i++) {
          if (Number(arr[i].order) > maxOrder) maxOrder = Number(arr[i].order);
        }
        a.order = maxOrder + 1;
      }
      arr.push(a);
    }

    write(arr);
    return clone(a);
  }

  /* 删除 */
  function remove(id) {
    var arr = read();
    var out = [], removed = false;
    for (var i = 0; i < arr.length; i++) {
      if (String(arr[i].id) === String(id)) { removed = true; continue; }
      out.push(arr[i]);
    }
    if (removed) write(out);
    return removed;
  }

  /* 发布 / 停止发布切换;返回切换后的状态字符串 */
  function togglePublish(id) {
    var arr = read();
    for (var i = 0; i < arr.length; i++) {
      if (String(arr[i].id) !== String(id)) continue;
      if (arr[i].status === 'published') {
        arr[i].status = 'unpublished';
      } else {
        arr[i].status = 'published';
        arr[i].publishedAt = now();
      }
      arr[i].updatedAt = now();
      write(arr);
      return arr[i].status;
    }
    return '';
  }

  /* 排序:dir=-1 上移 / dir=+1 下移(同医院内与相邻项交换 order)
     已经是最前 / 最后时不动数据,返回 false */
  function move(id, dir) {
    var arr = read();
    var target = null, i;
    for (i = 0; i < arr.length; i++) { if (String(arr[i].id) === String(id)) { target = arr[i]; break; } }
    if (!target) return false;

    var sibs = byOrder(filterHosp(arr, target.hospitalId));
    var at = -1;
    for (i = 0; i < sibs.length; i++) { if (String(sibs[i].id) === String(id)) { at = i; break; } }
    if (at < 0) return false;

    var to = at + (Number(dir) < 0 ? -1 : 1);
    if (to < 0 || to >= sibs.length) return false;

    var oa = sibs[at].order, ob = sibs[to].order;
    for (i = 0; i < arr.length; i++) {
      if (String(arr[i].id) === String(sibs[at].id)) arr[i].order = ob;
      else if (String(arr[i].id) === String(sibs[to].id)) arr[i].order = oa;
    }
    write(arr);
    return true;
  }

  /* 清掉 localStorage,恢复 SEED 的深拷贝 */
  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    return clone(SEED);
  }

  return {
    list: list,
    published: published,
    byId: byId,
    upsert: upsert,
    remove: remove,
    togglePublish: togglePublish,
    move: move,
    reset: reset,
    SEED: SEED,
    ICONS: ICONS
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = EDU_DATA;
