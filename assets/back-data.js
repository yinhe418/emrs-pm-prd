/* ==========================================================
 * EMRS 后台 · 演示数据(back-data.js)
 * ⚠️ Q1 阶段假数据,但字段 / 状态 / 关系与真实业务一致
 * ⚠️ 不展示真实人名:医护一律「医生甲 / 护士乙 / 主任丙 / 护师丁」
 *    患者档案实例保留「陈丙英」(已在既有 Demo 中)
 *
 * ⚠️ 2026-10-28 与 AR 的 DB / API 契约对齐(AR 拍板):
 *   ① status 全面数值化(DB TINYINT):
 *      staff.status : 1 在职 / 0 停用(离职) / 2 待认领 / 3 已认领待处理 / 4 已归档
 *      其余实体      : 1 启用 / 0 停用
 *        (hospitals / departments / positions / components / drugs)
 *      例外 —— patient.status 与 patient_project.status 是 DB ENUM,
 *      仍用字符串 'active' / 'closed',**不要**改成数字。
 *   ② 字段名与 DB 列一一对应:
 *      nick_name → nickName / department_id → departmentId / position_id → positionId
 *      scanned_at → scannedAt / claimed_at → claimedAt / archive_reason → archiveReason
 *   ③ staff 表合并了原 pending_staff 表:
 *      「待分配科室」不再是独立队列,而是 staff 表里的行 —— **用 status 表达**:
 *        待分配 = status ∈ {2, 3} / 已设置 = status ∈ {0, 1} / 已归档 = status = 4
 *      ⚠️ 不要用 `departmentId === 0` 反推 Tab —— 停用且从未分科室的人(status=0)
 *         会掉进「待分配」;曾分过科室又归档的人(status=4)会同时出现在两个 Tab。
 *      departmentId = 0 仍然保留为「未分科室」的**数据不变式**(见 isAssigned)。
 *      ⚠️ id 全部是**数字**(AR 契约 §13:DB 主键自增,API 原样透传):
 *         医院 1/2 · 科室 1–5 · 职位 1–9 · 人员 1–16(1–11 已设置 / 12–16 待分配)
 *         药品 1–11 · 组件 1–8 · 教育文章 1–8 · 患者 1–7
 *         「未分配」一律用数字 **0** 表示(对应 DB 的 department_id = 0)。
 *         判未分配请用 `departmentId === 0`,**不要**用 `!departmentId` ——
 *         0 是 falsy,两种写法混用极易静默失配。
 *      ⚠️ id 一律用**容错比较**(`String(a) === String(b)`):URL 参数、localStorage
 *         取出来的都是字符串,与数据里的数字直接 `===` 会全部失配(见 byId)。
 *   ④ 2026-10-28 独立复核补充对齐:
 *      · claimed_by_staff_id → claimedByStaffId(**存 id**,显示时现取名字)
 *      · staff.source('H 市第一医院' 字符串)→ staff.hospitalId(数字)
 *        (合并后每条 staff 都带 hospitalId,hospFilter 才对得上;原来的
 *         `x.hospitalId == null` 会让待分配 Tab 显示别院的人)
 *      · 时间一律 RFC3339:'2026-10-19T20:22:00+08:00'(scannedAt / claimedAt /
 *        claimExpiresAt / archivedAt)
 *      · avatar(来源枚举)→ avatarSource;avatar_url 不入 mock。
 *        avatarText 是**派生展示值**(昵称/姓名首字),不入库
 *      · days(停留天数)是**派生值**,由 scannedAt 现算(不入库);
 *        恢复归档的人天数继续累加 —— scannedAt 不重置
 *      · photos / bio 同样是派生展示值,保留现算,不入库
 *      · diseases 是 JSON **数组**(不是逗号分隔字符串)
 *      · offReason 只在 status = 0 时有意义,其余状态一律空串
 *      · accepting 是 DB ENUM('yes' / 'no'),**不数字化**(与「是否在职」是两回事)
 * ========================================================== */
var BACK_DATA = (function () {

  /* ---- 医院(本轮扩 image + beds + intro,为「先选医院 + 上传图片」准备)---- */
  var hospitals = [
    { id: 1, name: 'H 市第一医院', short: 'H 市一院', area: 'H 市 / 城东区', level: '三级甲等', beds: 1280,
      phone: '0571-8888 0000', intro: 'H 市三级甲等综合医院,神经内科为 H 市重点学科。',
      image: '', status: 1, createdAt: '2026-08-01' },
    { id: 2, name: 'H 市中医医院', short: 'H 市中医院', area: 'H 市 / 城西区', level: '三级乙等', beds: 720,
      phone: '0571-8888 0002', intro: 'H 市三级乙等中医医院,以中西医结合卒中康复为特色。',
      image: '', status: 1, createdAt: '2026-09-15' }
  ];

  /* 当前所选医院(localStorage 记忆,演示用)
   * ⚠️ id 数值化后,localStorage 里存的是字符串(存进去就变字符串),
   *    而且**可能还留着改造前的旧值**('H1')。读出来必须转数字并校验:
   *    转不出合法数字就回落到第一家医院,不能让医院筛选整体失效。 */
  function getCurrentHospitalId() {
    var raw = null;
    try { raw = localStorage.getItem('emrs.currentHospitalId'); } catch (_) { raw = null; }
    var n = (raw === null || raw === '') ? NaN : Number(raw);
    if (!isNaN(n) && hospital(n)) return n;
    /* 旧值('H1')或非法值 → 回落第一家医院 */
    return hospitals[0] ? hospitals[0].id : 1;
  }
  function setCurrentHospitalId(id) {
    try { localStorage.setItem('emrs.currentHospitalId', id); } catch (_) {}
  }
  function clearCurrentHospitalId() { try { localStorage.removeItem('emrs.currentHospitalId'); } catch (_) {} }

  /* ---- 科室(带责任人 = 科室主任)---- */
  var departments = [
    { id: 1, name: '神经内科', hospitalId: 1, directorId: 1, intro: '负责急性卒中绿色通道与出院后连续管理。', status: 1 },
    { id: 2, name: '神经外科', hospitalId: 1, directorId: 8, intro: '', status: 1 },
    { id: 3, name: '急诊科',   hospitalId: 1, directorId: 0,   intro: '卒中绿色通道首诊。', status: 1 },
    { id: 4, name: '康复医学科', hospitalId: 1, directorId: 10, intro: '', status: 1 },
    { id: 5, name: '神经内科', hospitalId: 2, directorId: 0,   intro: '', status: 1 }
  ];

  /* ---- 职位字典:三类(初装 6 个只是种子数据,可增删改)----
   * ⚠️ roles = 「可承担角色位」,与 cat(职位类别)是两个维度,互不替代:
   *    cat  回答「这是什么职位」(行政职务 / 技术职称 / 其他)
   *    roles 回答「担任这个职位的人能否被选为某患者的主管医生 / 护士」
   *    例:科室主任(cat=admin)可承担 doctor;护士长(cat=admin)可承担 nurse;
   *        护士(cat=title)只承担 nurse —— 所以「技术职称」不再等于「医生」。
   */
  var positions = [
    { id: 1, name: '科室主任', cat: 'admin',   roles: ['doctor'], order: 1, status: 1, seeded: true },
    { id: 2, name: '护士长',   cat: 'admin',   roles: ['nurse'],  order: 2, status: 1, seeded: true },
    { id: 3, name: '医师',     cat: 'title',   roles: ['doctor'], order: 3, status: 1, seeded: true },
    { id: 4, name: '主治医师', cat: 'title',   roles: ['doctor'], order: 4, status: 1, seeded: true },
    { id: 5, name: '副主任医师', cat: 'title', roles: ['doctor'], order: 5, status: 1, seeded: true },
    { id: 6, name: '护士',     cat: 'title',   roles: ['nurse'],  order: 6, status: 1, seeded: true },
    { id: 7, name: '护师',     cat: 'title',   roles: ['nurse'],  order: 7, status: 1, seeded: true },
    { id: 8, name: '科研助理', cat: 'other',   roles: [],         order: 8, status: 1, seeded: false },
    { id: 9, name: '进修医师', cat: 'other',   roles: [],         order: 9, status: 1, seeded: false }
  ];
  var POS_CATS = {
    admin: { label: '行政职务', hint: '如科室主任、护士长。一个科室有且只有一个科室主任。' },
    title: { label: '技术职称', hint: '如医师、主治医师、副主任医师、护士、护师。每个工作人员必填。' },
    other: { label: '其他',     hint: '后台自定义,如科研助理、进修医师。' }
  };
  /* 角色位字典:一个职位可同时承担多个角色位,也可一个都不承担 */
  var ROLE_SLOTS = [
    { key: 'doctor', label: '主管医生' },
    { key: 'nurse',  label: '护士' }
  ];

  /* ---- 工作人员(已设置 + 待分配科室 = **同一张表**)----
   * ⚠️ 2026-10-28 对齐 DB:原 pending_staff 表已并入 staff 表。
   *    「待分配科室」不再是独立队列,而是 staff 表里 departmentId = 0 的行。
   *
   * status(DB TINYINT,全站唯一口径):
   *    1 在职 / 0 停用(离职) / 2 待认领 / 3 已认领待处理 / 4 已归档
   *
   * 字段约定:
   *    · 已设置 11 行:name 为正式姓名,nickName 为空串(没有微信昵称)
   *    · 待分配 5 行:name 为空串(DB 的 staff.name 待管理员填写),
   *      展示一律用 nickName('李**' 这类脱敏写法 —— 不写真实人名),
   *      departmentId / positionId = 0(数字)表示「未分配」
   *    · **每一行都带 hospitalId**(含已设置的 11 行)—— 合并后 hospital_id
   *      是 staff 自己的列,不再靠 departmentId 反推;对应 DB 的
   *      UNIQUE(hospital_id, open_id)
   *    · 归一化(见下方 staffNormalize)保证所有行字段集一致,
   *      FE 拿到的 JSON 结构不会因行而异
   */
  var staff = [
    { id: 1,  name: '主任丙', phone: '13800000001', nickName: '', hospitalId: 1, departmentId: 1, positionId: 1, status: 1,
      license: '1104-2011-00321', gradSchool: 'H 市医科大学 · 临床医学', years: '18', firstPractice: '2008-07-01',
      pro: '擅长急性缺血性卒中静脉溶栓与血管内取栓,以及卒中后二级预防方案制定。',
      diseases: ['脑梗死', 'TIA', '颈动脉狭窄', '脑出血'],
      academic: '中国卒中学会会员 · H 市医学会神经学分会青年委员',
      clinicTime: '周一上午 / 周三下午', clinicPlace: '门诊楼 3F · 神经内科 305 诊室',
      intro: '很多患者担心「溶栓会不会出血」,我通常会先把风险讲清楚,再一起决定方案。您有任何疑问,随时在小程序里给我留言。',
      photos: 0, bio: 1, avatarSource: 'wechat', phoneWork: '0571-8888 0101', email: 'a@hmcity-hospital.cn', accepting: 'yes' },
    { id: 2,  name: '医生甲', phone: '13800000002', nickName: '', hospitalId: 1, departmentId: 1, positionId: 4, status: 1,
      license: '1104-2015-00777', gradSchool: 'H 市医科大学 · 临床医学', years: '10', firstPractice: '2015-08-01',
      pro: '擅长急性脑梗死的溶栓、取栓及术后管理,以及卒中后康复期随访。',
      diseases: ['脑梗死', 'TIA', '脑出血', '卒中后康复'],
      academic: '中国卒中学会会员',
      clinicTime: '周一上午 / 周三下午', clinicPlace: '门诊楼 3F · 神经内科 305 诊室',
      intro: '出院后的 90 天是关键期,血压、血糖、服药依从性我会盯着,有问题随时找我。',
      photos: 0, bio: 1, avatarSource: 'wechat', phoneWork: '0571-8888 0102', email: 'b@hmcity-hospital.cn', accepting: 'yes' },
    { id: 3,  name: '医生乙', phone: '13800000003', nickName: '', hospitalId: 1, departmentId: 1, positionId: 5, status: 1,
      license: '1104-2010-00512', gradSchool: 'H 市医科大学 · 临床医学', years: '15', firstPractice: '2010-08-01',
      pro: '擅长脑出血规范化治疗、蛛网膜下腔出血,以及卒中后癫痫管理。',
      diseases: ['脑出血', '蛛网膜下腔出血', '卒中后康复'],
      academic: 'H 市医学会神经学分会委员',
      clinicTime: '周二上午 / 周四全天', clinicPlace: '门诊楼 3F · 神经内科 308 诊室',
      intro: '', photos: 0, bio: 0, avatarSource: 'override',
      phoneWork: '0571-8888 0103', email: 'c@hmcity-hospital.cn', accepting: 'yes' },
    { id: 4,  name: '医生丙', phone: '13800000004', nickName: '', hospitalId: 1, departmentId: 1, positionId: 3, status: 1,
      license: '1104-2021-01188', gradSchool: 'H 省中医药大学 · 中医学', years: '4', firstPractice: '2021-08-01',
      pro: '擅长卒中后康复期的中西医结合治疗。', diseases: ['卒中后康复'],
      academic: '', clinicTime: '周五全天', clinicPlace: '门诊楼 3F · 307 诊室',
      intro: '', photos: 0, bio: 0, avatarSource: 'wechat',
      phoneWork: '0571-8888 0104', email: 'd@hmcity-hospital.cn', accepting: 'no' },
    { id: 5,  name: '护师丁', phone: '13800000005', nickName: '', hospitalId: 1, departmentId: 1, positionId: 7, status: 1,
      license: '', gradSchool: 'H 市医科大学 · 护理学', years: '7', firstPractice: '2018-08-01',
      pro: '', diseases: [], academic: '',
      clinicTime: '周一至周五 8:00-17:00', clinicPlace: '住院部 12F · 神经内科',
      intro: '', photos: 0, bio: 0, avatarSource: 'wechat',
      phoneWork: '0571-8888 0201', email: 'e@hmcity-hospital.cn', accepting: 'yes' },
    { id: 6,  name: '护士乙', phone: '13800000006', nickName: '', hospitalId: 1, departmentId: 1, positionId: 6, status: 1,
      license: '', gradSchool: 'H 市医科大学 · 护理学', years: '9', firstPractice: '2017-08-01',
      pro: '', diseases: [], academic: '',
      clinicTime: '周一至周五 8:00-17:00', clinicPlace: '住院部 12F · 神经内科',
      intro: '', photos: 0, bio: 0, avatarSource: 'wechat',
      phoneWork: '0571-8888 0202', email: 'f@hmcity-hospital.cn', accepting: 'yes',
      wechatBound: false },
    { id: 7,  name: '护士丙', phone: '13800000007', nickName: '', hospitalId: 1, departmentId: 1, positionId: 2, status: 1,
      license: '', gradSchool: 'H 市医科大学 · 护理学', years: '12', firstPractice: '2014-08-01',
      pro: '', diseases: [], academic: '',
      clinicTime: '周一至周五 8:00-17:00', clinicPlace: '住院部 12F · 神经内科',
      intro: '', photos: 0, bio: 0, avatarSource: 'wechat',
      phoneWork: '0571-8888 0203', email: 'g@hmcity-hospital.cn', accepting: 'yes' },
    { id: 8,  name: '医生戊', phone: '13800000008', nickName: '', hospitalId: 1, departmentId: 2, positionId: 4, status: 1,
      license: '1104-2013-00601', gradSchool: 'H 市医科大学 · 临床医学', years: '13', firstPractice: '2013-08-01',
      pro: '擅长脑血管病外科治疗。', diseases: ['脑出血'], academic: '',
      clinicTime: '周三上午', clinicPlace: '门诊楼 3F · 神经外科 312',
      intro: '', photos: 0, bio: 0, avatarSource: 'wechat',
      phoneWork: '0571-8888 0105', email: 'h@hmcity-hospital.cn', accepting: 'yes' },
    { id: 9,  name: '护士戊', phone: '13800000009', nickName: '', hospitalId: 1, departmentId: 3, positionId: 6, status: 1,
      license: '', gradSchool: 'H 市医科大学 · 护理学', years: '6', firstPractice: '2019-08-01',
      pro: '', diseases: [], academic: '', clinicTime: '周一至周五 8:00-17:00', clinicPlace: '急诊楼 1F',
      intro: '', photos: 0, bio: 0, avatarSource: 'wechat',
      phoneWork: '0571-8888 0204', email: 'i@hmcity-hospital.cn', accepting: 'yes' },
    { id: 10, name: '医生己', phone: '13800000010', nickName: '', hospitalId: 1, departmentId: 4, positionId: 5, status: 1,
      license: '1104-2012-00455', gradSchool: 'H 省医学院 · 康复医学', years: '14', firstPractice: '2012-08-01',
      pro: '擅长卒中后康复评定与训练方案制定。', diseases: ['卒中后康复'], academic: '',
      clinicTime: '周一下午 / 周四下午', clinicPlace: '门诊楼 2F · 康复医学科',
      intro: '', photos: 0, bio: 0, avatarSource: 'wechat',
      phoneWork: '0571-8888 0106', email: 'j@hmcity-hospital.cn', accepting: 'yes' },
    { id: 11, name: '医生庚', phone: '13800000011', nickName: '', hospitalId: 1, departmentId: 1, positionId: 3, status: 0,
      license: '', gradSchool: '', years: '', firstPractice: '',
      pro: '', diseases: [], academic: '', clinicTime: '', clinicPlace: '',
      intro: '', photos: 0, bio: 0, avatarSource: 'wechat',
      phoneWork: '', email: '', accepting: 'no', wechatBound: false,
      offReason: '离职(2026-08-31),名下 2 例患者已移交医生甲' },

    /* ↓ 待分配科室(已扫码,未设科室 / 职称)—— 合并进 staff 表后的 5 行 ↓
     * id 为 12–16(与 DB seed 的 staff id 一致;AR 契约 §13 的 "id": 12 样例
     * 就是待分配的人)。前端 URL 形如 ?id=12 —— 查表靠 byId 的容错比较
     * departmentId / positionId = 0 → 对应 DB 的 department_id = 0 / position_id = 0 */
    { id: 12, name: '', nickName: '李**', phone: '', hospitalId: 1, departmentId: 0, positionId: 0, status: 2,
      avatarSource: 'wechat', scannedAt: '2026-10-15T09:12:00+08:00',
      claimedByStaffId: null, claimedAt: '', claimExpiresAt: '' },
    { id: 13, name: '', nickName: '张**', phone: '', hospitalId: 1, departmentId: 0, positionId: 0, status: 2,
      avatarSource: 'wechat', scannedAt: '2026-10-17T14:30:00+08:00',
      claimedByStaffId: null, claimedAt: '', claimExpiresAt: '' },
    { id: 14, name: '', nickName: '王**', phone: '', hospitalId: 1, departmentId: 0, positionId: 0, status: 3,
      avatarSource: 'wechat', scannedAt: '2026-10-19T20:05:00+08:00',
      claimedByStaffId: 1, claimedAt: '2026-10-19T20:22:00+08:00', claimExpiresAt: '2026-10-20T20:22:00+08:00' },
    { id: 15, name: '', nickName: '赵**', phone: '', hospitalId: 1, departmentId: 0, positionId: 0, status: 4,
      avatarSource: 'wechat', scannedAt: '2026-10-11T08:40:00+08:00',
      claimedByStaffId: null, claimedAt: '', claimExpiresAt: '',
      archiveReason: '超时未认领(扫码超过 7 天)', archivedAt: '2026-10-18T08:40:00+08:00', archivedByStaffId: null },
    { id: 16, name: '', nickName: '刘**', phone: '', hospitalId: 1, departmentId: 0, positionId: 0, status: 4,
      avatarSource: 'wechat', scannedAt: '2026-10-10T16:22:00+08:00',
      claimedByStaffId: null, claimedAt: '', claimExpiresAt: '',
      archiveReason: '误扫(非本院人员)', archivedAt: '2026-10-10T16:22:00+08:00', archivedByStaffId: 1 }
  ];

  /* ---- staff 行归一化 ----
   * 合并 pending_staff 之后,所有行必须**字段集一致** —— FE 拿到的 JSON
   * 结构不能因为这行是扫码来的、那行是后台录入的就长得不一样。
   * 缺失字段在这里统一补默认值(而不是在每个页面里写 `s.xxx || ''`)。
   * ⚠️ 派生展示值(avatarText / days / photos / bio)只在这里算一次,不回写 DB 字段。
   */
  function normalizeStaff() {
    staff.forEach(function (s) {
      /* —— DB 列(缺失则补默认值)——
       * ⚠️ id 类字段的默认值语义:
       *    hospitalId  → 第一家医院的 id(**不能**是 0 / '' —— 那样这行
       *                   不属于任何医院,任何 Tab 都筛不出来)
       *    departmentId / positionId → 0(=「未分配」,与 DB 的 0 哨兵一致)
       *    claimedByStaffId / archivedByStaffId → null(契约里就是 null) */
      if (s.nickName === undefined) s.nickName = '';
      if (s.hospitalId === undefined || s.hospitalId === null) s.hospitalId = hospitals[0] ? hospitals[0].id : 1;
      if (s.departmentId === undefined) s.departmentId = 0;
      if (s.positionId === undefined) s.positionId = 0;
      if (s.avatarSource === undefined) s.avatarSource = 'default';
      if (s.scannedAt === undefined) s.scannedAt = '';
      if (s.claimedByStaffId === undefined) s.claimedByStaffId = null;
      if (s.claimedAt === undefined) s.claimedAt = '';
      if (s.claimExpiresAt === undefined) s.claimExpiresAt = '';
      if (s.archiveReason === undefined) s.archiveReason = '';
      if (s.archivedAt === undefined) s.archivedAt = '';
      if (s.archivedByStaffId === undefined) s.archivedByStaffId = null;
      /* offReason 只在 status = 0 时有意义,其余状态一律空串(DB 双向 CHECK) */
      if (s.offReason === undefined) s.offReason = '';
      if (s.status !== 0) s.offReason = '';
      /* 微信绑定:未绑定的人 open_id 为 NULL(不是空串 —— UNIQUE 约束下空串会撞车) */
      if (s.wechatBound === undefined) s.wechatBound = true;
      if (s.openId === undefined) s.openId = s.wechatBound ? ('wx_o_' + String(s.id).toLowerCase()) : null;
      if (s.openIdMasked === undefined) {
        s.openIdMasked = s.openId ? ('wx_o_****_' + String(s.id).toLowerCase()) : '';
      }
      /* 下面这些是「简介 / 名册」列,不是队列字段,统一补空 */
      ['license', 'gradSchool', 'years', 'firstPractice', 'pro', 'academic',
       'clinicTime', 'clinicPlace', 'intro', 'phoneWork', 'email'].forEach(function (k) {
        if (s[k] === undefined) s[k] = '';
      });
      if (s.diseases === undefined) s.diseases = [];
      if (s.photos === undefined) s.photos = 0;
      if (s.bio === undefined) s.bio = 0;
      if (s.accepting === undefined) s.accepting = 'no';
      /* —— 派生展示值(不入库)—— */
      if (!s.avatarText) s.avatarText = (s.nickName || s.name || '?').charAt(0);
    });
  }
  normalizeStaff();

  /* ---- 演示态持久化(localStorage)----
   * ⚠️ 原型是**纯静态**的,mock 数据在页面内存里,一刷新就没了。
   *    「扫码 → 待分配 → 认领 → 转正 → 出现在已设置」这条主流程要能演示,
   *    就必须让状态跨页面跳转存活,所以把 staff 表落到 localStorage
   *    (与 assets/edu-data.js 同一套做法)。
   *    · 没有后端,所以这**只是演示态**,不是真正的持久化
   *    · file:// 协议下部分浏览器禁 localStorage → 读写都包了 try/catch,
   *      自动降级为「不持久」,功能不受影响
   *    · ?reset=1 或 BACK_DATA.resetStaff() 可恢复种子数据
   */
  var STAFF_KEY = 'emrs.mock.staff';
  /* ⚠️ 2026-10-28 id 数值化:持久化格式加了版本号。
   *    浏览器里可能还留着**改造前**的行(id 是 'S1' / departmentId 是 'D1')。
   *    改造后种子 id 是数字 1,持久化行 id 是 'S1' —— map key 不同,
   *    同一个人会变成两条,列表从 16 条变 22 条(静默翻倍,最典型的翻车方式)。
   *    所以:版本对不上就**直接丢弃旧数据**,用种子重来 ——
   *    宁可丢掉演示态,也不能让新旧 id 混在一张表里。
   *    版本号往后加字段时也要 +1。 */
  var STAFF_FORMAT_V = 2;
  function saveStaff() {
    try {
      localStorage.setItem(STAFF_KEY, JSON.stringify({ v: STAFF_FORMAT_V, rows: staff }));
    } catch (_) {}
    return staff;
  }
  function loadStaff() {
    var raw = null;
    try { raw = localStorage.getItem(STAFF_KEY); } catch (_) { raw = null; }
    if (raw === null || raw === '') return false;
    var obj;
    try { obj = JSON.parse(raw); } catch (_) { return false; }
    /* 版本不符 / 旧格式(裸数组)→ 丢弃,回到种子 */
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
    if (obj.v !== STAFF_FORMAT_V) return false;
    var arr = obj.rows;
    if (!Array.isArray(arr) || !arr.length) return false;
    /* 按 id 合并:持久化的行覆盖同 id 的种子行,新增行追加 —— 保持数组对象引用不变 */
    var map = {};
    staff.forEach(function (s) { map[s.id] = s; });
    arr.forEach(function (s) { if (s && s.id != null) map[s.id] = s; });
    var ids = Object.keys(map);
    staff.length = 0;
    ids.forEach(function (k) { staff.push(map[k]); });
    normalizeStaff();
    return true;
  }
  function resetStaff() {
    try { localStorage.removeItem(STAFF_KEY); } catch (_) {}
    return true;
  }
  loadStaff();

  /* ---- 病患 ----
   * ⚠️ 2026-10-26 用户拍板:一个患者可参与**多个项目**,每个项目下的
   *    主管医生 / 主管护士 / 病患协作护士 / 入组时间 / 结管信息**各不相同**。
   *    因此 docId / nurId / enrole / proj 这 4 个字段从患者级**下沉到项目级**。
   *
   * 字段说明
   *   患者级: id / name / sex / age / inNo / status(在管·已结管)
   *            extraNurs[] —— 患者级「病患协作护士」全局名单(DB patient_co_nurse)
   *   项目级(projs[] 一行 = DB patient_project 一行):
   *            projId     —— 项目主档 id;'' = 未指定项目(占位,患者未入组)
   *            docId      —— 该患者**在这个项目下**的主管医生
   *            nurId      —— 该患者**在这个项目下**的主管护士;'' = 待分配
   *            coNurId    —— 该患者**在这个项目下**的病患协作护士;'' = 无
   *            enrole     —— 入组时间
   *            closedAt   —— 结管时间;closeReason —— 结管原因
   *            status     —— 项目级状态:'active' 在管 / 'closed' 已结管
   */
  var patients = [
    { id: 1, name: '陈丙英', sex: 'F', age: 81, inNo: '320***22', extraNurs: [], status: 'active',
      projs: [
        { projId: '90d_health', docId: 2, nurId: 6, coNurId: 0,
          enrole: '2026-09-30', closedAt: '', closeReason: '', status: 'active' },
        { projId: '365d_health', docId: 3, nurId: 7, coNurId: 0,
          enrole: '2026-10-12', closedAt: '', closeReason: '', status: 'active' }
      ],
      base: { src: 'doctor', by: '医生甲', at: '2026-10-20' },
      fields: [
        { name: '收缩压', comp: '90 - 140', now: '100 - 150', unit: 'mmHg' },
        { name: '舒张压', comp: '60 - 90',  now: '60 - 95',   unit: 'mmHg' },
        { name: 'LDL-C', comp: '< 1.8',   now: '< 1.4',    unit: 'mmol/L' }
      ] },
    { id: 2, name: '陈明远', sex: 'M', age: 68, inNo: '320***58', extraNurs: [], status: 'active',
      projs: [
        { projId: '90d_health', docId: 2, nurId: 6, coNurId: 0,
          enrole: '2026-10-06', closedAt: '', closeReason: '', status: 'active' },
        /* 2 个项目:研究项目「颈动脉斑块管理研究」下主管护士尚未指派(该行 nurId 为空) */
        { projId: 'carotid', docId: 3, nurId: 0, coNurId: 0,
          enrole: '2026-10-20', closedAt: '', closeReason: '', status: 'active' }
      ],
      base: { src: 'dept', by: '神经内科 · 科室配置', at: '' },
      fields: [ { name: '收缩压', comp: '90 - 140', now: '—', unit: 'mmHg' } ] },
    { id: 3, name: '李桂芳', sex: 'F', age: 74, inNo: '320***71', extraNurs: [7], status: 'active',
      projs: [
        /* 协作护士两层演示:患者级 extraNurs = [7],本项目下 coNurId 也是 7 */
        { projId: '90d_health', docId: 3, nurId: 5, coNurId: 7,
          enrole: '2026-09-12', closedAt: '', closeReason: '', status: 'active' }
      ],
      base: { src: 'doctor', by: '医生乙', at: '2026-10-12' },
      fields: [ { name: '收缩压', comp: '90 - 140', now: '95 - 145', unit: 'mmHg' } ] },
    { id: 4, name: '王建国', sex: 'M', age: 65, inNo: '320***09', extraNurs: [], status: 'active',
      /* 未入组:projId = '' = 未指定项目(占位),主管医生已由扫码绑定,主管护士待分配 */
      projs: [
        { projId: '', docId: 2, nurId: 0, coNurId: 0,
          enrole: '2026-10-18', closedAt: '', closeReason: '', status: 'active' }
      ],
      base: { src: 'dept', by: '神经内科 · 科室配置', at: '' },
      fields: [] },
    { id: 5, name: '周淑珍', sex: 'F', age: 79, inNo: '320***33', extraNurs: [], status: 'active',
      projs: [
        { projId: '90d_health', docId: 4, nurId: 7, coNurId: 0,
          enrole: '2026-08-25', closedAt: '', closeReason: '', status: 'active' }
      ],
      base: { src: 'dept', by: '神经内科 · 科室配置', at: '' },
      fields: [ { name: '收缩压', comp: '90 - 140', now: '—', unit: 'mmHg' } ] },
    { id: 6, name: '赵国强', sex: 'M', age: 71, inNo: '320***84', extraNurs: [], status: 'closed',
      /* 已结管:项目级 status='closed' + 结管时间 + 结管原因 */
      projs: [
        { projId: '90d_health', docId: 3, nurId: 5, coNurId: 0,
          enrole: '2026-06-14', closedAt: '2026-09-12', closeReason: '疗程完成,指标稳定', status: 'closed' }
      ],
      base: { src: 'doctor', by: '医生乙', at: '2026-06-14', expired: true },
      fields: [ { name: '收缩压', comp: '90 - 140', now: '—', unit: 'mmHg' } ] },
    { id: 7, name: '孙丽华', sex: 'F', age: 66, inNo: '320***47', extraNurs: [], status: 'active',
      /* 未入组:projId = '' = 未指定项目(占位) */
      projs: [
        { projId: '', docId: 8, nurId: 9, coNurId: 0,
          enrole: '2026-10-01', closedAt: '', closeReason: '', status: 'active' }
      ],
      base: { src: 'dept', by: '神经外科 · 科室配置', at: '' },
      fields: [] }
  ];

  /* ---- 任务组件库 ----
   * ⚠️ 临床有效区间 validMin/validMax = field-constraints.md 物理有效区间(硬阻断,只读,系统权威;后台 UI 不展示,仅内部校验)
   * ⚠️ 标准范围 rangeMin/rangeMax = 科室在本组件上配置的标准范围,留空 = 该侧不限
   */
  var components = [
    { id: 1, name: '记录血压', icon: 'icon-bp', departmentId: 1,
      desc: '患者每日早晚各测一次血压,可与个人目标对比。', status: 1, order: 1,
      fields: [
        { id: 1, name: '收缩压', type: 'num', validMin: 50, validMax: 280, rangeMin: 90, rangeMax: 140, unit: 'mmHg', step: 1, req: 'required' },
        { id: 2, name: '舒张压', type: 'num', validMin: 20, validMax: 180, rangeMin: 60, rangeMax: 90,  unit: 'mmHg', step: 1, req: 'required' },
        { id: 3, name: '心率',   type: 'num', validMin: 20, validMax: 250, rangeMin: 60, rangeMax: 100, unit: 'bpm',   step: 1, req: 'optional' },
        { id: 4, name: '测量时间', type: 'datetime', validMin: null, validMax: null, rangeMin: null, rangeMax: null, unit: '', step: 1, req: 'auto' },
        { id: 5, name: '测量体位', type: 'enum', enumVals: ['坐位', '卧位', '立位'], validMin: null, validMax: null, rangeMin: null, rangeMax: null, unit: '', step: 1, req: 'optional' }
      ] },
    { id: 2, name: '记录血糖', icon: 'icon-blood-drop', departmentId: 1,
      desc: '指尖血糖自测,空腹与餐后各测一次。', status: 1, order: 2,
      fields: [
        { id: 11, name: '空腹血糖', type: 'num', validMin: 1.0, validMax: 30.0, rangeMin: 3.9, rangeMax: 6.1, unit: 'mmol/L', step: 0.1, req: 'required' },
        { id: 12, name: '餐后血糖', type: 'num', validMin: 1.0, validMax: 30.0, rangeMin: null, rangeMax: 7.8, unit: 'mmol/L', step: 0.1, req: 'optional' },
        { id: 13, name: '测量时间', type: 'datetime', validMin: null, validMax: null, rangeMin: null, rangeMax: null, unit: '', step: 1, req: 'auto' }
      ] },
    { id: 3, name: '服药反馈', icon: 'icon-pill', departmentId: 1,
      desc: '患者反馈当日服药情况,护士据此跟进。', status: 1, order: 3,
      fields: [
        { id: 21, name: '服药情况', type: 'enum', enumVals: ['正常服用', '减量服用', '未正常服用'], validMin: null, validMax: null, rangeMin: null, rangeMax: null, unit: '', step: 1, req: 'required' },
        { id: 22, name: '备注', type: 'text', validMin: null, validMax: null, rangeMin: null, rangeMax: null, unit: '', step: 1, req: 'optional' },
        { id: 23, name: '填写理由', type: 'text', validMin: null, validMax: null, rangeMin: null, rangeMax: null, unit: '', step: 1, req: 'optional' }
      ] },
    { id: 4, name: '电话回访', icon: 'icon-call', departmentId: 1,
      desc: '护士电话随访记录接通情况与随访结论。', status: 1, order: 4,
      fields: [
        { id: 31, name: '接通状态', type: 'enum', enumVals: ['电话接通', '未接通', '拒接'], validMin: null, validMax: null, rangeMin: null, rangeMax: null, unit: '', step: 1, req: 'required' },
        { id: 32, name: '随访结论', type: 'text', validMin: null, validMax: null, rangeMin: null, rangeMax: null, unit: '', step: 1, req: 'optional' }
      ] },
    { id: 5, name: '上传检查报告', icon: 'icon-camera', departmentId: 1,
      desc: '上传复查报告照片,自动识别数值后由医生核对。', status: 1, order: 5,
      fields: [
        { id: 41, name: '报告照片', type: 'file', validMin: null, validMax: null, rangeMin: null, rangeMax: null, unit: '', step: 1, req: 'required' },
        { id: 42, name: '检查日期', type: 'date', validMin: null, validMax: null, rangeMin: null, rangeMax: null, unit: '', step: 1, req: 'required' }
      ] },
    { id: 6, name: '康复训练打卡', icon: 'icon-run', departmentId: 1,
      desc: '每日康复训练打卡。', status: 1, order: 6,
      fields: [
        { id: 51, name: '训练项目', type: 'enum', enumVals: ['步行训练', '被动运动', '语言训练'], validMin: null, validMax: null, rangeMin: null, rangeMax: null, unit: '', step: 1, req: 'required' },
        { id: 52, name: '训练时长', type: 'num', validMin: 0, validMax: 600, rangeMin: null, rangeMax: null, unit: '分钟', step: 1, req: 'optional', custom: true }
      ] },
    { id: 7, name: '口述病例', icon: 'icon-microscope', departmentId: 1,
      desc: '患者语音描述病情变化,AI 结构化后由医生确认。', status: 1, order: 7, fields: [] },
    { id: 8, name: '建立药品清单', icon: 'icon-drug-package', departmentId: 1,
      desc: '录入出院带药:药名(选自药品库)+ 剂量 + 频次。', status: 1, order: 8,
      fields: [
        /* 药名只能从药品库(BACK_DATA.drugs)选,不可手打;defaultDrugId 为后台预填的默认药 */
        { id: 71, name: '药名', type: 'drug', fromDrugLib: true, defaultDrugId: 0,
          validMin: null, validMax: null, rangeMin: null, rangeMax: null, unit: '', step: 1, req: 'required' },
        /* 剂量:field-constraints.md 未规定口服二级预防药的剂量数值区间,
           故按「文本 + 单位」录入(如「100 mg」),不做数值校验、不编造上下限 */
        { id: 72, name: '剂量', type: 'text', ph: '如 100 mg',
          validMin: null, validMax: null, rangeMin: null, rangeMax: null, unit: '', step: 1, req: 'required' },
        { id: 73, name: '频次', type: 'enum',
          enumVals: ['每日一次', '每日两次', '每晚一次', '必要时'],
          validMin: null, validMax: null, rangeMin: null, rangeMax: null, unit: '', step: 1, req: 'required' }
      ] }
  ];

  /* ---- 药品库(照搬既有 admin-drugs.html 的 11 个)---- */
  var drugs = [
    { id: 1, name: '阿司匹林肠溶片', spec: '100mg', cat: '抗血小板', form: '片剂', generic: 'Aspirin Enteric-coated Tablets',
      usage: '每日 1 次,餐后服用。抗血小板治疗基础用药。', adr: '胃肠道不适、皮疹。', contra: '活动性消化道溃疡、阿司匹林哮喘。', inter: '与布洛芬合用增加消化道出血风险。', status: 1 },
    { id: 2, name: '硫酸氢氯吡格雷', spec: '75mg', cat: '抗血小板', form: '片剂', generic: 'Clopidogrel Bisulfate Tablets',
      usage: '每日 1 次。', adr: '出血倾向、白细胞减少。', contra: '中性粒细胞减少症、活动性出血。', inter: '避免与奥美拉唑长期合用降低疗效。', status: 1 },
    { id: 3, name: '达比加群酯', spec: '110mg / 150mg', cat: '抗凝', form: '胶囊', generic: 'Dabigatran Etexilate Capsules',
      usage: '每日 2 次,固定时间。', adr: '出血、皮肤瘙痒。', contra: '严重肾功能不全、出血性疾病。', inter: '与抗血小板药合用增加出血风险。', status: 1 },
    { id: 4, name: '利伐沙班', spec: '10mg / 15mg / 20mg', cat: '抗凝', form: '片剂', generic: 'Rivaroxaban Tablets',
      usage: '每日 1 次,晚餐时。', adr: '出血、贫血。', contra: '中重度肾功能不全、活动性出血。', inter: '与 CYP3A4 强抑制剂合用需减量。', status: 1 },
    { id: 5, name: '华法林', spec: '2.5mg / 3mg', cat: '抗凝', form: '片剂', generic: 'Warfarin Sodium Tablets',
      usage: '每日固定时间,定期监测 INR。', adr: '出血、皮肤坏死。', contra: '妊娠、哺乳期、活动性出血。', inter: '与多种抗生素、抗真菌药有显著相互作用。', status: 1 },
    { id: 6, name: '阿托伐他汀钙', spec: '10mg / 20mg', cat: '他汀', form: '片剂', generic: 'Atorvastatin Calcium Tablets',
      usage: '每晚 1 次,睡前服用。强化降脂目标 LDL-C < 1.8 mmol/L。', adr: '肌肉酸痛、转氨酶升高。严重者需停药就医。', contra: '活动性肝病、孕妇、哺乳期妇女。', inter: '避免与 CYP3A4 强抑制剂(如克拉霉素、伊曲康唑)合用。', status: 1 },
    { id: 7, name: '瑞舒伐他汀钙', spec: '5mg / 10mg', cat: '他汀', form: '片剂', generic: 'Rosuvastatin Calcium Tablets',
      usage: '每晚 1 次。', adr: '肌肉酸痛、转氨酶升高。', contra: '活动性肝病、妊娠。', inter: '避免与环孢素合用。', status: 1 },
    { id: 8, name: '辛伐他汀', spec: '20mg / 40mg', cat: '他汀', form: '片剂', generic: 'Simvastatin Tablets',
      usage: '每晚 1 次。', adr: '肌肉酸痛、横纹肌溶解。', contra: '活动性肝病、妊娠。', inter: '与大剂量氨苄西林合用增加肌病风险。', status: 1 },
    { id: 9, name: '依折麦布', spec: '10mg', cat: '他汀', form: '片剂', generic: 'Ezetimibe Tablets',
      usage: '每日 1 次。', adr: '腹泻、腹痛。', contra: '活动性肝病。', inter: '与他汀合用可加强降脂。', status: 1 },
    { id: 10, name: '缬沙坦', spec: '80mg', cat: '降压', form: '片剂', generic: 'Valsartan Tablets',
      usage: '每日 1 次,固定时间。降压 + 靶器官保护。', adr: '头晕、低血压、高钾血症。', contra: '妊娠、双侧肾动脉狭窄。', inter: '与保钾利尿剂合用警惕高钾。', status: 1 },
    { id: 11, name: '尼莫地平', spec: '30mg', cat: '降压', form: '片剂', generic: 'Nimodipine Tablets',
      usage: '每 4 小时 1 次,蛛网膜下腔出血后连用 21 天。', adr: '面部潮红、心悸、低血压。', contra: '严重肝功能不全。', inter: '与西地兰非合用影响疗效。', status: 0 }
  ];
  var DRUG_CATS = ['抗血小板', '抗凝', '他汀', '降压'];

  /* ---- 药品字段归一(全站唯一口径)----
   * ⚠️ 后台药品库页面读的是「页面契约」字段名,而 back-data.js 里的药品对象
   *    用的是「数据字段名」,两套名字历史上对不上,列表直接渲染出 undefined。
   *    对照表(页面契约 ← 数据层实际字段):
   *      通用名 gn      ← name
   *      英文名 en      ← generic
   *      常用剂量 dose  ← usage
   *      不良反应 adverse ← adr
   *      相互作用 interact ← inter
   *    药品档案里本来就没有的字段(主要适应症 ind / otc / photoUrl)按「空」处理,
   *    不编造内容 —— 页面上显示为「—」,由人工在编辑页补录。
   */
  var DRUG_FORMS = ['片剂', '胶囊', '注射液', '缓释片', '分散片'];

  function drugView(d) {
    d = d || {};
    return {
      id: d.id || '',
      gn: d.gn || d.name || '',                 /* 中文通用名 */
      en: d.en || d.generic || '',              /* 英文通用名 */
      cat: d.cat || '',
      spec: d.spec || '',
      form: d.form || '',
      /* ⚠️ 不能写 `d.status || 1` —— status = 0(停用)是 falsy,会被误判成 1(启用) */
      status: (d.status === undefined || d.status === null) ? 1 : d.status,
      otc: d.otc || 'rx',                       /* 处方药 Rx(默认) */
      photoUrl: d.photoUrl || '',
      dose: d.dose || d.usage || '',            /* 用法用量 */
      ind: d.ind || '',                        /* 主要适应症(现有档案无来源) */
      adverse: d.adverse || d.adr || '',
      contra: d.contra || '',
      interact: d.interact || d.inter || '',
      hospitalId: (d.hospitalId === undefined || d.hospitalId === null) ? 0 : d.hospitalId
    };
  }

  /* 把页面契约写回药品对象 —— 一律写数据层的字段名,避免两套 key 并存 */
  function drugWrite(d, v) {
    d.name = v.gn;
    d.generic = v.en;
    d.cat = v.cat;
    d.spec = v.spec;
    d.form = v.form;
    d.status = v.status;
    d.otc = v.otc;
    d.photoUrl = v.photoUrl;
    d.usage = v.dose;
    d.ind = v.ind;
    d.adr = v.adverse;
    d.contra = v.contra;
    d.inter = v.interact;
    return d;
  }

  /* 剂型候选 = 规范枚举 ∪ 档案里实际出现过的值 */
  function drugForms() {
    var set = {};
    DRUG_FORMS.forEach(function (f) { set[f] = true; });
    drugs.forEach(function (d) { if (d.form) set[d.form] = true; });
    return Object.keys(set);
  }

  /* ---- 审计日志(占位页用)---- */
  var audits = [
    { t: '2026-10-20 16:42', who: '主任丙', what: '修改组件「记录血压」', detail: '收缩压 标准范围 90-140 → 90-140(未变);心率 标准范围由未设置改为 60-100', tag: '配置变更' },
    { t: '2026-10-20 10:15', who: '主任丙', what: '设置工作人员', detail: '王** → 神经内科 · 护师', tag: '人员' },
    { t: '2026-10-19 20:22', who: '主任丙', what: '认领待设置人员', detail: '认领 王**(停留 2 天)', tag: '人员' },
    { t: '2026-10-18 09:05', who: '主任丙', what: '替换医生头像', detail: '医生乙:微信头像 → 后台上传头像', tag: '配置变更' },
    { t: '2026-10-12 11:30', who: '主任丙', what: '新增职位', detail: '技术职称「护师」', tag: '配置变更' },
    { t: '2026-10-11 08:45', who: '系统', what: '待设置超时归档', detail: '赵**(停留 7 天未认领)→ 已归档', tag: '系统' }
  ];

  /* ---- 查询辅助 ----
   * ⚠️ byId 用**容错比较**:id 数值化后,同一份 id 可能以字符串形式进来
   *    (URL 参数 `?id=12`、localStorage、<select>.value 都是字符串),
   *    直接 `===` 会全部失配。AR 契约 §13 也明确:前端不要用 `===`
   *    比较来自不同来源的 id,统一用 `==` 或 `String(a) === String(b)`。 */
  function idEq(a, b) { return String(a) === String(b); }
  function byId(list, id) {
    if (id === undefined || id === null || id === '') return null;
    for (var i = 0; i < list.length; i++) if (idEq(list[i].id, id)) return list[i];
    return null;
  }
  function dept(id)   { return byId(departments, id); }
  function pos(id)    { return byId(positions, id); }
  function member(id) { return byId(staff, id); }
  function hospital(id) { return byId(hospitals, id); }

  /* ---- 角色位判断(全站唯一口径)----
   * ⚠️ 页面里凡是要判断「此人 / 此职位能否当主管医生 / 护士」,一律调 rolesOf(),
   *    不要各页面各写各的 cat === 'title' 之类判断。
   */
  function posRoles(positionId) {
    var p = pos(positionId);
    return (p && p.roles) ? p.roles.slice() : [];
  }
  /**
   * 统一角色位工具函数。
   * @param who  职位 id / 人员 id / 职位对象 / 人员对象
   * @param role 'doctor'(主管医生) / 'nurse'(护士);不传则返回角色位数组
   * @returns role 为空 → ['doctor'|'nurse'] 数组;role 非空 → boolean
   */
  function rolesOf(who, role) {
    var roles = [];
    if (who == null) return role ? false : roles;
    if (typeof who === 'object') {
      roles = who.roles ? who.roles.slice() : (who.positionId ? posRoles(who.positionId) : []);
    } else {
      /* ⚠️ id 数值化后**职位 id 与人员 id 空间重叠**(职位 1–9、人员 1–16),
       *    以前靠 'P1' / 'S1' 前缀天然区分,现在必须显式定优先级。
       *    裸 id 的实际调用点只有一处(back-patients.html 校验「所选人员能否
       *    当主管医生 / 主管护士」),传的都是**人员 id** → 人员优先。
       *    职位一律传对象进来(rolesOf(positionObject)),不受影响。 */
      var s = member(String(who));
      if (s) {
        roles = posRoles(s.positionId);
      } else {
        var p = pos(String(who));
        roles = p ? posRoles(p.id) : [];
      }
    }
    if (!role) return roles;
    return roles.indexOf(role) >= 0;
  }
  /* 「已分科室」判定 —— 选人下拉必须排除「未分科室」的人。
   * ⚠️ 这里**不能**照抄 `s.departmentId > 0`:虽然 id 已数值化,
   *    但仍统一用「显式排除 0 / 空串 / null」,避免某处把 id 写成字符串时
   *    隐式转换出意外结果(0 是 falsy,`!departmentId` 才是真正的雷)。
   */
  function isAssigned(s) {
    return !!s && s.departmentId !== 0 && s.departmentId !== '' && s.departmentId != null;
  }
  /* 在岗人员中可承担指定角色位的人(病患归属下拉 / 二维码候选 / 科室计数共用)
   * ⚠️ `s.status === 1` 是**严格数字比较**,不能写成 truthy 判断:
   *    · 待分配人员 status = 2 / 3 / 4 → 天然被排除(不会被挂成主管医生 / 护士)
   *    · 停用人员 status = 0 → 也被排除(0 是 falsy,但 truthy 判断会把它放进来)
   *    · 若写成「判断 status 是否为真」,数字 0 与 2/3/4 的语义会整体反转
   * ⚠️ 还要 isAssigned:在职但**还没分科室**的人(status = 1 且 departmentId = 0)
   *    也不该出现在主管医生 / 护士下拉里。
   */
  function staffWithRole(role) {
    return staff.filter(function (s) {
      return s.status === 1 && isAssigned(s) && rolesOf(s, role);
    });
  }

  /* ---- 三个 Tab 的口径(全站唯一,用 **status 正向表达**)----
   * 待分配 = status ∈ {2 待认领, 3 已认领待处理}
   * 已设置 = status ∈ {0 停用, 1 在职}
   * 已归档 = status = 4
   * ⚠️ 不要用 `departmentId === 0` 反推 Tab(2026-10-28 独立复核指出两个反例):
   *    ① 停用(status=0)且从未分科室的人 → 用 departmentId 反推会掉进「待分配」,
   *       变成「待认领的人」;
   *    ② 已归档(status=4)但曾分过科室的人 → 会同时出现在「已设置」和「已归档」,
   *       两个 Tab 各算一次。
   * departmentId = 0 仍作为「未分科室」的**数据不变式**保留(见 isAssigned)。
   */
  function isPendingStaff(s) { return !!s && (s.status === 2 || s.status === 3); }
  function pendingStaff() { return staff.filter(isPendingStaff); }
  /* 已设置 = 在职 / 停用(都已分过科室,由 isAssigned 另行把关) */
  function isSetStaff(s) { return !!s && (s.status === 0 || s.status === 1); }
  /* 已归档 = status 4(无论它此前有没有科室) */
  function isArchived(s) { return !!s && s.status === 4; }

  /* staff.status 枚举(DB TINYINT) */
  var STAFF_STATUS = { ON: 1, OFF: 0, PENDING: 2, CLAIMED: 3, ARCHIVED: 4 };

  /* 演示环境「当前时间」—— 固定值,保证「停留天数」在演示中可复现
   * (如果用真实 now,页面上的天数会随日期漂移,演示与回归都对不上)。
   * 真实环境由服务端下发 / 前端按 scannedAt 现算。 */
  var NOW_ISO = '2026-10-28T10:00:00+08:00';

  /* 演示环境的后台操作人 —— 复用已存在的 staff id = 1(主任丙)。
   * ⚠️ 刻意**不**为「后台管理员」新增一条 staff 行:那会污染
   *    「已设置」Tab 的行数与 staff 总数的对账(验收要求三个 Tab 行数之和 == 总数)。 */
  var ADMIN_STAFF_ID = 1;

  /* 停留天数(**派生值**,不入库):由 scannedAt 现算。
   * 恢复归档的人天数继续累加 —— 因为 scannedAt 不重置。 */
  function daysSince(iso) {
    if (!iso) return 0;
    var t = new Date(iso).getTime();
    if (isNaN(t)) return 0;
    var now = new Date(NOW_ISO).getTime();
    return Math.max(0, Math.floor((now - t) / 86400000));
  }
  /* 认领人 / 归档人:mock 存 id,显示时现取名字 */
  function claimedByName(s) {
    if (!s || !s.claimedByStaffId) return '';
    var m = member(s.claimedByStaffId);
    return m ? m.name : '';
  }
  function archivedByName(s) {
    if (!s || !s.archivedByStaffId) return '';
    var m = member(s.archivedByStaffId);
    return m ? m.name : '';
  }
  function maskPhone(p) {
    if (!p) return '';
    return p.length === 11 ? p.slice(0, 3) + '****' + p.slice(7) : p;
  }
  /* 手机号展示:空号显示「—」(待分配的人绝大多数没手机号) */
  function phoneText(p) {
    return maskPhone(p) || '—';
  }
  function avatarColor(name) {
    var cs = ['#2E7DD7', '#43A047', '#8E63CE', '#E66B2E', '#5BBFC5', '#1565C0'];
    var h = 0; for (var i = 0; i < name.length; i++) h += name.charCodeAt(i);
    return cs[h % cs.length];
  }
  /* 简介完整度:必填 6 项 */
  function bioScore(s) {
    var items = [s.name, s.avatarSource, s.departmentId, s.positionId, s.pro, (s.diseases && s.diseases.length) ? 1 : 0];
    var done = 0; items.forEach(function (i) { if (i) done++; });
    return Math.round(done / items.length * 100);
  }

  /* 按医院过滤科室(容错比较:hospitalId 可能来自 URL / localStorage 的字符串) */
  function deptListByHospital(hid) {
    if (hid === undefined || hid === null || hid === '') return [];
    return departments.filter(function (d) { return idEq(d.hospitalId, hid); });
  }

  /* ---- 患者-项目参与(patient_project)查询辅助 ----
   * ⚠️ 全站唯一口径:凡是要判断「这个患者在这个项目下的主管医生 / 主管护士是谁」,
   *    一律走 projsOf(),不要直接读患者对象上的 docId / nurId(那两个字段已下沉)。
   */
  /* 该患者的全部项目参与记录 */
  function projsOf(p) {
    return (p && p.projs) ? p.projs : [];
  }
  /* 主项目 = 第一条在管记录;若没有在管记录则取第一条;再没有返回 null */
  function mainProj(p) {
    var ps = projsOf(p);
    for (var i = 0; i < ps.length; i++) if (ps[i].status === 'active') return ps[i];
    return ps.length ? ps[0] : null;
  }
  /* 项目名:查不到 / projId 为空 → 「未指定项目」 */
  function projName(pid) {
    if (window.PROJECT_HELPERS && window.PROJECT_HELPERS.projectName) {
      return window.PROJECT_HELPERS.projectName(pid);
    }
    return pid || '未指定项目';
  }
  /* 该患者是否在某个项目下由 staffId 任主管医生
   * ⚠️ 容错比较:docId 是数字,staffId 可能来自 URL / <select>.value(字符串)。
   *    `!staffId` 守卫同时挡住「staffId = 0」,避免 0 命中 coNurId = 0。 */
  function hasProjDoc(p, staffId) {
    if (!staffId) return false;
    return projsOf(p).some(function (r) { return idEq(r.docId, staffId); });
  }
  /* 该患者是否在某个项目下由 staffId 任主管护士 */
  function hasProjNur(p, staffId) {
    if (!staffId) return false;
    return projsOf(p).some(function (r) { return idEq(r.nurId, staffId); });
  }
  /* 该患者是否在某个项目下由 staffId 任病患协作护士 */
  function hasProjCoNur(p, staffId) {
    if (!staffId) return false;
    return projsOf(p).some(function (r) { return idEq(r.coNurId, staffId); });
  }
  /* 「待分配主管护士」判定(本轮口径:该患者**所有**项目参与记录都没有主管护士)
   * ⚠️ 另一口径「存在任一条未分配即算待分配」见 admin-design-spec.md §3.11.7,待用户拍板 */
  function pendingNurse(p) {
    var ps = projsOf(p);
    if (!ps.length) return false;
    return ps.every(function (r) { return !r.nurId; });
  }
  /* 该患者名下由 staffId 担任主管医生 / 主管护士的全部参与记录
   * ⚠️ 必须有 `!staffId` 守卫:参与记录里「无」用 0 表示,
   *    staffId 也为 0 时会误命中 coNurId = 0 的行。 */
  function bindingsOf(p, staffId) {
    if (!staffId) return [];
    return projsOf(p).filter(function (r) {
      return idEq(r.docId, staffId) || idEq(r.nurId, staffId) || idEq(r.coNurId, staffId);
    });
  }

  /* 给药品打医院标签(本轮简单分:医院 1 多 / 医院 2 少);原本的 status 字段保留 */
  (function () {
    drugs.forEach(function (d) { d.hospitalId = 1; });
    if (drugs[9]) drugs[9].hospitalId = 2;  /* 缬沙坦 -> 医院 2 */
    if (drugs[10]) drugs[10].hospitalId = 2; /* 尼莫地平 -> 医院 2 */
  })();

  var api = {
    hospitals: hospitals, departments: departments, positions: positions,
    POS_CATS: POS_CATS, ROLE_SLOTS: ROLE_SLOTS, STAFF_STATUS: STAFF_STATUS,
    staff: staff, patients: patients, components: components,
    drugs: drugs, DRUG_CATS: DRUG_CATS, audits: audits,
    drugView: drugView, drugWrite: drugWrite, drugForms: drugForms, DRUG_FORMS: DRUG_FORMS,
    byId: byId, dept: dept, pos: pos, member: member, hospital: hospital,
    maskPhone: maskPhone, avatarColor: avatarColor, bioScore: bioScore,
    rolesOf: rolesOf, posRoles: posRoles, staffWithRole: staffWithRole,
    /* 「待分配科室」口径 —— 原先的 pending 独立数组已删除,
     * 统一走 staff 表 + departmentId === 0 判定(不再在两个数组之间搬对象) */
    isPendingStaff: isPendingStaff, pendingStaff: pendingStaff, isArchived: isArchived,
    isSetStaff: isSetStaff, isAssigned: isAssigned,
    saveStaff: saveStaff, loadStaff: loadStaff, resetStaff: resetStaff, STAFF_KEY: STAFF_KEY,
    NOW_ISO: NOW_ISO, ADMIN_STAFF_ID: ADMIN_STAFF_ID,
    daysSince: daysSince, claimedByName: claimedByName, archivedByName: archivedByName,
    phoneText: phoneText,
    projsOf: projsOf, mainProj: mainProj, projName: projName,
    hasProjDoc: hasProjDoc, hasProjNur: hasProjNur, hasProjCoNur: hasProjCoNur,
    pendingNurse: pendingNurse, bindingsOf: bindingsOf,
    getCurrentHospitalId: getCurrentHospitalId, setCurrentHospitalId: setCurrentHospitalId,
    clearCurrentHospitalId: clearCurrentHospitalId,
    deptListByHospital: deptListByHospital
  };
  /* 待分配人数(侧边栏角标 / 工作台 KPI)—— 实时算:
   * 转正(变 1)或归档(变 4)之后立刻变,不会停留在模块加载时的快照值。
   * 口径与「待分配」Tab 完全一致:status ∈ {2, 3} */
  Object.defineProperty(api, 'pendingCount', {
    get: function () { return pendingStaff().length; }
  });
  return api;
})();

if (typeof module !== 'undefined') module.exports = BACK_DATA;