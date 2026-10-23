/* ==========================================================
 * EMRS 后台 · 演示数据(back-data.js)
 * ⚠️ Q1 阶段假数据,但字段 / 状态 / 关系与真实业务一致
 * ⚠️ 不展示真实人名:医护一律「医生甲 / 护士乙 / 主任丙 / 护师丁」
 *    患者档案实例保留「陈丙英」(已在既有 Demo 中)
 * ========================================================== */
var BACK_DATA = (function () {

  /* ---- 医院(本轮扩 image + beds + intro,为「先选医院 + 上传图片」准备)---- */
  var hospitals = [
    { id: 'H1', name: 'H 市第一医院', short: 'H 市一院', area: 'H 市 / 城东区', level: '三级甲等', beds: 1280,
      phone: '0571-8888 0000', intro: 'H 市三级甲等综合医院,神经内科为 H 市重点学科。',
      image: '', status: 'on', createdAt: '2026-08-01' },
    { id: 'H2', name: 'H 市中医医院', short: 'H 市中医院', area: 'H 市 / 城西区', level: '三级乙等', beds: 720,
      phone: '0571-8888 0002', intro: 'H 市三级乙等中医医院,以中西医结合卒中康复为特色。',
      image: '', status: 'on', createdAt: '2026-09-15' }
  ];

  /* 当前所选医院(localStorage 记忆,演示用) */
  function getCurrentHospitalId() {
    try { return localStorage.getItem('emrs.currentHospitalId') || 'H1'; } catch (_) { return 'H1'; }
  }
  function setCurrentHospitalId(id) {
    try { localStorage.setItem('emrs.currentHospitalId', id); } catch (_) {}
  }
  function clearCurrentHospitalId() { try { localStorage.removeItem('emrs.currentHospitalId'); } catch (_) {} }

  /* ---- 科室(带责任人 = 科室主任)---- */
  var departments = [
    { id: 'D1', name: '神经内科', type: '卒中中心', hospitalId: 'H1', directorId: 'S1', parent: '', intro: '负责急性卒中绿色通道与出院后连续管理。', status: 'on' },
    { id: 'D2', name: '神经外科', type: '神经外科', hospitalId: 'H1', directorId: 'S8', parent: '', intro: '', status: 'on' },
    { id: 'D3', name: '急诊科',   type: '急诊科',   hospitalId: 'H1', directorId: '',   parent: '', intro: '卒中绿色通道首诊。', status: 'on' },
    { id: 'D4', name: '康复医学科', type: '康复科', hospitalId: 'H1', directorId: 'S10', parent: '', intro: '', status: 'on' },
    { id: 'D5', name: '神经内科', type: '神经内科', hospitalId: 'H2', directorId: '',   parent: '', intro: '', status: 'on' }
  ];

  /* ---- 职位字典:三类(初装 6 个只是种子数据,可增删改)---- */
  var positions = [
    { id: 'P1', name: '科室主任', cat: 'admin',   order: 1, status: 'on', seeded: true },
    { id: 'P2', name: '护士长',   cat: 'admin',   order: 2, status: 'on', seeded: true },
    { id: 'P3', name: '医师',     cat: 'title',   order: 3, status: 'on', seeded: true },
    { id: 'P4', name: '主治医师', cat: 'title',   order: 4, status: 'on', seeded: true },
    { id: 'P5', name: '副主任医师', cat: 'title', order: 5, status: 'on', seeded: true },
    { id: 'P6', name: '护士',     cat: 'title',   order: 6, status: 'on', seeded: true },
    { id: 'P7', name: '护师',     cat: 'title',   order: 7, status: 'on', seeded: true },
    { id: 'P8', name: '科研助理', cat: 'other',   order: 8, status: 'on', seeded: false },
    { id: 'P9', name: '进修医师', cat: 'other',   order: 9, status: 'on', seeded: false }
  ];
  var POS_CATS = {
    admin: { label: '行政职务', hint: '如科室主任、护士长。一个科室有且只有一个科室主任。' },
    title: { label: '技术职称', hint: '如医师、主治医师、副主任医师、护士、护师。每个工作人员必填。' },
    other: { label: '其他',     hint: '后台自定义,如科研助理、进修医师。' }
  };

  /* ---- 工作人员 ---- */
  var staff = [
    { id: 'S1',  name: '主任丙', phone: '13800000001', deptId: 'D1', posId: 'P1', status: 'on',
      license: '1104-2011-00321', gradSchool: 'H 市医科大学 · 临床医学', years: '18', firstPractice: '2008-07-01',
      pro: '擅长急性缺血性卒中静脉溶栓与血管内取栓,以及卒中后二级预防方案制定。',
      diseases: ['脑梗死', 'TIA', '颈动脉狭窄', '脑出血'],
      academic: '中国卒中学会会员 · H 市医学会神经学分会青年委员',
      clinicTime: '周一上午 / 周三下午', clinicPlace: '门诊楼 3F · 神经内科 305 诊室',
      intro: '很多患者担心「溶栓会不会出血」,我通常会先把风险讲清楚,再一起决定方案。您有任何疑问,随时在小程序里给我留言。',
      photos: 0, bio: 1, avatar: 'wechat', phoneWork: '0571-8888 0101', email: 'a@hmcity-hospital.cn', accepting: 'yes' },
    { id: 'S2',  name: '医生甲', phone: '13800000002', deptId: 'D1', posId: 'P4', status: 'on',
      license: '1104-2015-00777', gradSchool: 'H 市医科大学 · 临床医学', years: '10', firstPractice: '2015-08-01',
      pro: '擅长急性脑梗死的溶栓、取栓及术后管理,以及卒中后康复期随访。',
      diseases: ['脑梗死', 'TIA', '脑出血', '卒中后康复'],
      academic: '中国卒中学会会员',
      clinicTime: '周一上午 / 周三下午', clinicPlace: '门诊楼 3F · 神经内科 305 诊室',
      intro: '出院后的 90 天是关键期,血压、血糖、服药依从性我会盯着,有问题随时找我。',
      photos: 0, bio: 1, avatar: 'wechat', phoneWork: '0571-8888 0102', email: 'b@hmcity-hospital.cn', accepting: 'yes' },
    { id: 'S3',  name: '医生乙', phone: '13800000003', deptId: 'D1', posId: 'P5', status: 'on',
      license: '1104-2010-00512', gradSchool: 'H 市医科大学 · 临床医学', years: '15', firstPractice: '2010-08-01',
      pro: '擅长脑出血规范化治疗、蛛网膜下腔出血,以及卒中后癫痫管理。',
      diseases: ['脑出血', '蛛网膜下腔出血', '卒中后康复'],
      academic: 'H 市医学会神经学分会委员',
      clinicTime: '周二上午 / 周四全天', clinicPlace: '门诊楼 3F · 神经内科 308 诊室',
      intro: '', photos: 0, bio: 0, avatar: 'override',
      phoneWork: '0571-8888 0103', email: 'c@hmcity-hospital.cn', accepting: 'yes' },
    { id: 'S4',  name: '医生丙', phone: '13800000004', deptId: 'D1', posId: 'P3', status: 'on',
      license: '1104-2021-01188', gradSchool: 'H 省中医药大学 · 中医学', years: '4', firstPractice: '2021-08-01',
      pro: '擅长卒中后康复期的中西医结合治疗。', diseases: ['卒中后康复'],
      academic: '', clinicTime: '周五全天', clinicPlace: '门诊楼 3F · 307 诊室',
      intro: '', photos: 0, bio: 0, avatar: 'wechat',
      phoneWork: '0571-8888 0104', email: 'd@hmcity-hospital.cn', accepting: 'no' },
    { id: 'S5',  name: '护师丁', phone: '13800000005', deptId: 'D1', posId: 'P7', status: 'on',
      license: '', gradSchool: 'H 市医科大学 · 护理学', years: '7', firstPractice: '2018-08-01',
      pro: '', diseases: [], academic: '',
      clinicTime: '周一至周五 8:00-17:00', clinicPlace: '住院部 12F · 神经内科',
      intro: '', photos: 0, bio: 0, avatar: 'wechat',
      phoneWork: '0571-8888 0201', email: 'e@hmcity-hospital.cn', accepting: 'yes' },
    { id: 'S6',  name: '护士乙', phone: '13800000006', deptId: 'D1', posId: 'P6', status: 'on',
      license: '', gradSchool: 'H 市医科大学 · 护理学', years: '9', firstPractice: '2017-08-01',
      pro: '', diseases: [], academic: '',
      clinicTime: '周一至周五 8:00-17:00', clinicPlace: '住院部 12F · 神经内科',
      intro: '', photos: 0, bio: 0, avatar: 'wechat',
      phoneWork: '0571-8888 0202', email: 'f@hmcity-hospital.cn', accepting: 'yes' },
    { id: 'S7',  name: '护士丙', phone: '13800000007', deptId: 'D1', posId: 'P2', status: 'on',
      license: '', gradSchool: 'H 市医科大学 · 护理学', years: '12', firstPractice: '2014-08-01',
      pro: '', diseases: [], academic: '',
      clinicTime: '周一至周五 8:00-17:00', clinicPlace: '住院部 12F · 神经内科',
      intro: '', photos: 0, bio: 0, avatar: 'wechat',
      phoneWork: '0571-8888 0203', email: 'g@hmcity-hospital.cn', accepting: 'yes' },
    { id: 'S8',  name: '医生戊', phone: '13800000008', deptId: 'D2', posId: 'P4', status: 'on',
      license: '1104-2013-00601', gradSchool: 'H 市医科大学 · 临床医学', years: '13', firstPractice: '2013-08-01',
      pro: '擅长脑血管病外科治疗。', diseases: ['脑出血'], academic: '',
      clinicTime: '周三上午', clinicPlace: '门诊楼 3F · 神经外科 312',
      intro: '', photos: 0, bio: 0, avatar: 'wechat',
      phoneWork: '0571-8888 0105', email: 'h@hmcity-hospital.cn', accepting: 'yes' },
    { id: 'S9',  name: '护士戊', phone: '13800000009', deptId: 'D3', posId: 'P6', status: 'on',
      license: '', gradSchool: 'H 市医科大学 · 护理学', years: '6', firstPractice: '2019-08-01',
      pro: '', diseases: [], academic: '', clinicTime: '周一至周五 8:00-17:00', clinicPlace: '急诊楼 1F',
      intro: '', photos: 0, bio: 0, avatar: 'wechat',
      phoneWork: '0571-8888 0204', email: 'i@hmcity-hospital.cn', accepting: 'yes' },
    { id: 'S10', name: '医生己', phone: '13800000010', deptId: 'D4', posId: 'P5', status: 'on',
      license: '1104-2012-00455', gradSchool: 'H 省医学院 · 康复医学', years: '14', firstPractice: '2012-08-01',
      pro: '擅长卒中后康复评定与训练方案制定。', diseases: ['卒中后康复'], academic: '',
      clinicTime: '周一下午 / 周四下午', clinicPlace: '门诊楼 2F · 康复医学科',
      intro: '', photos: 0, bio: 0, avatar: 'wechat',
      phoneWork: '0571-8888 0106', email: 'j@hmcity-hospital.cn', accepting: 'yes' },
    { id: 'S11', name: '医生庚', phone: '13800000011', deptId: 'D1', posId: 'P3', status: 'off',
      license: '', gradSchool: '', years: '', firstPractice: '',
      pro: '', diseases: [], academic: '', clinicTime: '', clinicPlace: '',
      intro: '', photos: 0, bio: 0, avatar: 'wechat',
      phoneWork: '', email: '', accepting: 'no', offReason: '离职(2026-08-31),名下 2 例患者已移交医生甲' }
  ];

  /* ---- 待分配科室(已扫码,未设科室 / 职称)---- */
  var pending = [
    { id: 'W1', nick: '李**', avatarText: '李', scanAt: '2026-10-15 09:12', days: 6, state: 'pending', claimedBy: '', claimAt: '', source: 'H 市第一医院' },
    { id: 'W2', nick: '张**', avatarText: '张', scanAt: '2026-10-17 14:30', days: 4, state: 'pending', claimedBy: '', claimAt: '', source: 'H 市第一医院' },
    { id: 'W3', nick: '王**', avatarText: '王', scanAt: '2026-10-19 20:05', days: 2, state: 'claimed', claimedBy: '主任丙', claimAt: '2026-10-19 20:22', source: 'H 市第一医院' },
    { id: 'W4', nick: '赵**', avatarText: '赵', scanAt: '2026-10-11 08:40', days: 10, state: 'archived', archivedReason: '超时未认领(扫码超过 7 天)', claimedBy: '', claimAt: '', source: 'H 市第一医院' },
    { id: 'W5', nick: '刘**', avatarText: '刘', scanAt: '2026-10-10 16:22', days: 11, state: 'archived', archivedReason: '误扫(非本院人员)', claimedBy: '', claimAt: '', source: 'H 市第一医院' }
  ];

  /* ---- 病患 ---- */
  var patients = [
    { id: 'PT1', name: '陈丙英', sex: 'F', age: 81, inNo: '320***22', docId: 'S2', nurId: 'S6', extraNurs: [],
      enrole: '2026-09-30', status: 'active', proj: '90 天卒中连续健康管理',
      base: { src: 'doctor', by: '医生甲', at: '2026-10-20' },
      fields: [
        { name: '收缩压', comp: '90 - 140', now: '100 - 150', unit: 'mmHg' },
        { name: '舒张压', comp: '60 - 90',  now: '60 - 95',   unit: 'mmHg' },
        { name: 'LDL-C', comp: '< 1.8',   now: '< 1.4',    unit: 'mmol/L' }
      ] },
    { id: 'PT2', name: '陈明远', sex: 'M', age: 68, inNo: '320***58', docId: 'S2', nurId: 'S6', extraNurs: [],
      enrole: '2026-10-06', status: 'active', proj: '90 天卒中连续健康管理',
      base: { src: 'dept', by: '神经内科 · 科室配置', at: '' },
      fields: [ { name: '收缩压', comp: '90 - 140', now: '—', unit: 'mmHg' } ] },
    { id: 'PT3', name: '李桂芳', sex: 'F', age: 74, inNo: '320***71', docId: 'S3', nurId: 'S5', extraNurs: ['S7'],
      enrole: '2026-09-12', status: 'active', proj: '90 天卒中连续健康管理',
      base: { src: 'doctor', by: '医生乙', at: '2026-10-12' },
      fields: [ { name: '收缩压', comp: '90 - 140', now: '95 - 145', unit: 'mmHg' } ] },
    { id: 'PT4', name: '王建国', sex: 'M', age: 65, inNo: '320***09', docId: 'S2', nurId: '', extraNurs: [],
      enrole: '2026-10-18', status: 'active', proj: '—',
      base: { src: 'dept', by: '神经内科 · 科室配置', at: '' },
      fields: [] },
    { id: 'PT5', name: '周淑珍', sex: 'F', age: 79, inNo: '320***33', docId: 'S4', nurId: 'S7', extraNurs: [],
      enrole: '2026-08-25', status: 'active', proj: '90 天卒中连续健康管理',
      base: { src: 'dept', by: '神经内科 · 科室配置', at: '' },
      fields: [ { name: '收缩压', comp: '90 - 140', now: '—', unit: 'mmHg' } ] },
    { id: 'PT6', name: '赵国强', sex: 'M', age: 71, inNo: '320***84', docId: 'S3', nurId: 'S5', extraNurs: [],
      enrole: '2026-06-14', status: 'closed', proj: '90 天卒中连续健康管理',
      base: { src: 'doctor', by: '医生乙', at: '2026-06-14', expired: true },
      fields: [ { name: '收缩压', comp: '90 - 140', now: '—', unit: 'mmHg' } ] },
    { id: 'PT7', name: '孙丽华', sex: 'F', age: 66, inNo: '320***47', docId: 'S8', nurId: 'S9', extraNurs: [],
      enrole: '2026-10-01', status: 'active', proj: '—',
      base: { src: 'dept', by: '神经外科 · 科室配置', at: '' },
      fields: [] }
  ];

  /* ---- 任务组件库 ----
   * ⚠️ 录入区间 = field-constraints.md 物理有效区间(硬阻断)
   * ⚠️ 报警线   = field-constraints.md 校验规则(软告警);C8 由科室填,系统不预填
   */
  var components = [
    { id: 'T1', name: '记录血压', icon: 'icon-bp', deptId: 'D1', scope: ['patient'],
      desc: '患者每日早晚各测一次血压,可与个人目标对比。', status: 'on', order: 1,
      fields: [
        { id: 'F1', name: '收缩压', type: 'num', validMin: 50, validMax: 280, alertMin: 90, alertMax: 140, unit: 'mmHg', step: 1, req: 'required', monitor: true },
        { id: 'F2', name: '舒张压', type: 'num', validMin: 20, validMax: 180, alertMin: 60, alertMax: 90,  unit: 'mmHg', step: 1, req: 'required', monitor: true },
        { id: 'F3', name: '心率',   type: 'num', validMin: 20, validMax: 250, alertMin: 60, alertMax: 100, unit: 'bpm',   step: 1, req: 'optional', monitor: false },
        { id: 'F4', name: '测量时间', type: 'datetime', validMin: null, validMax: null, alertMin: null, alertMax: null, unit: '', step: 1, req: 'auto', monitor: false },
        { id: 'F5', name: '测量体位', type: 'enum', enumVals: ['坐位', '卧位', '立位'], validMin: null, validMax: null, alertMin: null, alertMax: null, unit: '', step: 1, req: 'optional', monitor: false }
      ] },
    { id: 'T2', name: '记录血糖', icon: 'icon-blood-drop', deptId: 'D1', scope: ['patient'],
      desc: '指尖血糖自测,空腹与餐后各测一次。', status: 'on', order: 2,
      fields: [
        { id: 'F11', name: '空腹血糖', type: 'num', validMin: 1.0, validMax: 30.0, alertMin: 3.9, alertMax: 6.1, unit: 'mmol/L', step: 0.1, req: 'required', monitor: true },
        { id: 'F12', name: '餐后血糖', type: 'num', validMin: 1.0, validMax: 30.0, alertMin: null, alertMax: 7.8, unit: 'mmol/L', step: 0.1, req: 'optional', monitor: true },
        { id: 'F13', name: '测量时间', type: 'datetime', validMin: null, validMax: null, alertMin: null, alertMax: null, unit: '', step: 1, req: 'auto', monitor: false }
      ] },
    { id: 'T3', name: '服药反馈', icon: 'icon-pill', deptId: 'D1', scope: ['patient', 'nurse'],
      desc: '患者反馈当日服药情况,护士据此跟进。', status: 'on', order: 3,
      fields: [
        { id: 'F21', name: '服药情况', type: 'enum', enumVals: ['按医嘱服用', '漏服', '自行停药', '自行加量'], validMin: null, validMax: null, alertMin: null, alertMax: null, unit: '', step: 1, req: 'required', monitor: false },
        { id: 'F22', name: '备注', type: 'text', validMin: null, validMax: null, alertMin: null, alertMax: null, unit: '', step: 1, req: 'optional', monitor: false }
      ] },
    { id: 'T4', name: '电话回访', icon: 'icon-call', deptId: 'D1', scope: ['nurse'],
      desc: '护士电话随访记录接通情况与随访结论。', status: 'on', order: 4,
      fields: [
        { id: 'F31', name: '接通状态', type: 'enum', enumVals: ['电话接通', '未接通', '拒接'], validMin: null, validMax: null, alertMin: null, alertMax: null, unit: '', step: 1, req: 'required', monitor: false },
        { id: 'F32', name: '随访结论', type: 'text', validMin: null, validMax: null, alertMin: null, alertMax: null, unit: '', step: 1, req: 'optional', monitor: false }
      ] },
    { id: 'T5', name: '上传检查报告', icon: 'icon-camera', deptId: 'D1', scope: ['patient'],
      desc: '上传复查报告照片,自动识别数值后由医生核对。', status: 'on', order: 5,
      fields: [
        { id: 'F41', name: '报告照片', type: 'file', validMin: null, validMax: null, alertMin: null, alertMax: null, unit: '', step: 1, req: 'required', monitor: false },
        { id: 'F42', name: '检查日期', type: 'date', validMin: null, validMax: null, alertMin: null, alertMax: null, unit: '', step: 1, req: 'required', monitor: false }
      ] },
    { id: 'T6', name: '康复训练打卡', icon: 'icon-run', deptId: 'D1', scope: ['patient'],
      desc: '每日康复训练打卡。', status: 'on', order: 6,
      fields: [
        { id: 'F51', name: '训练项目', type: 'enum', enumVals: ['步行训练', '被动运动', '语言训练'], validMin: null, validMax: null, alertMin: null, alertMax: null, unit: '', step: 1, req: 'required', monitor: false },
        { id: 'F52', name: '训练时长', type: 'num', validMin: 0, validMax: 600, alertMin: null, alertMax: null, unit: '分钟', step: 1, req: 'optional', monitor: false, custom: true }
      ] },
    { id: 'T7', name: '口述病例', icon: 'icon-microscope', deptId: 'D1', scope: ['patient', 'doctor'],
      desc: '患者语音描述病情变化,AI 结构化后由医生确认。', status: 'on', order: 7, fields: [] },
    { id: 'T8', name: '建立药物清单', icon: 'icon-drug-package', deptId: 'D1', scope: ['patient', 'doctor', 'nurse'],
      desc: '录入出院带药,两栏分开:医嘱使用 / 实际使用。', status: 'on', order: 8,
      fields: [
        { id: 'F71', name: '体重', type: 'num', validMin: 1.0, validMax: 300.0, alertMin: null, alertMax: null, unit: 'kg', step: 0.1, req: 'required', monitor: false, disputed: true },
        { id: 'F72', name: '服药时间', type: 'enum', enumVals: ['QD', 'BID', 'TID', 'Q4H', 'Q6H', 'Q8H', 'PRN'], validMin: null, validMax: null, alertMin: null, alertMax: null, unit: '', step: 1, req: 'required', monitor: false }
      ] }
  ];

  /* ---- 药品库(照搬既有 admin-drugs.html 的 11 个)---- */
  var drugs = [
    { id: 'M1', name: '阿司匹林肠溶片', spec: '100mg', cat: '抗血小板', form: '片', generic: 'Aspirin Enteric-coated Tablets',
      usage: '每日 1 次,餐后服用。抗血小板治疗基础用药。', adr: '胃肠道不适、皮疹。', contra: '活动性消化道溃疡、阿司匹林哮喘。', inter: '与布洛芬合用增加消化道出血风险。', status: 'on' },
    { id: 'M2', name: '硫酸氢氯吡格雷', spec: '75mg', cat: '抗血小板', form: '片', generic: 'Clopidogrel Bisulfate Tablets',
      usage: '每日 1 次。', adr: '出血倾向、白细胞减少。', contra: '中性粒细胞减少症、活动性出血。', inter: '避免与奥美拉唑长期合用降低疗效。', status: 'on' },
    { id: 'M3', name: '达比加群酯', spec: '110mg / 150mg', cat: '抗凝', form: '胶囊', generic: 'Dabigatran Etexilate Capsules',
      usage: '每日 2 次,固定时间。', adr: '出血、皮肤瘙痒。', contra: '严重肾功能不全、出血性疾病。', inter: '与抗血小板药合用增加出血风险。', status: 'on' },
    { id: 'M4', name: '利伐沙班', spec: '10mg / 15mg / 20mg', cat: '抗凝', form: '片', generic: 'Rivaroxaban Tablets',
      usage: '每日 1 次,晚餐时。', adr: '出血、贫血。', contra: '中重度肾功能不全、活动性出血。', inter: '与 CYP3A4 强抑制剂合用需减量。', status: 'on' },
    { id: 'M5', name: '华法林', spec: '2.5mg / 3mg', cat: '抗凝', form: '片', generic: 'Warfarin Sodium Tablets',
      usage: '每日固定时间,定期监测 INR。', adr: '出血、皮肤坏死。', contra: '妊娠、哺乳期、活动性出血。', inter: '与多种抗生素、抗真菌药有显著相互作用。', status: 'on' },
    { id: 'M6', name: '阿托伐他汀钙', spec: '10mg / 20mg', cat: '他汀', form: '片', generic: 'Atorvastatin Calcium Tablets',
      usage: '每晚 1 次,睡前服用。强化降脂目标 LDL-C < 1.8 mmol/L。', adr: '肌肉酸痛、转氨酶升高。严重者需停药就医。', contra: '活动性肝病、孕妇、哺乳期妇女。', inter: '避免与 CYP3A4 强抑制剂(如克拉霉素、伊曲康唑)合用。', status: 'on' },
    { id: 'M7', name: '瑞舒伐他汀钙', spec: '5mg / 10mg', cat: '他汀', form: '片', generic: 'Rosuvastatin Calcium Tablets',
      usage: '每晚 1 次。', adr: '肌肉酸痛、转氨酶升高。', contra: '活动性肝病、妊娠。', inter: '避免与环孢素合用。', status: 'on' },
    { id: 'M8', name: '辛伐他汀', spec: '20mg / 40mg', cat: '他汀', form: '片', generic: 'Simvastatin Tablets',
      usage: '每晚 1 次。', adr: '肌肉酸痛、横纹肌溶解。', contra: '活动性肝病、妊娠。', inter: '与大剂量氨苄西林合用增加肌病风险。', status: 'on' },
    { id: 'M9', name: '依折麦布', spec: '10mg', cat: '他汀', form: '片', generic: 'Ezetimibe Tablets',
      usage: '每日 1 次。', adr: '腹泻、腹痛。', contra: '活动性肝病。', inter: '与他汀合用可加强降脂。', status: 'on' },
    { id: 'M10', name: '缬沙坦', spec: '80mg', cat: '降压', form: '片', generic: 'Valsartan Tablets',
      usage: '每日 1 次,固定时间。降压 + 靶器官保护。', adr: '头晕、低血压、高钾血症。', contra: '妊娠、双侧肾动脉狭窄。', inter: '与保钾利尿剂合用警惕高钾。', status: 'on' },
    { id: 'M11', name: '尼莫地平', spec: '30mg', cat: '降压', form: '片', generic: 'Nimodipine Tablets',
      usage: '每 4 小时 1 次,蛛网膜下腔出血后连用 21 天。', adr: '面部潮红、心悸、低血压。', contra: '严重肝功能不全。', inter: '与西地兰非合用影响疗效。', status: 'off' }
  ];
  var DRUG_CATS = ['抗血小板', '抗凝', '他汀', '降压'];

  /* ---- 审计日志(占位页用)---- */
  var audits = [
    { t: '2026-10-20 16:42', who: '主任丙', what: '修改组件「记录血压」', detail: '收缩压 报警线 90-140 → 90-140(未变);心率 报警线由未设置改为 60-100', tag: '配置变更' },
    { t: '2026-10-20 10:15', who: '主任丙', what: '设置工作人员', detail: '王** → 神经内科 · 护师', tag: '人员' },
    { t: '2026-10-19 20:22', who: '主任丙', what: '认领待设置人员', detail: '认领 王**(停留 2 天)', tag: '人员' },
    { t: '2026-10-18 09:05', who: '主任丙', what: '替换医生头像', detail: '医生乙:微信头像 → 后台上传头像', tag: '配置变更' },
    { t: '2026-10-12 11:30', who: '主任丙', what: '新增职位', detail: '技术职称「护师」', tag: '配置变更' },
    { t: '2026-10-11 08:45', who: '系统', what: '待设置超时归档', detail: '赵**(停留 7 天未认领)→ 已归档', tag: '系统' }
  ];

  /* ---- 查询辅助 ---- */
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function dept(id)   { return byId(departments, id); }
  function pos(id)    { return byId(positions, id); }
  function member(id) { return byId(staff, id); }
  function hospital(id) { return byId(hospitals, id); }
  function maskPhone(p) {
    if (!p) return '';
    return p.length === 11 ? p.slice(0, 3) + '****' + p.slice(7) : p;
  }
  function avatarColor(name) {
    var cs = ['#2E7DD7', '#43A047', '#8E63CE', '#E66B2E', '#5BBFC5', '#1565C0'];
    var h = 0; for (var i = 0; i < name.length; i++) h += name.charCodeAt(i);
    return cs[h % cs.length];
  }
  /* 简介完整度:必填 6 项 */
  function bioScore(s) {
    var items = [s.name, s.avatar, s.deptId, s.posId, s.pro, (s.diseases && s.diseases.length) ? 1 : 0];
    var done = 0; items.forEach(function (i) { if (i) done++; });
    return Math.round(done / items.length * 100);
  }

  /* 按医院过滤科室 */
  function deptListByHospital(hid) {
    return departments.filter(function (d) { return d.hospitalId === hid; });
  }

  /* 给药品打医院标签(本轮简单分:H1 多 / H2 少);原本的 status 字段保留 */
  (function () {
    drugs.forEach(function (d) { d.hospitalId = 'H1'; });
    if (drugs[9]) drugs[9].hospitalId = 'H2';  /* M10 缬沙坦 -> H2 */
    if (drugs[10]) drugs[10].hospitalId = 'H2'; /* M11 尼莫地平 -> H2 */
  })();

  return {
    hospitals: hospitals, departments: departments, positions: positions, POS_CATS: POS_CATS,
    staff: staff, pending: pending, patients: patients, components: components,
    drugs: drugs, DRUG_CATS: DRUG_CATS, audits: audits,
    byId: byId, dept: dept, pos: pos, member: member, hospital: hospital,
    maskPhone: maskPhone, avatarColor: avatarColor, bioScore: bioScore,
    getCurrentHospitalId: getCurrentHospitalId, setCurrentHospitalId: setCurrentHospitalId,
    clearCurrentHospitalId: clearCurrentHospitalId,
    deptListByHospital: deptListByHospital,
    pendingCount: pending.filter(function (p) { return p.state !== 'archived'; }).length
  };
})();

if (typeof module !== 'undefined') module.exports = BACK_DATA;