# TASK-113: Three.js 纸片人骨骼部件傀儡系统

## 1. 任务元数据
- **任务 ID**: TASK-113
- **状态**: DONE
- **优先级**: P0
- **所属模块**: `src/engine/puppet`
- **依赖任务**: TASK-111

---

## 2. 任务目标
在 Three.js 中实现**分层纸片人傀儡系统（Paper Doll Rig）**。将角色解耦为飞剑、躯干、双臂、头部多层网格，实现 5.5~6 头身修仙成男 35° 御空飞行身姿、手臂骨骼旋转（挥剑/施法）、呼吸起伏律动与朝向翻转（Facing Left/Right）。

---

## 3. 详细设计与实现要求
1. **分层傀儡网格架构 (`src/engine/puppet/puppet-character.ts`)**:
   - `THREE.Group` 树状结构：
     - `WeaponPlane`: 飞剑/法宝层（倾斜角度与青绿剑芒）。
     - `BodyPlane`: 躯干身躯（成男道袍，支持 30°~35° 前倾飞行姿态与上下起伏呼吸律动）。
     - `ArmsPlane`: 双臂图层（支持挥剑劈斩、施法摆动骨骼旋转）。
     - `HeadGroup`: 头部与发髻图层，包含发簪、飞舞长发与面部贴图区域。
2. **动作控制器 (`src/engine/puppet/action-controller.ts`)**:
   - `FlightCruise`: 御剑巡航，身体与飞剑同步正弦波浮动。
   - `AttackSlash`: 拔剑突刺，剑身与手臂旋转前冲。
   - `HurtFlinch`: 受击后仰顿帧与夸张弹性形变。
3. **单元测试 (`tests/puppet_character.test.ts`)**:
   - 验证部件组装配、关节变换与动作插值正确性。

---

## 4. 验收标准
- [x] 角色由分层 Mesh 组成，具备御空飞行动作与呼吸律动（`PuppetCharacter` 5 层分组与 5.5 头身成男御剑巡航姿态）。
- [x] 支持挥剑劈斩 (`attack_slash`)、掐诀施法 (`cast_spell`)、受击后仰 (`hurt_flinch`) 与呼吸律动 (`cruise`/`idle`)。
- [x] 单元测试 100% 通过（9/9 测试通过，全库累计 76 项测试全绿）。
- [x] TypeScript 类型无死角编译通过，导出 .d.ts 声明。

