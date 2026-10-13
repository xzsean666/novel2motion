# TASK-135: 通用 Three.js 3D 人物与动作系统设计基线

- 状态: REVIEW
- 优先级: P0
- 负责人: AI Agent
- 关联模块: `docs/AI`, `src/core`, `src/engine/puppet/avatar`, `tests`
- 依赖前置: TASK-134

## 1. 目标

建立新的人物和动作系统设计基线，后续实现必须围绕以下约束展开：

- 一个角色由可校验的 JSON 配方描述；二进制模型、贴图和动作通过版本化 `assetId` 引用。
- 男女、不同脸型和体型共享同一套语义骨骼、动作片段和指令语言。
- 发型、服装、装饰、武器可以通过插槽热更新，不能改变动作契约。
- Three.js 负责装配、骨骼、表情、IK、二级运动和渲染；离线渲染必须可复现。
- 动画质量用动作状态、固定抽帧和真实镜头验收，编码参数不能替代视觉验收。

## 2. 本次完成内容

重写 `PROPOSAL_UNIVERSAL_3D_HUMANOID_SYSTEM.md`，内容包括：

1. 角色配方、资产 manifest、装配、姿态、动力学和渲染的分层边界。
2. Three.js 的坐标、单位、A-Pose、必选骨骼、挂点和道具局部轴约定。
3. `ModularAvatarSpec` JSON/TypeScript 契约、最简 preset 创建方式和完整角色示例。
4. 脸型 morph、表情叠加、viseme、眨眼和注视的运行时规则。
5. 体型参数、性别语义、插槽式服装、身体遮罩和事务性换装规则。
6. Clip、Pose、Command 三层动作模型，动作图、IK 和时间轴指令 JSON。
7. 固定步长二级运动、碰撞代理、LOD、离线确定性和性能预算。
8. 分阶段实施路线、关键文件规划和可执行的角色/动作/视觉验收门槛。

本次代码落地补充：

- `src/core/models/avatar-command.ts`：移动、注视、动作、说话、表情和挂载指令的 Zod 契约。
- `src/engine/model3d/universal-avatar-3d.ts`：把现有 `ModularAvatarSpec` 转换为 Three.js 3D 人物，执行动作淡入、移动 easing、表情权重、口型、注视和挂件。
- `src/cli/avatar-demo.ts`：用两个 JSON 角色生成离线 Three.js/CPU 光栅动画视频。
- `tests/universal_avatar_3d.test.ts`：验证跨性别角色共享指令和 JSON/运行时状态隔离。
- 角色工厂 ID 可复现；`heightScale`、脸型、服装颜色和 `hurt/smug` 表情会进入模型运行时；时间轴角色 ID 不匹配时会在构造阶段拒绝。
- `package.json`：新增 `pnpm render:avatar-demo` 演示入口。

## 3. 重要设计取舍

- `gender` 是默认外观和声音提示，不是骨骼分叉条件。
- JSON 只描述角色，不保存帧状态和二进制内容。
- 自然语言只能生成候选指令，最终必须经过 schema、资产能力和时间冲突校验。
- 动作库先制作少量高质量基础片段，再用参数、姿态和组合扩展覆盖面。
- 旧的纸片人几何、整张立绘驱动和未经抽帧证明的质量结论不作为新系统设计依据。

## 4. 后续实现验收

- [x] 阶段 A（首版闭环）：角色 schema、预设工厂、指令 schema 和错误诊断。
- [x] 阶段 B（首版闭环）：共享语义骨骼、基础姿态、动作 crossfade 和根节点移动。
- [x] 阶段 C（首版闭环）：表情层、viseme、look-at 和时间轴指令运行时。
- [ ] 阶段 D：固定步长二级运动、碰撞、服装能力声明和 LOD。
- [ ] 阶段 E：正式 GLB 资产、完整 IK、TTS 时间戳 viseme 和真实镜头抽帧验收。

本任务已完成首个可运行闭环。正式 GLB 资产、完整 IK 解算器、Viseme 时间戳文件和更多动作片段仍按阶段 A-E 继续扩展；当前演示使用工程内置的程序化 Three.js 资产，作为运行时契约和动作链路的验证样本。
