# TASK-132: 工业级声明式模块化角色系统全面优化升级 (Asset Registry, Verlet Dynamics, Motion Blending & Auto-Rig Factory)

- 状态: DONE
- 优先级: P0
- 负责人: AI Agent
- 关联模块: `src/core`, `src/engine/puppet/avatar`, `src/db`, `tests`

---

## 1. 调研与行业最佳实践 (Research & Industry Standards)

深度研判 Spine 2D (Slot-Attachment 皮肤机制)、Live2D (部件分层与参数驱动)、VRM (Humanoid 骨骼与 SpringBone 弹簧骨骼) 以及现代游戏模块化角色系统：
1. **Slot-Attachment 抽象**: 骨骼只定义“Where”（位置与运动学），插槽（Slots）定义“What”（当前装备何种部件），换装即换插槽附件，实现零耦合。
2. **多节点 Verlet 积分物理 (Verlet Integration)**: 彻底替换简单的单质点 Euler 弹簧，采用数值极度稳定的多节点粒子链与距离约束（Distance Constraints），支持风场与胶囊碰撞体，发丝与披风大袖自然垂坠随风飘舞。
3. **动画平滑交叉过渡 (Animation Crossfade & Pose Blending)**: 动作切换时在 150~250ms 内进行骨骼姿态插值融合，消除动作跳变。
4. **资产元件插拔式注册中心 (AvatarAssetCatalog)**: 所有服装、发型、面部五官、武器均为独立注册的资产元件，支持程序化矢量生成与外部切片扩展，添加新服饰无需改动引擎代码。
5. **智能角色配方工厂 (AvatarFactory)**: 支持根据小说修仙门派、身份阶级、外貌关键词自动合成完整合法的纯 JSON 角色配置。

---

## 2. 交付清单 (Deliverables)

1. `src/engine/puppet/avatar/verlet-physics.ts`:
   - 具备多质点节点（VerletNode）、固定约束（PinConstraint）、间距约束（DistanceConstraint）、碰撞体（CircleCollider）的多段柔性物理链（长发链、披风链、下摆链）。
2. `src/engine/puppet/avatar/avatar-asset-catalog.ts`:
   - 资产插槽与元件注册中心，支持动态注册/查询服装部件、发型部件、武器法宝，支持调色板着色。
3. `src/engine/puppet/avatar/avatar-factory.ts`:
   - 角色自动装配工厂，根据门派（正道剑修、幽冥魔道、清冷冰仙、炽炎武修、灵动少女、沙雕掌门）或文本提示词一键生成纯 JSON。
4. `src/engine/puppet/avatar/modular-avatar.ts` 全面升级:
   - 集成 Verlet 物理模拟；
   - 集成动作 Crossfade Blending 姿态插值融合；
   - 集成基于 `AvatarAssetCatalog` 的动态插槽解耦渲染。
5. 单元测试与验证:
   - `tests/modular_avatar_advanced.test.ts`: 验证 Verlet 物理链、动作融合插值、资产注册中心动态扩展、工厂自动生成。

---

## 3. 验收标准 (Acceptance Criteria)

- [x] 资产注册中心支持动态注册新部件，换装系统完全由插槽附件驱动 (`AvatarAssetCatalog`)。
- [x] Verlet 多节点物理模拟数值稳定，长发与披风具备平滑自然的受力摆动与阻尼回弹 (`VerletChain`)。
- [x] 动作切换支持平滑插值过渡（Crossfade Blending），无突变顿挫 (`PoseBlendController`)。
- [x] 角色工厂支持一键生成多门派高保真 JSON 角色 (`AvatarFactory`)。
- [x] 全量测试 100% 通过（32 套件，177 项测试 PASS），构建 0 错误。

