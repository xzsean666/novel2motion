# TASK-131: 全新模块化人物建模与装配体系重构 (Modular Character Assembly & Universal Motion Rig System)

- 状态: DONE
- 优先级: P0
- 负责人: AI Agent
- 关联模块: `src/core`, `src/engine/puppet/avatar`, `src/engine/puppet`, `src/renderer`, `src/db`, `tests`

---

## 1. 任务背景与用户诉求诊断 (User Intent & Diagnosis)

用户明确指出对当前角色体系的根本性重构诉求：
> “我要完全重构这个人物的建模体系，他们有通用的动作，面部有不同风格建模，身体也有男女各种情况建模我尽量是通用，人物靠不同装饰头发，衣服来区别，而不是现在这种。然后你帮我富化一下设计，后续我的动画都围绕这个来。我一个人就是一串json，然后服装这些都可以不断更新，这样动画效果会更好。”

### 1.1 痛点诊断
1. **角色耦合度过高**: 以前角色每个都绑定死板的完整立绘，换件衣服或发型必须重新画整张图，无法实现资产复用与工业化量产。
2. **动作无法真正跨角色通用**: 缺乏统一的标准化骨骼层级（Rig Hierarchy）与挂接点（Sockets），导致不同体型角色做动作比例失调。
3. **面部缺乏多风格体系**: 面部表现仅靠固定的几何贴图，缺少不同艺术风格（玄幻国风写实、日式精致动漫、国漫热血动作、Q版幽默等）的解耦建模与动态音素口型支持。
4. **缺乏二级动力学**: 头发、大袖、下摆、披风缺乏随骨骼惯性和环境气流联动的柔性物理层，导致动画表现生硬。

---

## 2. 富化架构设计 (Enriched Architectural Specification)

### 2.1 角色即 JSON 规范 (Declarative Avatar JSON Schema)
定义统一的 `ModularAvatarSpec` 契约，一个人即是一串纯 JSON：
- `id`, `name`, `gender`, `description`
- `archetype`: 男女与多体型基础骨骼拓扑
  - `male_adult`: 成男（修仙剑尊、沉稳霸气）
  - `female_adult`: 成女（仙子掌门、清冷飘逸）
  - `male_youth`: 少年（宗门少年、热血坚毅）
  - `female_youth`: 少女（灵动师妹、长裙若蝶）
  - `male_muscular`: 体修力士（魁梧健硕、沉稳如山）
  - `male_elder`: 仙翁长者（鹤发童颜、仙风道骨）
  - `chibi_universal`: Q版沙雕萌系
- `face`: 多风格面部建模规范
  - `style`: `xianxia_real` | `anime_modern` | `donghua_action` | `chibi_comedy`
  - `shape`, `skinTone`, `eyes`, `eyebrows`, `nose`, `mouth`
  - 动态音素口型支持 (`Viseme`: silence, a, i, u, e, o, m)
  - 微表情通道 (`blinking`, `expression`, `sweat`, `anger_vein`, `blush`)
- `hair`: 模块化发型（前发刘海、发冠发髻、后发垂发、飘逸发缕，含二级动力学物理参数）
- `costume`: 多层模块化服饰
  - `inner`: 底层内衬
  - `outer`: 外袍/法袍/便服/战甲
  - `sash`: 腰带、环佩玉带
  - `cloak`: 披风/斗篷（支持风力与惯性飘摆）
  - `bottom`: 下裳/裤裙
  - `shoes`: 云履/战靴
  - `armor`: 肩甲/护腕/胸铠
- `sockets`: 标准化装备与挂接系统
  - `hand_r`: 主手持物（飞剑、神兵、折扇）
  - `hand_l`: 副手持物（法印、灵符、盾牌）
  - `back`: 背后背负（剑匣、功德金轮、雷鹏羽翼）
  - `head_top`: 发冠、凤钗、灵玉冠
  - `waist`: 腰悬储物袋、通灵古玉
  - `aura`: 护体剑意/煞气流光
- `dynamics`: 物理飘动参数（刚度 stiffness、阻尼 damping、风力响应 windSensitivity）
- `voice`: 声音与音色配置

### 2.2 通用动作库 (Universal Motion Library)
基于标准骨骼拓扑输出的归一化姿态（Normalized Poses）：
- `idle`: 静立呼吸与衣摆微风轻拂
- `hover_flight`: 御剑/乘虚破空疾行（身姿倾角、披风大袖受风力拉伸）
- `dialogue_calm`: 沉静交谈，颔首示礼
- `dialogue_intense`: 激昂对峙，身姿前倾
- `draw_sword`: 拔剑出鞘，剑芒流转
- `slash_strike`: 腾空挥剑大劈斩，弧光破空
- `cast_mudra`: 捏指掐诀施法，护体气浪激荡
- `barrier_defend`: 结印防御，罡气阻隔
- `flinch_hit`: 受击震退踉跄
- `shocked_retreat`: 骇然瞪目，疾退戒备
- `bow_salute`: 拱手作揖执礼
- `laugh_arrogant`: 狂妄仰天大笑

---

## 3. 交付清单 (Deliverables)

1. `src/core/models/modular-character.ts`:
   - 完备的 Zod Schema 与 TypeScript 类型定义（`ModularAvatarSpec`、`BodyArchetype`、`FaceStyle`、`CostumeLayer`、`SocketAttachment`）。
2. `src/engine/puppet/avatar/`:
   - `universal-skeleton.ts`: 标准通用骨骼树与挂载点架构。
   - `face-mesh-builder.ts`: 多风格面部建模与 Viseme 动画渲染。
   - `modular-costume-rig.ts`: 模块化服装与发型装配层，集成二级动力学物理计算。
   - `modular-avatar.ts`: 纯 JSON 驱动装配器，组合骨骼、面部、服饰与动作。
   - `preset-avatars.ts`: 开箱即用的精品 JSON 角色预设（韩天尊、紫菱仙子、极阴老祖、热血少年等）。
3. `src/engine/puppet/avatar/universal-motion-library.ts`:
   - 通用动作库，完美适配各类体型。
4. 渲染器与上层整合:
   - 适配 `PuppetCharacter`、`CharacterRegistry` 与 `HeadlessRenderer`。
5. 单元与集成测试:
   - `tests/modular_avatar.test.ts`：验证 JSON 解析、骨骼装配、不同体型、不同面部风格、动态换装、二级动力学、通用动作驱动。

---

## 4. 验收标准 (Acceptance Criteria)

- [x] 完整支持纯 JSON 声明式角色定义，Schema 校验严格且灵活 (`ModularAvatarSpecSchema`)。
- [x] 覆盖男女及各类体型（成男、成女、少年、少女、力士、仙翁、Q版），具备通用骨骼架构 (`UniversalSkeleton`)。
- [x] 面部系统解耦，支持多种不同艺术风格（玄幻国风、二次元现代、国漫热血、Q版沙雕），口型与微表情支持动态驱动 (`FaceMeshBuilder`)。
- [x] 服装、发型、配饰完全模块化，支持在运行时通过修改 JSON 字段即时热更新换装 (`ModularCostumeRig`, `avatar.updateCostume`)。
- [x] 发丝与衣袍具备随动作与气流变化的自然二级动力学 (`SpringPoint`, `updateDynamics`)。
- [x] 通用动作库能无缝作用于不同角色与体型 (`UniversalMotionLibrary`, 12 种标准动作)。
- [x] 所有测试 100% 通过（31 套件，170 项测试通过），`pnpm build` 与 `pnpm typecheck` 0 错误。

