# 原型索引（84 页）

> **本目录是 PM / UI 的产品原型（静态可点击 demo），不是前端代码。**
> 真前端在仓 C `emrs/frontend/`（React + Next.js），由 FE 参照本目录**重写**。
> ⛔ 不要在这里写真实前端代码；本仓是**公开仓**。
>
> 用途：字段口径以这里的页面为准（见项目 `CLAUDE.md` §八「字段缺口以原型为准」）。
> 最后更新：2026-11-06。

**状态图例**：✅ 已实现 · ⬜ 未开始 · 🗄 已被取代 · 🧩 壳层状态页

---

## 一、后台管理（32 页）

### 1.1 现行版本 `back-*`（26 页）

| 文件 | 标题 | 真前端路由 | 状态 |
|---|---|---|---|
| `back-login.html` | 登录 | `/login` | ✅ |
| `back-hospital-pick.html` | 选择医院 | `/hospital-pick` | ✅ |
| `back-dashboard.html` | 工作台 | `/dashboard` | ✅ |
| `back-org.html` | 组织架构 | `/departments` | ✅ |
| `back-org-edit.html` | 新增 / 编辑（组织） | `/departments` 内联抽屉 | ✅ |
| `back-positions.html` | 职位字典 | `/positions` | ✅ |
| `back-staff.html` | 工作人员 | `/staff` | ✅ |
| `back-staff-edit.html` | 新增 / 编辑人员 | `/staff/new` · `/staff/[id]/edit` | ✅ |
| `back-staff-detail.html` | 人员详情 | `/staff/[id]` | ✅ |
| `back-staff-pending-detail.html` | 设置科室与职称 | `/staff/[id]/assign` | ✅ |
| `back-patients.html` | 病患 | `/patients` | ✅ |
| `back-qrcode.html` | 二维码中心 | `/qrcode` | ✅ |
| `back-component-lib.html` | 任务组件库 | `/components` | ✅ |
| `back-component-edit.html` | 编辑组件 | `/components/new` · `/components/[id]/edit` | ✅ |
| `back-component-field.html` | 字段配置 | `/components/[id]/fields/[fieldId]` | ✅ |
| `back-projects.html` | 项目管理 | `/projects` | ✅ |
| `back-project-edit.html` | 新建 / 编辑项目 | `/projects/new` · `/projects/[id]/edit` | ✅ |
| `back-project-detail.html` | 项目详情（只读） | `/projects/[id]` | ✅ |
| `back-project-patients.html` | 参与患者 | `/projects/[id]/patients` | ✅ |
| `back-drugs.html` | 药品库 | `/drugs` | ✅ |
| `back-drug-edit.html` | 编辑药品 | `/drugs/new` · `/drugs/[id]/edit` | ✅ |
| `back-edu.html` | 健康教育 | `/edu` | ✅ |
| `back-edu-edit.html` | 编辑文章 | `/edu/new` · `/edu/[id]/edit` | ✅ |
| `back-empty.html` | 没有内容 | 壳层空态 | 🧩 |
| `back-noauth.html` | 权限不足 | 壳层 403 回落 | 🧩 |
| `back-help.html` | 关于本系统 | — | ⬜ |

> ⚠️ **口径差异**：原型叫「组织架构」，真前端收敛为 `/departments`（科室管理）。
> ⚠️ **原型没有但真前端有**：`/hospitals`（医院列表）、`/hospitals/[id]/edit` —— 由步骤 4 / 5 交付，原型未覆盖。
> 🆕 **项目管理**（2026-11-05 新增；同日**执行层重新设计**后改口径）：项目按**归属科室**创建；
> 项目直接绑组件，配置行叫**项目任务**，配「何时做（每 N 天 / 第 N 天，以患者**入组日 D0** 为起点）」+
> 「执行人」「下一步跟踪人」两个**单选**角色位。**任务由入组自动生成**，项目页不派单。
> 设计见 `emrs/docs/prd/prd-project-module/`（仓 A）。导航归**医院视图**，排在「任务」组「任务组件库」之后。
> 🆕 **参与患者**（2026-11-06 新增）：项目列表每行操作区「患者」→ `back-project-patients.html?id=<项目 id>`；
> 顶部面包屑带项目名（可点回项目详情）→「参与患者」；三个 Tab（在组 / 已结管 / 全部）+ 姓名搜索 + 分页；
> 列 = 患者 / 入组日期 / 状态 / 操作（结管，已结管行不给按钮）。
> ⛔ 只读 + 可结管，**没有「添加患者 / 加入项目」入口**（入组唯一来源是患者小程序自助）。

### 1.2 旧世代 `admin-*`（6 页，🗄 已被 `back-*` 取代）

| 文件 | 标题 | 状态 |
|---|---|---|
| `admin-projects.html` | 项目设置 | 🗄 |
| `admin-project-edit.html` | 编辑项目 | 🗄 |
| `admin-task-lib.html` | 任务库 | 🗄 |
| `admin-task-edit.html` | 编辑任务组件 | 🗄 |
| `admin-drugs.html` | 药品库 | 🗄 |
| `admin-drug-edit.html` | 编辑药品 | 🗄 |

> 这一组是早期后台形态，仅作历史参考。新页面一律照 `back-*`。
>
> 📌 **2026-11-05 勘误**：这一组虽然沿用 `admin-` 命名，但**实际是移动端壳形态**（不是 PC 后台壳），
> 与本目录 `back-*` 的 PC 形态并不同源。`admin-projects.html` / `admin-project-edit.html` /
> `admin-task-lib.html` 现被**小程序侧**「科室主任设定项目 + 项目任务」复用，并作为后台 PC 侧项目模块的**产品形态口径来源**。
> ⚠️ **2026-11-05 执行层重新设计后**：`admin-project-edit.html` 只做了**与口径直接冲突的最小替换**
> （日期三档→两档、目标人多选→执行人 / 跟踪人两个单选、措辞同步）；`admin-task-lib.html` 未动。
> 完整交互（含患者任务视图、任务转移）见 `prd.md` T26 ~ T28，**下一轮再做**。

---

## 二、医生端（移动，10 页，⬜ 小程序未开始）

| 文件 | 标题 |
|---|---|
| `doctor-home.html` | 主管医生主页 |
| `doctor-patients.html` | 患者列表 |
| `doctor-patient-detail.html` | 患者详情 · 陈丙英 |
| `doctor-tasks.html` | 任务列表 |
| `doctor-task-detail.html` | 任务详情 · LDL-C 异常 |
| `doctor-issue-task.html` | 下发任务 ⚠️ 旧口径（已作废 2026-11-05，待 T27/T28 重做） |
| `doctor-feed-detail.html` | 任务详情（随访） |
| `doctor-assign-nurse.html` | 分配主管护士 |
| `doctor-my-rating.html` | 我的评分 |
| `doctor-detail.html` | 我的医生 |

---

## 三、护士端（移动，10 页，⬜ 小程序未开始）

| 文件 | 标题 |
|---|---|
| `nurse-home.html` | 护士主页 |
| `nurse-patients.html` | 患者列表 |
| `nurse-patient-detail.html` | 患者详情 · 陈丙英 |
| `nurse-tasks.html` | 任务列表 |
| `nurse-task-detail.html` | 任务详情 · 7 天回访 |
| `nurse-issue-task.html` | 下发任务 ⚠️ 旧口径（已作废 2026-11-05，待 T27/T28 重做） |
| `nurse-issue-followup.html` | 预约复查 · 陈丙英 |
| `nurse-transfer.html` | 任务转移 |
| `nurse-my-rating.html` | 我的评分 |
| `nurse-detail.html` | 我的护士 |

---

## 四、科室负责人端（移动，4 页，⬜ 小程序未开始）

| 文件 | 标题 |
|---|---|
| `director-home.html` | 科室负责人主页 |
| `director-project-detail.html` | 项目详情 · 90 天管理 |
| `director-evaluation.html` | 项目评定 |
| `director-rate.html` | 项目成员打分 |

---

## 五、患者端（移动，24 页，⬜ 小程序未开始）

| 文件 | 标题 | 备注 |
|---|---|---|
| `patient-scan.html` | 扫码进入 | 二维码入口 |
| `patient-auth.html` | 个人信息认证 | |
| `patient-home.html` | 个人中心 | |
| `patient-plan.html` | 个人计划 | |
| `patient-tasks.html` | 任务中心 | |
| `patient-task-bp.html` | 记录血压 | |
| `patient-task-med.html` | 服药反馈 | |
| `patient-task-upload.html` | 上传复查报告 | |
| `patient-task-appointment.html` | 复查预约 | |
| `patient-task-followup.html` | 电话回访安排 | |
| `patient-project-detail.html` | 项目详情 | |
| `patient-report-90.html` | 90 天报告 | |
| `patient-edu.html` | 健康教育 | |
| `patient-edu-detail.html` | 健康教育 · 正文 | 正文共享 `assets/edu-data.js` |
| `patient-im.html` | 联系护士 | |
| `patient-emergency.html` | 紧急情况 | |
| `patient-emergency-nearest.html` | 就近急诊医院 | |
| `patient-emergency-recorded.html` | 已通知护士 | |
| `patient-signature.html` | 签署知情同意 | **电子签名本期不做** —— 页面以「勾选同意 + 继续」代替签名（2026-11-05 D33） |
| `patient-privacy.html` | 项目隐私与安全 | |
| `patient-research.html` | 参与研究项目 | |
| `patient-pay.html` | 确认加入（支付占位） | **支付本期不做** —— 页面不接支付网关、不发起扣款；按钮为「确认加入」，点即入组（2026-11-05 D33） |
| `patient-rate.html` | 评价主管医护 | |
| `patient-elderly-help.html` | 家属授权协助 | 家属绑定只读口径 |

---

## 六、通用 / 组件（4 页）

| 文件 | 标题 | 说明 |
|---|---|---|
| `index.html` | 卒中全程管理 · 角色入口 | 移动端总入口 |
| `role-switch.html` | 角色切换 | 演示用 |
| `leaderboard.html` | 评分排行榜 | |
| `rate-popup.html` | 打分弹窗组件 | 组件页，非独立流程 |

---

## 七、资产与数据文件

| 文件 | 作用 |
|---|---|
| `assets/back.css` | 后台样式（55 KB，含 `min-width:1280px` PC 壳） |
| `assets/back-layout.js` | 后台壳层 |
| `assets/back-data.js` | 后台演示数据 + 字段归一层（`drugView` / `drugWrite`） |
| `assets/back-project-data.js` | 后台 PC 侧「项目」数据层（归属科室 + 项目任务；持久化到 localStorage） |
| `assets/projects.js` | 项目主档（移动端与后台 PC 侧共用；PC 侧只读不写） |
| `assets/edu-data.js` | 健康教育内容库（后台 ↔ 患者端共享） |
| `assets/sample-hospital.svg` | 占位图 |
| `styles.css` | 移动端样式 |

---

## 八、别混：仓 A 还有一套第一代原型

`emrs/docs/prd/prototype/`（26 页，移动端 preview 组）是 **PRD v0.1 配套的第一代**，
与本目录**不是同一套**，`styles.css` 也是不同文件，互不依赖。

> 🔴 其中 **`monitor.html`（重点患者监控大屏）** 与 **`historical-record.html`（历史病历详情·只读）**
> 是本仓 D 没有等价物的**孤本，勿删**。详见 `emrs/docs/prd/prototype/README.md`。

---

## 九、2026-11-05 · 执行层重新设计（v2.0）原型改动登记

> 依据：用户 2026-11-05 晚 10 条拍板（三层模型 / 入组自动生成 / 7 天·1 天窗口 / D0=入组日 /
> 每 N 天 / 双角色 / 4 态 / 转移 / 停用取消 / 不设时间点 + 跟踪人视图）。
> 设计文档：`emrs/docs/prd/prd-project-module/prd.md` §〇（口径变更）、D18 ~ D28。

| # | 文件 | 改了什么 |
|---|---|---|
| M29 | `back-project-edit.html` | 编排区改为**项目任务**：标题 / 说明条 / 空态 / 提示条同步；补「入组自动生成，本页只配配方」与「生成窗口 7 / 1 天」 |
| M30 | `back-project-edit.html` | 「何时做」由三档改**两档**：`每 [N] 天` / `第 [N] 天`；删除以出院为基准的第三档；徽章与校验同步 |
| M31 | `back-project-edit.html` | 目标人多选 chip → **执行人（三选一）+ 下一步跟踪人（四选一，含「无」）** 两个单选组 |
| M32 | `back-project-edit.html` | 保存校验改为「何时做 + 执行人」必填（跟踪人可空）；移除 / 新增文案改为「不再生成新任务、已生成的保留」 |
| M33 | `back-project-detail.html` | 时间轴分组改「每 N 天 / 第 N 天」；右栏改「执行人 → 跟踪人」使用统计；范围说明补生成层与停用取消 |
| M34 | `back-projects.html` | 列名改「项目任务」；顶部说明补「入组自动生成」；停用确认弹窗写清「未完成任务全部取消」 |
| M35 | `assets/back-project-data.js` | 数据模型改为 `sched{type:every|dayn}` + `executor` + `tracker`（去掉位掩码）；`FORMAT_V` → **3**；新增 `manualReview` 标记 |
| M36 | `admin-project-edit.html` | 小程序侧**最小替换**：日期两档 + 执行人 / 跟踪人两个单选 + 措辞（完整交互见 `prd.md` T26） |
| M37 | `nurse-home.html` · `doctor-home.html` | 跟踪人首页加 **「未处理结转 (N)」** 入口（跟踪人可以是护士也可以是医生）；今日列表改「今日待跟踪」 |
| M38 | `admin-projects.html` · `assets/back-layout.js` · `back-component-lib.html` | 术语同步：旧称 → **项目任务** |

⛔ **未动**：`admin-task-lib.html` / `admin-drugs.html` / 身份 banner / `role-switch.html` / `index.html` /
患者端与医生端的其余业务页（用户明确「小程序业务页本期未开始」）。

---

## 十、2026-11-05 晚 · v2.1 入组来源与角色约束（原型改动登记）

> 依据：用户 2026-11-05 晚拍板（`docs/STATE.md` §五 39 + 支付选 A）。
> 设计文档：`emrs/docs/prd/prd-project-module/prd.md` **D29 ~ D33**。
> ⚠️ **入组的唯一来源 = 患者在小程序自己加入**；后台不提供代加人，后台患者列表只读。
> ⚠️ **签署 = 勾选确认**（不做电子签名）· **支付不接网关**（确认加入即入组，不扣款）。

| # | 文件 | 改了什么 |
|---|---|---|
| M39 | `back-project-detail.html` | 新增「**已入组患者（只读）**」区块：患者 / 入组日(D0) / 主管医生 / 主责护士 / 在管·已结管；常驻说明「患者需在小程序自行加入」；⛔ 无「加入项目 / 添加患者」按钮 |
| M40 | `back-project-detail.html` | 右栏「本期范围」补「入组来源在患者端」；停用态说明同步 |
| M41 | `back-project-edit.html` | 跟踪人选项去掉「患者」；新增「执行人必填、执行人角色 ≠ 跟踪人角色」校验（保存阻断 + 即时提示） |
| M42 | `assets/back-project-data.js` | 拆分 `EXECUTOR_ROLES` / `TRACKER_ROLES`；新增 `roleConflict()`；修正种子里的同角色组合（`t10` nurse→nurse 改 nurse→doctor）；`FORMAT_V` → **4**（丢弃旧 localStorage 中的同角色组合） |
| M43 | `patient-project-detail.html` | CTA 改为「勾选隐私 → **签署须知**」；补「入组只能本人自助、医护 / 后台不能代加」说明；`已签约` → `已入组` |
| M44 | `patient-signature.html` | 接回链路（返回项目详情）；**去掉签名 / 姓名输入**，改为「勾选同意 + 继续」；明示「本期以勾选代替电子签名」 |
| M45 | `patient-pay.html` | ⛔ **去掉微信支付按钮与扣款动作**；保留项目 / 周期 / 价格展示；按钮改「**确认加入**」；成功态改「**入组成功**」并返回首页 |
| M46 | `patient-home.html` | 项目服务文案改为入组链路（项目列表 → 签署须知 → 确认加入）；徽章 `已签约 / 未签约` → **`已入组 / 未入组`** |
| M47 | `admin-project-edit.html` · `admin-projects.html` | 跟踪人去掉「患者」；补角色互斥与「入组只能患者自助」说明 |
| M48 | `back-projects.html` | 顶部说明与停用确认弹窗补「入组只能由患者在小程序自助完成」 |
| M49 | `INDEX.md` | 本登记；页面表两条标注（电子签名 / 支付）保留并补充页面替代口径 |

### 入组链路自检（本目录内的可点击闭环）

`patient-home.html`（项目服务）→ `patient-project-detail.html` → `patient-signature.html` → `patient-pay.html` → `patient-home.html`（已入组，任务区可见）

> ⚠️ 本期**只演示流程**：签署以勾选代替、支付不接网关；入组结果用 `localStorage`（`emrs_subscribed_projects`）模拟。

---

## 十一、2026-11-06 · 项目参与患者列表（原型改动登记）

> 依据：用户 2026-11-06 需求「参加这个组的病患，要在项目管理列表中，有入口，进入到一个参与过这个项目的列表」。

| # | 文件 | 改了什么 |
|---|---|---|
| M50 | `back-project-patients.html`（新建） | 项目参与患者列表：面包屑 项目名 → 参与患者；Tab 在组 / 已结管 / 全部 + 姓名搜索 + 分页；列 = 患者 / 入组日期 / 状态 / 操作（结管）；结管弹窗沿用项目详情页那套（原因 5 选一 + 备注 ≤100 字） |
| M51 | `back-projects.html` | 每行操作区「项目任务」后新增「患者」链接 → `back-project-patients.html?id=<项目 id>`；操作列宽 190 → 230 |
| M52 | `INDEX.md` | 本登记；页面表新增一行，后台管理 31 → 32 页 |

> 数据直接取 `assets/back-data.js` 的 `patients[].projs[]`（与 `back-project-detail.html`「已入组患者」同源），不另造数据。
> ⛔ 本页**只读 + 可结管**，没有「添加患者」入口；入组唯一来源仍是患者小程序自助。
