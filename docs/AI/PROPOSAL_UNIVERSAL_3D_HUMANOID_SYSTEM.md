# 通用 3D 人物与动作系统设计基线

> **适用范围**: `novel2motion` 的 Three.js 人物、表情、换装、动作和指令驱动动画。  
> **设计状态**: `IMPLEMENTED_BASELINE`，已落地 JSON 配方、通用指令运行时和可复现的离线 Three.js 演示；正式 GLB 资产和完整 IK 仍按后续阶段扩展。
> **目标**: 用少量、可校验的 JSON 创建一个稳定的角色，并让同一套动作和指令跨脸型、体型、性别、发型、服装和配饰复用。

这份文档取代之前把纸片人、临时几何体、整张立绘和真正的 3D 人物混在一起的方案。新系统的最小单位是一个带版本号的角色配方，运行时由 Three.js 装配为 `THREE.Group`；角色的视觉资产可以替换，骨骼和动作契约保持稳定。

## 1. 设计结论

### 1.1 核心模型

```text
Character JSON (what the character is)
        |
        v
Avatar Factory (resolve defaults, assets and validation)
        |
        +--> Body / Face / Hair / Outfit / Props (what is equipped)
        +--> Humanoid Rig (where things move)
        +--> Animation Graph (how poses are combined)
        +--> Dynamics + IK (how movement stays believable)
        |
        v
Three.js Object3D + AnimationMixer + deterministic frame update
```

JSON 描述角色和引用，不把 GLB、贴图或动作二进制嵌入 JSON。资产由 `assetId` 和版本解析；这样角色字符串足够短，能存入 KVDB、分镜和 `.n2m` 工程，也能在资产升级后保持可回滚。

### 1.2 必须满足的行为

1. **创建简单**: 只指定 `preset`、少量外观参数和装饰，即可生成合法角色；未指定字段使用确定性的默认值。
2. **动作通用**: 动作只依赖标准骨骼语义和动作参数，不依赖某个角色的网格、衣服或脸型。
3. **指令可组合**: 指令可以控制移动、注视、表情、说话、道具和动作，并能在时间轴上并行或串行执行。
4. **视觉可升级**: 低模占位资产、正式 GLB 和高精度脸部资产使用同一角色 JSON，不需要修改剧本和动作。
5. **帧结果可重现**: 离线渲染使用固定时间步、固定随机种子和显式动作状态，便于缓存、测试和逐帧排查。
6. **失败可解释**: JSON、资产、骨骼映射、动作参数和指令都在进入渲染前校验，并给出路径明确的错误。

当前可运行闭环：`ModularAvatarSpec` 经 Zod 校验后交给 `UniversalAvatar3D`，由 `AvatarCommandTimeline` 驱动移动、注视、动作、表情、口型和挂件，最后通过 CPU Three.js 光栅器编码为 MP4。演示命令为 `pnpm render:avatar-demo`，输出 `output/universal_avatar_demo.mp4`（960x540、24fps、9 秒）。

### 1.3 明确不做的事情

- 不把 `gender` 当作两套不兼容的骨骼或动作系统；它只影响默认体型、声音和外观预设。
- 不用改网格顶点的临时 Canvas 几何体冒充最终 3D 角色。没有正式资产时允许使用可替换的开发占位模型，但必须走同一骨骼接口。
- 不承诺所有动作在所有服装上自动完美。动作系统提供约束、碰撞和验证；极端披风、宽袖或武器需要部件专用修正。
- 不把“动作名称越多”当成质量。质量来自可重定向的基础片段、姿态约束、节奏和二级运动。

## 2. 分层架构与边界

### 2.1 六个运行时层

| 层 | 责任 | 稳定接口 |
| --- | --- | --- |
| 资产层 | 加载 GLB、贴图、材质、动作片段和元数据 | `AvatarAssetCatalog` |
| 配方层 | 解析角色 JSON，补默认值，校验引用 | `ModularAvatarSpecSchema` |
| 装配层 | 创建骨骼、蒙皮网格、脸部、发型、服装和挂点 | `AvatarFactory` |
| 姿态层 | 混合动作、IK、注视、表情和口型 | `AvatarPoseController` |
| 动力学层 | 头发、飘带、衣摆和披风的确定性二级运动 | `SecondaryMotionSolver` |
| 渲染层 | Three.js 材质、灯光、阴影、后处理和离线输出 | `AvatarRenderer` |

每层只通过数据和窄接口通信。比如换一件衣服只更新装配层插槽，不得重新创建动作图；改变脸型只更新形态键，不得改变骨骼名称。

### 2.2 资产包约定

一个正式人物资产包至少包含：

```text
avatar-pack/
  manifest.json          # 资产版本、许可、兼容的 skeletonId
  body.glb               # 蒙皮网格、材质、形态键
  face.glb               # 可选；没有时使用 body.glb 内的脸部
  hair.glb               # 可选的独立发型部件
  outfit/*.glb           # 各服饰插槽部件
  props/*.glb            # 武器、饰品、法宝
  textures/*             # KTX2/PNG 等纹理
  previews/*             # 编辑器缩略图，不参与运行时逻辑
```

`manifest.json` 必须声明 `skeletonId`、单位（米）、前方向（+Z）、上方向（+Y）、休息姿势（A 或 T）、材质通道、形态键名称和每个部件支持的插槽。未经清单登记的资产不能被角色配方直接引用。

## 3. 通用人形骨骼与空间约定

### 3.1 坐标、单位和休息姿势

- 世界单位为米；角色默认脚底位于 `y = 0`，身高由 `body.height` 决定。
- Three.js 场景使用 `+Y` 向上、`+Z` 朝角色正面、`+X` 朝角色左侧；导入器负责把外部资产转换到这一约定。
- 标准休息姿势为轻微 A-Pose。手臂自然下垂比 T-Pose 更适合服装、肩部和对白镜头；动作导出前统一转换到同一 rest pose。
- 骨骼局部旋转使用四元数；禁止依赖欧拉角顺序作为跨资产契约。

### 3.2 必选骨骼

```text
root
└── hips
    ├── spine
    │   ├── spine_1
    │   │   └── chest
    │   │       ├── neck
    │   │       │   └── head
    │   │       │       ├── eye_l / eye_r
    │   │       │       └── jaw
    │   │       ├── shoulder_l -> upper_arm_l -> lower_arm_l -> hand_l
    │   │       └── shoulder_r -> upper_arm_r -> lower_arm_r -> hand_r
    │   └── (optional chest twist)
    ├── upper_leg_l -> lower_leg_l -> foot_l -> toe_l
    └── upper_leg_r -> lower_leg_r -> foot_r -> toe_r
```

手指使用 `thumb/index/middle/ring/little` 加 `1/2/3` 三节命名；前臂和上臂可以有 `twist_01`、`twist_02` 辅助骨，但动作不得依赖辅助骨。头发、衣摆和飘带骨属于 `secondary` 分组，不能被基础动作直接引用。

### 3.3 挂点和局部轴

挂点是骨骼下的空 `Object3D`，位置和朝向属于资产元数据：

```text
socket_head_top, socket_face, socket_hand_l, socket_hand_r,
socket_back, socket_waist_l, socket_waist_r,
socket_foot_l, socket_foot_r, socket_ground
```

道具统一定义 `grip`、`forward` 和 `up` 局部轴。装备系统只需要把道具的 `grip` 对齐到 socket，不允许在剧本中写一串角色专属欧拉角。

## 4. 角色配方 JSON

### 4.1 设计原则

角色 JSON 分为三种数据：

1. **身份与默认值**: `id`、`name`、`preset`、`gender`、`style`。
2. **可见外观**: `body`、`face`、`hair`、`outfit`、`props`。
3. **运行时偏好**: `voice`、`motionProfile`、`physics`。

运行时状态（当前动作时间、IK 解、当前表情权重、物理粒子位置）不能写回角色配方；它们属于镜头实例或渲染帧状态。

### 4.2 TypeScript 契约

下面的接口是实现方向，最终以 Zod schema 为运行时唯一校验入口。所有枚举都应允许资产目录扩展，但基础枚举必须有稳定语义。

```ts
type Gender = "male" | "female" | "unspecified";
type CharacterStyle = "donghua" | "anime" | "realistic" | "chibi";
type BodyPreset = "adult" | "youth" | "elder" | "athletic" | "muscular" | "chibi";

interface ModularAvatarSpec {
  schemaVersion: "1.0";
  id: string;
  name: string;
  preset?: string;
  gender: Gender;
  style: CharacterStyle;
  body: {
    baseAssetId: string;
    preset?: BodyPreset;
    height: number;                 // 1.35 ~ 2.20 m
    proportions?: {
      head: number; shoulder: number; chest: number; waist: number;
      hip: number; arm: number; leg: number; muscle: number;
    };
    skin: { tone: string; roughness?: number; blush?: number };
  };
  face: {
    assetId?: string;
    shapePreset: string;
    morphs?: Record<string, number>; // 由资产 manifest 声明，范围默认 -1..1
    eyes?: { iris: string; sclera?: string; liner?: number };
  };
  hair: {
    assetId: string;
    color: string;
    accentColor?: string;
    physics?: "off" | "light" | "full";
  };
  outfit: {
    inner?: string;
    top: string;
    bottom?: string;
    shoes?: string;
    cloak?: string;
    palette?: Record<string, string>;
  };
  props?: Array<{
    assetId: string;
    socket: string;
    visible?: boolean;
    scale?: number;
  }>;
  voice?: { provider: string; voiceId: string; rate?: number; pitch?: number };
  motionProfile?: { style?: string; stride?: number; gesture?: number; energy?: number };
  physics?: { quality: "off" | "preview" | "final"; windScale?: number; seed?: number };
}
```

约束要点：`id` 只允许稳定的 ASCII 标识；颜色统一为 `#RRGGBB` 或资产调色板键；数值在 schema 中夹逼；引用的 `assetId`、`socket`、`morphs` 必须能在同一版本资产目录中解析。未知字段默认拒绝，便于尽早发现拼写错误。

### 4.3 易创建配方

用户可以从完整 JSON 开始，也可以使用工厂输入：

```json
{
  "schemaVersion": "1.0",
  "id": "char_yun_qi",
  "name": "云漪",
  "preset": "female_fairy",
  "gender": "female",
  "style": "donghua",
  "body": {
    "baseAssetId": "body_humanoid_v1",
    "height": 1.68,
    "proportions": { "head": 1.02, "shoulder": 0.92, "chest": 0.98, "waist": 0.86, "hip": 1.02, "arm": 0.94, "leg": 1.08, "muscle": 0.22 },
    "skin": { "tone": "#F4D6C8", "roughness": 0.58, "blush": 0.18 }
  },
  "face": {
    "shapePreset": "oval_soft",
    "morphs": { "jawWidth": -0.12, "eyeSize": 0.08, "chinLength": 0.02 },
    "eyes": { "iris": "#4A6A82", "liner": 0.2 }
  },
  "hair": { "assetId": "hair_long_ponytail_v2", "color": "#20202A", "physics": "full" },
  "outfit": {
    "top": "outfit_cloud_robe_v2",
    "bottom": "outfit_cloud_skirt_v1",
    "shoes": "shoes_soft_boot_v1",
    "palette": { "primary": "#7995C8", "trim": "#D7B46A" }
  },
  "props": [{ "assetId": "prop_jade_hairpin_v1", "socket": "socket_head_top" }],
  "motionProfile": { "style": "calm_graceful", "stride": 0.96, "gesture": 1.08, "energy": 0.72 },
  "physics": { "quality": "final", "windScale": 0.8, "seed": 17 }
}
```

最简创建入口可以接受 `preset + overrides`，并输出完整、规范化的 JSON：

```ts
const spec = AvatarFactory.create({
  id: "char_yun_qi",
  preset: "female_fairy",
  overrides: { hair: { assetId: "hair_long_ponytail_v2" }, outfit: { top: "outfit_cloud_robe_v2" } }
});
```

工厂必须是纯函数式的：相同输入、资产目录版本和随机种子得到相同 JSON，不通过隐式全局状态改变角色外观。

## 5. 脸型、表情和口型

### 5.1 脸部由几何和形态键负责

正式脸部资产至少提供以下形态键组，具体网格可以扩展：

```text
face_jaw_width, face_chin_length, face_cheek_volume,
eye_open_l/r, eye_squint_l/r, brow_inner_up_l/r,
brow_outer_down_l/r, mouth_smile_l/r, mouth_frown_l/r,
mouth_open, mouth_pucker, jaw_open
```

`face.shapePreset` 只选择基础脸型；细节通过 morph 权重表达。颜色、妆容、眼睛高光属于材质参数，不能用动作贴图替代真实口型。

### 5.2 表情层和优先级

表情不是一个互斥枚举，而是按层合成：

```text
base (neutral)
  + emotion (happy / angry / sad / fear / surprise)
  + speech (viseme + jaw)
  + gaze (eye aim + blink)
  + acting override (镜头或指令临时覆盖)
```

每个通道有 `weight`、`fadeIn`、`fadeOut` 和优先级。说话只影响嘴、下颌和少量头部节奏，不得覆盖眼神和正在播放的情绪。受击等强制表演可以在指定时间窗临时覆盖基础姿态，结束后回到动作图。

### 5.3 Viseme 契约

引擎内使用跨语言稳定的最小集合：`sil`、`aa`、`ee`、`ih`、`oh`、`ou`、`mm`、`fv`、`th`。TTS 或外部口型数据先映射到这个集合，再使用音频时间戳或音素时间戳驱动。没有时间戳时使用音量包络作为低质量回退，并标记 `approximate: true`，避免把回退结果误认为精确口型。

眨眼、呼吸和视线属于自动行为控制器，默认使用可配置的随机种子和时间间隔；镜头特写可以通过指令锁定视线目标或关闭自动眨眼。

## 6. 体型、性别和换装

### 6.1 体型参数

动作重定向依赖骨骼长度，外观差异依赖形态键和有限的骨骼比例缩放。推荐使用少量有语义的参数：

```text
height, head, shoulder, chest, waist, hip, arm, leg, muscle
```

工厂将这些参数编译为骨骼长度比例、身体 morph 和服装适配值。所有参数有安全范围；超过范围时返回校验错误或明确的 clamp 记录，不能静默拉伸导致关节脱位。

`male`、`female` 和 `unspecified` 只作为默认外观与声音提示。任何人都可以选择任意体型预设、服装和发型；动作库只读取骨骼能力和动作参数。

### 6.2 插槽式服装

服装按插槽装配：`inner`、`top`、`bottom`、`shoes`、`cloak`、`head`、`hand`。每个服装部件声明：

- 兼容的 `skeletonId` 和 rest pose；
- 覆盖的身体区域 mask（例如隐藏小腿皮肤）；
- 蒙皮骨骼集合和可选辅助骨骼；
- 碰撞代理和最大安全动作范围；
- 允许的材质参数和颜色槽。

换装只替换插槽附件并重新计算遮罩、碰撞和材质，不重建角色的动作图。运行时更新必须是事务性的：全部部件解析成功才提交，失败则保留旧装扮。

## 7. 动作系统：从动作片段到指令

### 7.1 三类数据

1. **Clip**: glTF/Three.js 的骨骼关键帧，例如 `idle`, `walk`, `slash`。
2. **Pose**: 少量可参数化的目标姿态，例如手势、注视、脚底接触点。
3. **Command**: 在时间轴上安排 clip、pose、表情、音频和道具事件。

动作库以 12~20 个高质量基础片段起步，再通过参数和组合覆盖更多场景。基础片段建议包含：`idle`、`walk`、`run`、`turn`、`talk`、`gesture`、`draw_weapon`、`attack`、`cast`、`defend`、`hit_react`、`fall`、`fly`、`land`。每个片段都要有标签：根运动、手部占用、道具需求、镜头适用范围、循环点和可混合邻居。

### 7.2 动作图

```text
Locomotion (idle / walk / run)
        + UpperBody (talk / gesture / attack)
        + Additive (breath / recoil / style)
        + IK (feet / hands / look-at)
        + Face (emotion / viseme / blink)
        + Secondary Motion (hair / cloth)
```

层之间使用明确的骨骼 mask。行走时只覆盖腿、骨盆和根运动；说话覆盖胸腔、手臂和头部的少量节奏；攻击可以暂时锁定双手和道具，但不应把脚底 IK 清掉。动作切换默认使用 120~240ms crossfade，攻击命中、落地和受击等事件可以使用动画标记切换，而不是根据帧号猜测。

### 7.3 指令 JSON

指令使用统一时间单位毫秒，支持 `at`、`duration`、`easing`、`track` 和 `id`。同一 track 的事件按时间排序，不同 track 可并行。

```json
{
  "characterId": "char_yun_qi",
  "commands": [
    { "id": "enter", "type": "moveTo", "at": 0, "duration": 1200, "to": { "x": -1.2, "z": 0 }, "easing": "easeOutCubic" },
    { "id": "look", "type": "lookAt", "at": 300, "duration": 700, "target": "character:enemy", "weight": 0.8 },
    { "id": "talk", "type": "speak", "at": 1400, "duration": 2600, "audioId": "tts_yun_qi_01", "visemes": "asset://viseme_yun_qi_01.json" },
    { "id": "gesture", "type": "play", "at": 1500, "duration": 2200, "clip": "gesture_explain", "layer": "upperBody", "blendIn": 180, "blendOut": 220 },
    { "id": "emotion", "type": "expression", "at": 1500, "duration": 2400, "name": "calm_confident", "weight": 0.75 },
    { "id": "handProp", "type": "attach", "at": 4200, "socket": "socket_hand_r", "assetId": "prop_jade_fan_v1" }
  ]
}
```

常用文本指令可以先解析为同一个结构：

```text
云漪走到敌人左侧，停下，看向敌人，平静说“你终于来了”，然后抬手结印。
```

解析器只负责生成候选指令；资产能力、动作参数和时间冲突由编译器校验。自然语言不能绕过 schema，也不能直接执行任意 JavaScript。

### 7.4 IK 与约束

- 双脚 IK 保证脚底接触地面、台阶或飞剑；骨盆高度和膝盖 pole target 随支撑面求解。
- 手部 IK 只在动作声明需要时启用，例如握剑、指向目标、双手结印；默认保留原动画的手部细节。
- 头部 look-at 使用眼睛、头、颈三级权重，并设最大偏转角；目标丢失时平滑回到镜头或动作默认方向。
- 约束失败返回诊断（目标不可达、骨骼缺失、道具未挂载），渲染器可选择降级为原关键帧。

## 8. 二级运动与碰撞

### 8.1 求解模型

头发、飘带、袖口和披风使用独立的 `secondary` 链。预览和离线渲染都采用固定步长（例如 1/60 秒），每帧先更新主骨骼，再执行二级运动，再应用碰撞约束，最后写回辅助骨骼。

推荐的默认求解顺序：

```text
previous pose -> animation pose -> IK -> Verlet/constraint solve -> collision projection -> bone matrices
```

参数控制运动风格而不是资产差异：`stiffness`、`damping`、`gravity`、`windResponse`、`maxStretch`。固定种子只用于可控风场和轻微扰动；不允许每帧调用不可复现的随机函数。

### 8.2 碰撞和性能

头、肩、胸、背和武器使用球体或胶囊体代理。碰撞优先保证发束和衣摆不穿入身体，必要时允许视觉上略微浮起。最终质量使用少量迭代约束，预览质量减少迭代和链节点数；角色离镜头较远时切换为低节点 LOD 或关闭模拟。

## 9. Three.js 实现边界

### 9.1 运行时对象

```text
AvatarRoot (THREE.Group)
├── SkinnedBody (THREE.SkinnedMesh)
├── FaceMeshes (morphTargetInfluences)
├── OutfitSlots (THREE.Group per slot)
├── PropSockets (THREE.Object3D)
├── SecondaryBones (hidden control data + visible bones)
└── Debug (optional, disabled in render)
```

使用 `GLTFLoader` 加载 GLB，`AnimationMixer` 播放基础 clip；资产重定向和骨骼名称映射在装配阶段完成。Three.js 场景只保存对象和当前帧状态，角色 JSON、动作命令和资产清单由上层持有。

### 9.2 材质策略

材质分为 `toon`、`pbr` 和 `unlit` 变体，角色配方只选择风格和参数，不绑定具体 shader 实现。Toon 变体可以使用阶梯光照、柔和描边、眼睛高光和发丝高光；没有完整后处理或无头环境不支持某效果时，必须提供可接受的降级材质。

皮肤、眼睛和头发应使用独立材质区域，避免用一张大贴图覆盖脸部表情。描边宽度、阴影阈值和高光强度按相机距离做有限范围的调整，避免近景闪烁和远景变黑。

### 9.3 离线渲染一致性

渲染器每帧按以下顺序执行：

1. 读取时间轴事件并更新动作、表情和道具；
2. 以固定步长推进 IK 和二级运动；
3. 更新 `AnimationMixer`、世界矩阵和材质 uniform；
4. 渲染 Three.js 场景并交给现有编码器。

相同的角色 JSON、资产目录版本、命令时间轴、渲染设置和随机种子必须得到相同的动画状态。缓存 key 至少包含这些输入的哈希。

## 10. 质量门槛与验收

### 10.1 角色契约验收

- 完整 JSON 能通过 schema；最简 `preset + overrides` 能补全为完整 JSON。
- 所有资产引用存在、版本兼容、插槽唯一、挂点有效。
- 身高、比例、形态键和颜色越界会返回路径明确的错误。
- 序列化后再解析得到等价对象，字段顺序不影响哈希。

### 10.2 动作验收

- 同一 `idle`、`walk`、`talk`、`attack`、`hit_react` 能在至少一男一女、至少两种体型上运行。
- 切换动作没有瞬移、四元数翻转、脚底明显漂浮或根运动累积漂移。
- 说话时口型与音频时间轴对齐；无口型数据时能明确降级。
- look-at、手部 IK、脚部 IK 的不可达情况可诊断且不会让渲染崩溃。

### 10.3 视觉验收

- 远景、中景、面部特写都保留完整头发、头饰和脚底关键道具的构图安全区。
- 换发型、换衣服、换配饰不改变脸型和动作；换脸型和体型不改变动作指令。
- 发尾、袖口和披风在启动、停止、转身、攻击和受击后有可见的延迟与回弹，但不会持续发散。
- 预览和离线输出的动作节奏一致；抽帧能够观察到骨骼、表情和二级运动确实在变化。

### 10.4 性能预算（首版目标）

| 项目 | 预览目标 | 离线高质量目标 |
| --- | ---: | ---: |
| 可见角色数 | 8 | 4 |
| 单角色三角面 | 25k（LOD0） | 60k（LOD0） |
| 贴图总显存 | 64 MB 内 | 160 MB 内 |
| 二级链节点 | 64 | 160 |
| 每帧二级求解 | 1 ms 内 | 不设实时要求，结果确定 |

这些是工程预算，不是成片质量保证；最终视觉以抽帧和镜头验收为准。

## 11. 实施路线

### 阶段 A：契约和资产验证

实现 `ModularAvatarSpecSchema`、资产 manifest、`AvatarAssetCatalog` 和完整的错误报告。准备一个男女基础体、一个发型、两套服装和一个道具，先验证装配和换装闭环。

**出口条件**: 两个角色 JSON 在同一场景中生成，JSON 导出/导入等价，未知资产和非法 morph 能在渲染前失败。

### 阶段 B：骨骼、重定向和基础动作

实现标准骨骼检查、rest pose 转换、clip 映射、动作 mask、crossfade、根运动和脚底 IK。先做 `idle/walk/talk/attack/hit_react` 五个可观测动作，再扩充动作库。

**出口条件**: 至少四种体型共享动作，连续播放 30 秒无明显脚滑、漂移和姿态爆炸。

### 阶段 C：脸部和指令编译

实现表情层、viseme 映射、眨眼、look-at，以及 `play/moveTo/lookAt/speak/expression/attach` 指令编译器。

**出口条件**: 一段指令 JSON 能同时驱动移动、注视、表情、口型和道具，并能在离线渲染中复现。

### 阶段 D：二级运动和服装适配

实现固定步长二级运动、胶囊碰撞、部件遮罩、服装动作能力声明和 LOD。为长发、披风、大袖各准备一套测试部件。

**出口条件**: 启停、转身、攻击、落地四类场景稳定；预览和离线输出状态一致；超出能力范围时有诊断。

### 阶段 E：资产生产和镜头验收

补齐正式男女基础体、脸型、发型、服装、装饰和道具，建立角色预设工厂。以真实分镜抽帧验收面部特写、全身动作、换装和多人对峙，不以“测试通过”替代视觉验收。

## 12. 关键文件规划

```text
src/core/models/modular-character.ts       # Zod 契约和 JSON 类型
src/engine/puppet/avatar/avatar-factory.ts # 默认值、资产解析、装配
src/engine/puppet/avatar/universal-skeleton.ts
src/engine/puppet/avatar/avatar-pose-controller.ts
src/engine/puppet/avatar/motion-graph.ts
src/engine/puppet/avatar/face-controller.ts
src/engine/puppet/avatar/secondary-motion-solver.ts
src/engine/puppet/avatar/avatar-asset-catalog.ts
src/engine/puppet/avatar/command-compiler.ts
src/engine/puppet/avatar/preset-avatars.ts
tests/avatar-contract.test.ts
tests/avatar-motion-integration.test.ts
tests/avatar-determinism.test.ts
```

文件名是模块边界建议，落地时应优先复用现有接口，避免为了改名产生无关重构。已有的旧类只有在通过契约、动作和渲染验收后才能成为实现的一部分；历史文档中的“真人脸贴图”“纸片人几何体”和未经抽帧证明的质量结论不属于本设计基线。

## 13. 设计决策摘要

| 决策 | 原因 |
| --- | --- |
| JSON 是角色配方，资产通过版本化 ID 引用 | 可读、可缓存、可热更新、不会把二进制塞进剧本 |
| 一套语义骨骼，体型通过比例和 morph 表达 | 让男女和不同体型共享动作，减少重定向分支 |
| 动作由 clip、pose、command 三层组成 | 既能复用高质量关键帧，也能用指令编排复杂表演 |
| 表情按层叠加 | 口型、情绪、视线和临时表演可以同时存在 |
| 固定步长二级运动 | 预览、离线渲染和缓存结果保持一致 |
| 能力声明和诊断优先 | 服装、武器和极端比例的失败可定位、可降级 |
| 质量以抽帧和可观察状态验收 | 编码参数和单元测试不能证明动画看起来正确 |

这套基线允许先用少量可靠资产完成完整闭环，再持续增加脸型、体型、发型、服装、道具和动作，而不需要重新设计角色格式或指令语言。
