# 原型索引（80 页）

> **本目录是 PM / UI 的产品原型（静态可点击 demo），不是前端代码。**
> 真前端在仓 C `emrs/frontend/`（React + Next.js），由 FE 参照本目录**重写**。
> ⛔ 不要在这里写真实前端代码；本仓是**公开仓**。
>
> 用途：字段口径以这里的页面为准（见项目 `CLAUDE.md` §八「字段缺口以原型为准」）。
> 最后更新：2026-11-05。

**状态图例**：✅ 已实现 · ⬜ 未开始 · 🗄 已被取代 · 🧩 壳层状态页

---

## 一、后台管理（28 页）

### 1.1 现行版本 `back-*`（22 页）

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
| `back-drugs.html` | 药品库 | `/drugs` | ✅ |
| `back-drug-edit.html` | 编辑药品 | `/drugs/new` · `/drugs/[id]/edit` | ✅ |
| `back-edu.html` | 健康教育 | `/edu` | ✅ |
| `back-edu-edit.html` | 编辑文章 | `/edu/new` · `/edu/[id]/edit` | ✅ |
| `back-empty.html` | 没有内容 | 壳层空态 | 🧩 |
| `back-noauth.html` | 权限不足 | 壳层 403 回落 | 🧩 |
| `back-help.html` | 关于本系统 | — | ⬜ |

> ⚠️ **口径差异**：原型叫「组织架构」，真前端收敛为 `/departments`（科室管理）。
> ⚠️ **原型没有但真前端有**：`/hospitals`（医院列表）、`/hospitals/[id]/edit` —— 由步骤 4 / 5 交付，原型未覆盖。

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

---

## 二、医生端（移动，10 页，⬜ 小程序未开始）

| 文件 | 标题 |
|---|---|
| `doctor-home.html` | 主管医生主页 |
| `doctor-patients.html` | 患者列表 |
| `doctor-patient-detail.html` | 患者详情 · 陈丙英 |
| `doctor-tasks.html` | 任务列表 |
| `doctor-task-detail.html` | 任务详情 · LDL-C 异常 |
| `doctor-issue-task.html` | 下发任务 |
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
| `nurse-issue-task.html` | 下发任务 |
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
| `patient-signature.html` | 签署知情同意 | 电子签名本期不做 |
| `patient-privacy.html` | 项目隐私与安全 | |
| `patient-research.html` | 参与研究项目 | |
| `patient-pay.html` | 项目付费 | 支付本期不做 |
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
| `assets/edu-data.js` | 健康教育内容库（后台 ↔ 患者端共享） |
| `assets/sample-hospital.svg` | 占位图 |
| `styles.css` | 移动端样式 |

---

## 八、别混：仓 A 还有一套第一代原型

`emrs/docs/prd/prototype/`（26 页，移动端 preview 组）是 **PRD v0.1 配套的第一代**，
与本目录**不是同一套**，`styles.css` 也是不同文件，互不依赖。

> 🔴 其中 **`monitor.html`（重点患者监控大屏）** 与 **`historical-record.html`（历史病历详情·只读）**
> 是本仓 D 没有等价物的**孤本，勿删**。详见 `emrs/docs/prd/prototype/README.md`。
