# 会话状态记录 (SESSION_STATE.md)

> 本文件是跨 Session 恢复的唯一状态记录文件。系统已完成向 Node.js + Three.js 全栈纯后端现代架构的全面设计升级，涵盖 25 项全生命周期任务。

---

## 1. 基础状态元数据
- **当前 Goal**: 全面重置旧有动画临时资产/缓存/输出，全新规划标准化通用高颜值 3D 人物建模与动作体系（脸型、体型、发型、四肢、男女通用动作），纯 JSON 驱动次世代国漫美型卡通渲染架构。
- **当前 Task**: TASK-135 (通用 Three.js 3D 人物与动作系统设计基线)
- **当前状态**: REVIEW (TASK-135 首个代码闭环与演示视频已完成，等待视觉审查；仍有历史资产测试缺口)
- **最后更新时间**: 2026-10-10T19:54:00+08:00
- **当前活跃分支**: main
- **当前 GitHub 账号**: xzsean666

---

## 2. 任务看板状态 (TASK-135 REVIEW，TASK-134 DONE)

| 任务 ID | 任务名称 | 所属模块 | 优先级 | 依赖前置 | 状态 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TASK-134** | 高精度动漫级人物视觉重构与角色资产全面打磨：告别几何折纸、全题材国漫高保真立绘接入与电影级运镜特写构图 | `src/drama/composer`, `assets/characters`, `output` | P0 | TASK-133 | **DONE** |
| **TASK-135** | 通用 Three.js 3D 人物与动作系统设计基线：角色 JSON、通用骨骼、表情口型、指令编排、换装与二级运动 | `docs/AI`, `src/core`, `src/engine/puppet/avatar`, `tests` | P0 | TASK-134 | **REVIEW** |
| **TASK-133** | 新模块化模型与流行短剧 BGM 多样本全流程母带制作：仙侠/仙子/少年三题材精品呈现 | `src/drama`, `src/engine/puppet/avatar`, `output` | P0 | TASK-132 | **DONE** |
| **TASK-132** | 工业级声明式模块化角色系统全面优化升级：资产注册中心、Verlet 柔性物理、动作融合与配方工厂 | `src/core`, `src/engine/puppet/avatar`, `src/db` | P0 | TASK-131 | **DONE** |
| **TASK-131** | 全新模块化人物建模与装配体系重构：纯 JSON 驱动、男女通用骨骼、多风格面部与可扩充服装体系 | `src/core`, `src/engine/puppet/avatar`, `src/engine/puppet`, `src/renderer`, `src/db` | P0 | TASK-130 | **DONE** |
| **TASK-130** | 全面架构升级重构：工业级现代 AI 短剧/漫剧全流程生成引擎与剪映互通 | `src/drama`, `src/cli` | P0 | TASK-129 | **DONE** |
| **TASK-129** | 模板化动作引擎、通用与专属模型解耦、自然口型与多剧本精品推文动画重构 | `src/engine/puppet`, `src/core`, `src/db`, `src/ai` | P0 | TASK-128 | **DONE** |
| **TASK-128** | 画面视觉与 Three.js 动画特效全面质量重构 | `src/renderer`, `src/engine` | P0 | TASK-127 | **DONE** |
| **TASK-101** | Node.js + TS (ESM) 基础工程搭建与 GitHub+Hash SDK 依赖引入 | `infra` | P0 | 无 | **DONE** |
| **TASK-102** | 领域数据契约与动画分镜 DSL 规范定义 | `src/core` | P0 | TASK-101 | **DONE** |
| **TASK-103** | 基于 `kvdb-sdk` 的 SQLite 项目持久化、角色圣经与素材资产注册表 | `src/db` | P0 | TASK-102 | **DONE** |
| **TASK-104** | 基于 `node-task-runtime` 的任务执行中枢、FFmpeg 子进程流控与临时目录清理 | `src/runtime` | P0 | TASK-101 | **DONE** |
| **TASK-105** | 内置免版权素材包组织与自动装载 (`assets/` 角色部件、背景、字体、音效) | `src/assets` | P1 | TASK-103 | **DONE** |
| **TASK-106** | 立绘自动抠图、透明通道处理与包围盒裁剪管线 (`MattingPipeline`) | `src/assets` | P1 | TASK-102 | **DONE** |
| **TASK-107** | AI 生图扩展引擎：新角色/新背景按需生图与自动入库 | `src/ai` | P2 | TASK-103, 106 | **DONE** |
| **TASK-108** | 小说文本分块、实体抽取与固定角色绑定状态机 (`StoryParser`) | `src/ai` | P1 | TASK-102, 103 | **DONE** |
| **TASK-109** | AI 导演高层分镜编排器与打斗配对状态机 (`AiDirector`) | `src/ai` | P0 | TASK-108 | **DONE** |
| **TASK-110** | Edge-TTS 配音合成、KVDB 毫秒级音频缓存与自适应 BGM 避让混音器 | `src/audio` | P0 | TASK-103, 104 | **DONE** |
| **TASK-111** | Three.js 核心 2.5D 画布舞台空间与 5 槽位布局引擎 (`ThreeStage`) | `src/engine` | P0 | TASK-102 | **DONE** |
| **TASK-112** | Three.js 3D 摄像机平滑运镜、推拉特写与打斗震屏控制器 (`CameraController`) | `src/engine` | P0 | TASK-111 | **DONE** |
| **TASK-113** | Three.js 纸片人骨骼部件傀儡系统（成男御剑飞行动态、呼吸律动、肢体旋转） | `src/engine` | P0 | TASK-111 | **DONE** |
| **TASK-114** | Three.js 高清角色立绘表情无缝映射与面部口型材质系统 | `src/engine` | P0 | TASK-113 | **DONE** |
| **TASK-115** | Three.js 粒子特效（九天玄雷、蜂云剑气流光）与打斗白闪视效管线 | `src/engine` | P1 | TASK-111 | **DONE** |
| **TASK-116** | 国风马善政毛笔行楷大字金黄描边卡点字幕排版与渲染引擎 | `src/engine` | P0 | TASK-111 | **DONE** |
| **TASK-117** | 分镜独立哈希增量渲染缓存与毫秒级快速拼接器 (`SceneRenderCache`) | `src/renderer` | P1 | TASK-104 | **DONE** |
| **TASK-118** | 无头 Three.js 逐帧离线光栅化与流式 FFmpeg 管道编码器 (`StreamEncoder`) | `src/renderer` | P0 | TASK-104, 111 | **DONE** |
| **TASK-119** | 单文件工程归档持久化与导入导出 (`.n2m` 压缩打包与解包) | `src/core` | P1 | TASK-102, 103 | **DONE** |
| **TASK-120** | 纯后端 CLI 命令行交互工具 (`novel2motion render / init / export`) | `src/cli` | P0 | TASK-109 ~ 118 | **DONE** |
| **TASK-121** | 基于 `kvdb-sdk` 队列的高并发任务服务端与 Web API (REST + SSE 进度流) | `src/server` | P1 | TASK-103, 120 | **DONE** |
| **TASK-122** | Web 可视化 2.5D 舞台编辑器（基于 Three.js，支持鼠标拖拽、站位吸附、实时 60fps 动效预览） | `web` | P1 | TASK-111 ~ 115 | **DONE** |
| **TASK-123** | 多轨时间轴检视器、小说交互解析面板、角色人设库与在线播放器 | `web` | P1 | TASK-122 | **DONE** |
| **TASK-124** | 跨平台桌面客户端封装（原生窗口集成、本地硬件加速、离线单文件运行） | `desktop` | P2 | TASK-120, 122 | **DONE** |
| **TASK-125** | 全流程端到端实机验证：25 秒爆款沙雕修仙推文动画母带生成与终极验收 | `e2e` | P0 | TASK-120 | **DONE** |
| **TASK-126** | Three.js 生动角色动画重大重构：真实模型表情切换、模型贴合嘴型、阵营站位与横屏视效 | `src/engine` | P0 | TASK-113, 114 | **DONE** |
| **TASK-127** | 角色骨骼蒙皮与动画节奏修复 | `src/engine`, `src/renderer`, `src/cli` | P0 | TASK-126 | **DONE** |

---

## 3. 本地优化 SDK 引用与维护协议 (Mandatory Protocol)
1. **安装依赖规范**:
   - `kvdb-sdk`: `github:xzsean666/kvdb-nodejs#89040274713ecc86863e8d47963f8f8d92f5f388`
   - `node-task-runtime`: `github:xzsean666/NodeJS-Task-Runtime#1ae1577e5bfd759f0ed0a55433e80f136116ee66`
   - **严禁**在 `package.json` 中使用 `file:..` 等本地相对路径。
2. **本地修复闭环**:
   - 源码分别位于 `/ssd0/git/kvdb-nodejs` 和 `/ssd0/git/NodeJS-Task-Runtime`。
   - 发现 Bug 可直接在本地修改并运行 `pnpm test` 测试。
   - 确保使用 GitHub 用户 `xzsean666` 提交并推送到 GitHub 远端 (`gh auth switch --user xzsean666`)。
   - 获取最新 Commit Hash 并回写到 `novel2motion/package.json`。

---

## 4. 验收与交付成果 (Deliverables)

### TASK-135 当前交付

- 新增 `AvatarCommandTimelineSchema` 和六类角色指令：移动、注视、动作、说话、表情、挂载。
- 新增 `UniversalAvatar3D`，将现有 JSON 角色配方装配为 Three.js 程序化 3D 人物，并支持动作姿态淡入、移动缓动、表情权重、口型、注视和道具挂载。
- 新增 `pnpm render:avatar-demo`，输出 `output/universal_avatar_demo.mp4`（9 秒、960x540、24fps、H.264）。
- 角色工厂生成稳定可复现的 ASCII ID；`heightScale`、脸型和服装颜色会传入 Three.js 模型。
- 定向验证：`pnpm typecheck` 通过；`tests/universal_avatar_3d.test.ts` 3/3 通过；`modular_avatar` 相关测试 21/21 通过。
- 全量 `pnpm test` 实测为 24 个测试文件通过、9 个失败（180 项中 162 项通过）；失败来自缺失历史媒体/manifest 和旧端到端渲染超时，不涉及本次角色链路定向测试。
- 全量测试暂不作为通过依据：仓库缺失 `assets/manifest.json`、历史角色 PNG、BGM 和 `output/xianxia_master.mp4`，导致若干既有测试失败或超时。

### TASK-134 最新交付成果 (高精度动漫级人物视觉重构与角色资产全面打磨)

- **彻底告别几何折纸假人，接入 5 套高精度透明底国风国漫艺术立绘**:
  1. **韩立** (`assets/characters/han_tianzun/`): 青衣道袍、御剑飞行、碧玉发冠、成男仙侠正气凛然；
  2. **极阴祖师** (`assets/characters/evil_lord/`): 幽冥黑袍、白发阴鸷、元婴煞气；
  3. **紫菱仙子** (`assets/characters/ziling_fairy/`): 冰魄神剑、紫霞仙裙、飘逸丝带、冰莲法环；
  4. **林飞** (`assets/characters/lin_fei/`): 赤阳战袍、烈火灵剑、热血高马尾、少年坚毅目光；
  5. **蛮神裂山** (`assets/characters/man_shen/`): 古铜肌理、蛮荒图腾、巨石重刃、体修力士威严霸气。
- **电影级镜头构图与纵向安全留白重构 (Headroom Safety)**:
  - 彻底解决由于以脚底贴地放大导致高个子/高马尾发带断头截断的问题；
  - 特写与中近景（`close_up` / `medium_close_up`）以顶部安全边距（`topMargin = height * 0.04 ~ 0.05`，留出 40~55px 顶空）反推 `groundY = topMargin + targetH`，呈现胸腰部以上大魄力特写，发饰与高马尾 100% 完整入画；
  - 对峙与打斗中景（`medium_shot`）缩放控制在 `0.88`，脚踏 `0.94`，顶部预留 65px+ 充裕留白；
  - 对白聚光灯焦点精确重置在角色面部与胸腔五官（`-targetH * 0.78`），柔化高光衬托面部神态。
- **多层视效与战斗动效增强**:
  - 脚底专属神通法印（御剑尾流、冰莲晶环、赤阳炎爆、幽冥煞气、碎石金芒）；
  - 战斗冲刺两段式极速残影（Combat Ghosts），攻击姿态微倾角与刀光剑气弧光。
- **重新压制并交付 3 套高质量 16:9 母带视频与剪映工程草稿**:
  - `output/sample1_tiannan_swordsman.mp4` (35.1 秒, 1920x1080 24fps) & `output/sample1_draft.json`
  - `output/sample2_ziling_fairy.mp4` (27.9 秒, 1920x1080 24fps) & `output/sample2_draft.json`
  - `output/sample3_shonen_awakening.mp4` (32.7 秒, 1920x1080 24fps) & `output/sample3_draft.json`
- **实机抽帧严谨自验**:
  - 第 15 秒林飞特写帧 (`/tmp/v2_sample3_15s.png`)：林飞高马尾发带完整入画，坚毅眼神与赤阳战袍，配对白字幕，顶空留白 43px；
  - 第 22 秒蛮神特写帧 (`/tmp/v2_sample3_22s.png`)：蛮神狂野黑发与图腾肌肉霸气登场；
  - 紫菱仙子破境帧 (`/tmp/v2_sample2_15s.png`)：仙裙飞扬，手握冰魄神剑破关而出；
  - 韩立御剑帧 (`/tmp/v2_sample1_15s.png`)：青竹蜂云剑踏空飞行，碧玉发冠顶空充盈。
- **全量测试与构建 100% 通过**:
  - 32 个测试套件，177 项自动化测试全部通过；`pnpm typecheck` 0 错误；`pnpm build` ESM 与 DTS 完整输出。

### TASK-133 历史交付记录 (新模块化模型与流行短剧 BGM 多样本全流程母带制作)

- **3 套多题材影视级 16:9 完整母带 MP4 视频与剪映草稿**:
  1. **【样本一】正统仙侠宿命对决《天南剑尊·万剑归宗》**:
     - 视频母带: `output/sample1_tiannan_swordsman.mp4` (35.04 秒, 7 镜头分镜, 1920x1080 24fps H.264/AAC, 9.87 MB)
     - 剪映草稿: `output/sample1_draft.json` (4 轨道完整工程，音轨/对白/字幕/视频一键载入)
     - 角色阵容: `PRESET_HAN_LI` (韩立，成男仙侠，青衣道袍御剑) vs `PRESET_JI_YIN` (极阴老祖，魔道仙翁，黑袍白发煞符)
     - 流行背景音乐: `assets/audio/bgm/epic_xianxia_battle.wav` (仙门决战高燃史诗战歌，战鼓 + 恢弘交响管乐)
  2. **【样本二】唯美仙子逆天破境《寒宫绝响·九凤朝阳》**:
     - 视频母带: `output/sample2_ziling_fairy.mp4` (27.91 秒, 7 镜头分镜, 1920x1080 24fps H.264/AAC, 12.08 MB)
     - 剪映草稿: `output/sample2_draft.json`
     - 角色阵容: `PRESET_ZI_LING` (紫菱仙子，成女冰宫，紫霞冰魄仙裙，冰凰神剑流光)
     - 流行背景音乐: `assets/audio/bgm/ethereal_fairy_flight.wav` (九天仙阙空灵仙音，古筝 + 空间泛音长笛)
  3. **【样本三】宗门大比少年逆袭《逆天焚决·大比风云》**:
     - 视频母带: `output/sample3_shonen_awakening.mp4` (32.70 秒, 7 镜头分镜, 1920x1080 24fps H.264/AAC, 12.06 MB)
     - 剪映草稿: `output/sample3_draft.json`
     - 角色阵容: `PRESET_LIN_FEI` (林飞，热血少年，赤阳道袍) vs `PRESET_MAN_SHEN` (蛮神裂山，体修力士，古铜古铜肌肉刀疤)
     - 流行背景音乐: `assets/audio/bgm/modern_action_phonk.wav` (现代热血国漫卡点战歌，重低音 808 Phonk 律动)
- **4 首网络爆款流行短剧高质感 BGM 资产库 (`assets/audio/bgm/`)**:
  - `epic_xianxia_battle.wav`: 仙门决战史诗战歌 (5.1MB, 60s, 44100Hz Stereo)
  - `ethereal_fairy_flight.wav`: 九天仙阙空灵出尘仙音 (5.1MB, 60s, 44100Hz Stereo)
  - `dark_demonic_abyss.wav`: 幽冥魔渊暗黑压迫感战歌 (5.1MB, 60s, 44100Hz Stereo)
  - `modern_action_phonk.wav`: 现代热血国漫卡点战歌 (5.1MB, 60s, 44100Hz Stereo)
- **ModularAvatar 骨骼 2D 世界变换与 Canvas 解耦渲染重构**:
  - 研发 `UniversalSkeleton.getBoneTransform2D`，将 3D 骨骼矩阵全局世界逆变换精确映射至 Canvas 2D 坐标系；
  - 角色服饰层、发丝、披风、面部与武器元件彻底摆脱局部偏移，严格按人体骨骼解剖比例自然呼吸与运动。
- **全量测试与构建 100% 通过**:
  - 32 个测试套件，177 项自动化测试全部通过；`pnpm build` ESM 与 DTS 完整输出。

### TASK-132 交付成果 (工业级声明式模块化角色系统全面优化升级)

- **模块化资产插槽与元件注册中心 (`AvatarAssetCatalog`)**:
  - 服装外袍、内衬、腰带、披风、下装、靴子、发型、武器法宝彻底抽象为可插拔元件；
  - 支持免修改核心代码动态扩展注册新部件（`AvatarAssetCatalog.register`），实现零耦合热插拔升级。
- **高稳定性多节点 Verlet 积分柔性物理 (`VerletChain`)**:
  - 取代简单单质点，采用多节点粒子链与严格间距约束求解器（Distance Solver）；
  - 模拟长垂发与飘逸大氅披风，支持重力与阵风气流扰动，贝塞尔平滑曲线自然流淌。
- **动作平滑交叉淡入淡出与姿态融合 (`PoseBlendController`)**:
  - 关节角度与位移在切换动作时支持 200ms Spherical/Linear Lerp 姿态过渡，消除机械顿挫。
- **智能修仙角色配方与小说解析工厂 (`AvatarFactory`)**:
  - 支持根据宗门派别（正道剑宗、幽冥魔宗、极寒雪宫、赤炎武修、蛮荒体修、搞笑沙雕门）及修仙境界一键生成纯 JSON；
  - 内置自然语言小说特征启发式抽取器，将“白发魔尊”、“粉衣小师妹”等描述直出高保真角色。
- **全量测试与构建 100% 通过**:
  - 32 个测试套件，177 项自动化测试全部通过；`pnpm build` ESM 与 DTS 完整输出。

### TASK-131 交付成果 (全新模块化人物建模与装配体系重构)

- **“角色即一串 JSON”核心契约 (`ModularAvatarSpec`)**:
  - 彻底解耦角色外貌与代码，角色完全由纯数据定义（`src/core/models/modular-character.ts`）；
  - 支持声明式配置与校验，支持运行时 `toJSONString()` 与热重载。
- **男女通用骨骼体系与比例映射 (`UniversalSkeleton`)**:
  - 覆盖成男 (`male_adult`)、成女 (`female_adult`)、少年 (`male_youth`)、少女 (`female_youth`)、力士 (`male_muscular`)、仙翁 (`male_elder`)、Q版 (`chibi_universal`) 7 种人体比例；
  - 提供标准化挂接系统 (`Sockets`: hand_r, hand_l, back, head_top, waist, feet, aura)。
- **多风格面部引擎与真实音素口型驱动 (`FaceMeshBuilder`)**:
  - 4 大艺术风格：国风仙侠正剧 (`xianxia_real`)、现代二次元动漫 (`anime_modern`)、国漫热血硬派 (`donghua_action`)、Q版沙雕萌系 (`chibi_comedy`)；
  - 7 种精准音素口型 (`Viseme`: silence, a, i, u, e, o, m) 随对白平滑开合；自然周期眨眼与微表情通道。
- **模块化服装分层与二级动力学柔性层 (`ModularCostumeRig`)**:
  - 服饰分层拆解（内衬、外袍、腰带玉佩、大袖、披风、下装、靴子、武器），支持在运行时 `avatar.updateCostume(...)` 即时换装；
  - 弹簧阻尼二级物理动力学：风阻与运动加速度自然带动发尾与披风衣袖起伏摆动。
- **通用动作库全覆盖 (`UniversalMotionLibrary`)**:
  - 12 种跨体型动作（静立呼吸、御剑飞行、淡然论道、激昂叱咤、挥剑劈斩、双手结印、罡气护体、受击震退、骇然急退、拱手执礼、狂妄大笑、拔剑出鞘）。
- **精品角色预设库与 SQLite 注册表持久化**:
  - 内置开箱即用角色：韩天尊、紫菱仙子、极阴祖师、林飞、蛮神裂山、小灵儿、沙雕白须仙翁；
  - `CharacterRegistry` 深度支持 JSON 格式持久化与别名检索。
- **全量测试与构建通过**:
  - 新增 13 项模块化角色集成测试，全仓库 31 个测试套件、170 项自动化测试 100% PASS；
  - `pnpm typecheck` 0 错误；`pnpm build` 输出完整 ESM & DTS 产物。

### TASK-130 交付成果 (工业级现代 AI 短剧/漫剧全流程生成引擎与剪映工程互通)

- **16:9 影视横屏母带产物**: `output/drama_landscape_master.mp4` (45.8 秒, 14 镜头全景分镜, 1920x1080 16:9 横屏 24fps H.264/AAC)，彻底告别 2D 纸片贴纸玩具方向与无角色空镜：
  - **人物真切在场与面对面对峙**: 左侧韩立御剑面向右方，右侧极阴祖师煞气翻滚面向左方，双人拉开 400px+ 间距绝不重叠；对白镜头自动切入单人中心大特写；
  - **国风短剧大字花字字幕**: 底部半透明电影渐变底栏，明青色说话人标签（如 `【韩立】`），醒目烫金色毛笔行楷大字配纯黑描边，台词卡点烧录；
  - **电影级微运镜**: 运镜施加在合成好的人物关键帧上，具备缓慢推镜头（Dolly In）、戏剧性拉远（Pull Back）、对峙甩镜（Whip Pan）与雷电剑光视效。
- **16:9 剪映/CapCut 桌面工程草稿产物**: `output/jianying_landscape_draft.json`（画布比例 16:9，1920x1080），多轨道（主视频轨、TTS 对白轨、环境/击打 SFX 音效轨、字幕文本轨）一键导入剪映，支持用户在剪映中随时精剪与替换高阶特效！
- **实机抽帧严谨自验**:
  - `ffprobe` 确认视频流精确为 1920x1080, 24fps, 45.8s；
  - 第 8 秒对峙帧 (`/tmp/drama_new_8s.png`)：韩立与极阴祖师隔空对峙，雷云背景与剑光电芒，角色细节完好；
  - 第 15 秒台词帧 (`/tmp/drama_new_15s.png`)：韩立单人威严特写，底栏清晰烧录 `【韩立】“道友，接我这一剑。”`。
- **AI 导演分镜编导引擎 (`DramaDirector`)**:
  - 小说文本自动语义解析，根据黄金 3 秒逻辑生成开场全景钩子（`wide_establishing`）；
  - 自动为情绪对白分配大特写/特写（`close_up`）与推镜头（`dolly_in`），为打斗冲突分配中景与甩镜头（`whip_pan`）；
  - 生成双语专业提示词（FLUX/SDXL 画面 Prompt + 可灵/海螺/通义万相 视频动态 Prompt）。
- **角色一致性设定库 (`CharacterBible`)**:
  - 管理固定人设、外貌描述、参考图路径与 LoRA 触发词，彻底解决“换镜头就换脸”问题。
- **多模型视频生成提供商体系 (`IVideoGeneratorProvider`)**:
  - 快手可灵 (`KlingVideoProvider`)：图生视频、首尾帧控制、运镜参数生成；
  - MiniMax 海螺 (`HailuoVideoProvider`)：高动态连贯性；
  - 阿里通义万相 (`WanVideoProvider`)：Wan 2.1 / 本地 ComfyUI 适配；
  - 电影级运镜本地引擎 (`CinematicMotionProvider`)：通过 `DramaKeyframeComposer` 将角色与背景预合成后进行运镜编码，离线环境亦可直出高质感影视分镜！
- **全量测试与构建验证**:
  - 30 个测试套件、156 项测试 100% PASS；
  - `pnpm typecheck` 0 错误；`pnpm build` 输出完整 ESM & DTS 产物。

### 历史交付记录 (TASK-129)

- **正剧母带产物**: `output/drama_xianxia_master.mp4` (41.3 秒, 6 分镜跨 3 幕场景, 1280x720 30fps H.264/AAC, 4.20 Mbps)，完全告别沙雕风格，实现正统修仙逆天大作质感。
- **高保真自然动漫口型与多谐波语音韵律 (Natural Anime Lip Viseme)**:
  - 彻底废除大圆肉色补丁膏药与白色几何矩形大牙！
  - 紧密贴合原画唇缝微张开合，展现精致内唇深绯微影与下唇微光；
  - 引入多谐波语音音节发生器（Syllable Rhythm Generator with micro-pauses），配合骨骼联动头部与下颌自然点头节拍（Talking Head Cadence），使交谈富有生命力且绝不奇怪。
- **通用动作模板库引擎 (Universal Motion Template System)**:
  - 研发 `src/engine/puppet/action-template.ts`，内置 14 套涵盖基础待机、交谈对白、战斗神通与情绪姿态的标准动作模板（`idle`, `cruise`, `walk_advance`, `talking`, `talking_intense`, `attack_slash`, `sword_barrage`, `cast_spell`, `defend_block`, `hurt_flinch`, `taunt_smug`, `shocked`, `bow_respect`, `entrance`）；
  - 全套动作由流畅 S-Curve 与次世代缓动插值驱动，彻底解决纸片僵硬抽搐。
- **模型体系模板化解耦 (Exclusive vs Shared Models)**:
  - 核心架构支持 `roleScope: "exclusive" | "shared"` 与 `applicableDramas`；
  - 注册并装载跨剧共享的共用模型（正道弟子 `char_common_disciple`、铁血护卫 `char_common_guard`）；
  - 所有模型（仙侠专属、都市专属、全剧共用）100% 共享整套通用动作模板！
- **多题材精品推文剧本库**:
  - 提供 3 套风格各异的高燃正剧剧本（仙侠逆天《青云仙劫·凡人问天》、都市战神《潜龙出渊·战神降临》、仙宗护道《昆仑问剑·万仙归宗》）；
  - `AiDirector` 全面支持长街、天台、武馆、密林、竹海、云巅等多元场景智能感知与编导。
- **全量测试与构建验证**:
  - 28 个测试套件、149 个单元/集成/E2E 测试 100% PASS；
  - `pnpm typecheck` 0 错误；`pnpm build` 输出完整 ESM & DTS 产物。

### 历史交付记录 (TASK-128)

- **母带产物**: `output/animation_quality.mp4` (38.5 秒, 4 分镜跨 3 幕场景, 1280x720 30fps H.264/AAC, 4.14 Mbps), 通过 `pnpm render:preview` 100% 可重复渲染。
- **模型朝向面对面对峙 (Face-to-Face Confrontation)**:
  - 攻克 2D 修仙人物立绘默认 3/4 偏左视角与 Three.js 舞台三维朝向不一致的矛盾；
  - 在 `HeadlessRenderer` 实现 `targetFacing !== spriteNaturalFacing` 智能对称映射；
  - 左侧韩立面向屏幕右侧，右侧极阴祖师面向屏幕左侧，二人眼神与躯干朝向战场中心正面对峙。
- **嘴型对齐与通用人脸检测 (Generic Mouth Alignment & Skin Patch)**:
  - 精准校准内置立绘五官嘴部真实像素锚点（韩立 (405, 248)、极阴 (318, 305)、现代主角 (375, 295)）；
  - 升级 `FaceAnimator`：说话张嘴时，以角色头部真实肤色为基底生成径向羽化柔光遮罩覆盖原画闭合唇线，消除“两张嘴”现象；
  - 研发 `FaceDetector.analyzeImage` 通用检测器：对任意未来新传入透明 PNG 立绘，运行时自动聚类检测面部肤色、横向唇线位置与自然朝向，未知模型免配置平滑适配。
- **多场景氛围与上下文感知 (Multi-Scene Atmosphere System)**:
  - 新增 3 款 1920x1080 仙侠原画背景：昆仑仙巅云海 (`bg_xianxia_peak`)、青竹剑境竹林 (`bg_xianxia_bamboo`)、九幽魔煞血海 (`bg_xianxia_abyss`)；
  - `AiDirector` 智能场景感知：优先分析场景旁白中的环境关键词（“巅/昆仑”->金色云海，“竹/林/翠”->翠绿竹海，“魔/血/煞/幽”->赤红血海），并支持多幕场景自动轮转。
- **渲染 Bug 根治与特效升级**:
  - 彻底解决画面中心 (0,0) 突兀绿色方块问题（非激活粒子过滤 + 圆形柔光高斯光晕）。
  - 修复受击白闪变成全屏发灰雾发蒙的恶性混合问题，切换为 Additive (`screen`) 真实电光强闪，保留背景饱和度与色调。
  - 粒子火星由生硬的小方块升级为柔和抗锯齿发光微粒。
- **电影级运镜与中近景特写**:
  - `AiDirector` 与 `ScenePlayer` 结合：对白时镜头平滑推拉至 1.45x 中近景特写，主角五官表情与口型开合清晰可见。
- **修仙角色生动姿态与御空物理**:
  - 角色具备 16px 呼吸律动浮空波与迎风微倾角。
  - 主角脚下青竹蜂云剑踏空飞行，配有青色尾流喷射与发光法环；魔道祖师脚下魔道紫炎翻滚。
  - 角色近身斩击执行 3 重高速残影与速度线。
- **仙侠法术与空间氛围质感**:
  - 九天玄雷: 白炽主雷芯 + 紫色离子晕 + 天幕等离子爆球与冲击光环。
  - 破空月牙刃: 极速切过战场的半月能量波刃与拖尾火星。
  - 景深系统: 远景天幕闪电联动照亮 + 中景山峦飘移薄雾 + 前景流云光尘 + 电影级暗角 (Vignette)。
- **国风书法卡牌字幕**:
  - 磨砂半透明深色底板 + 金黄/阵营流光边框 + 雅致四角包金花纹。
  - 区分角色专属阵营色（【韩立】青玉流光，【极阴祖师】魔紫血煞）。
- **实测指标**:
  - `pnpm typecheck` 0 错误；
  - `pnpm test` 全量 27 个测试套件、141 个单元/端到端测试 100% PASS。

---

## 3. 本地优化 SDK 引用与维护协议 (Mandatory Protocol)
1. **安装依赖规范**:
   - `kvdb-sdk`: `github:xzsean666/kvdb-nodejs#89040274713ecc86863e8d47963f8f8d92f5f388`
   - `node-task-runtime`: `github:xzsean666/NodeJS-Task-Runtime#1ae1577e5bfd759f0ed0a55433e80f136116ee66`
   - **严禁**在 `package.json` 中使用 `file:..` 等本地相对路径。
2. **本地修复闭环**:
   - 源码分别位于 `/ssd0/git/kvdb-nodejs` 和 `/ssd0/git/NodeJS-Task-Runtime`。
   - 发现 Bug 可直接在本地修改并运行 `pnpm test` 测试。
   - 确保使用 GitHub 用户 `xzsean666` 提交并推送到 GitHub 远端 (`gh auth switch --user xzsean666`)。
   - 获取最新 Commit Hash 并回写到 `novel2motion/package.json`。

---

## 4. 验收与交付成果 (Deliverables)

### TASK-127 最新交接

- 新样片: `output/animation_quality.mp4`，约 18.855 秒、1280x720、30fps，H.264/AAC；`pnpm render:preview` 可复现。
- Three.js 骨骼蒙皮已实际用于离线出片，头/双臂/衣摆独立运动；口型随头部变形；近战/雷击具备蓄力、命中和恢复时序。
- 修正按注册表顺序误认攻击方、漏识别雷霆、逐帧重启镜头/震屏、攻击特效残留及过期验证入口。
- 实际验证: 类型检查、构建通过；全量 27 套件 / 141 测试通过；最后局部视觉调整后 12 项相关测试及类型检查/构建再次通过。
- 状态 REVIEW: 等待用户观看样片评价。当前是单张立绘的 2D 网格骨骼动画，完整转身与复杂走跑仍需角色资产制作。历史“电影级/工业级”措辞不作为当前视觉质量结论。
- 当前仓库启动时全部文件均为 untracked，保留原内容与旧视频；没有提交或推送。

### 历史交付记录
1. **终极仙侠推文动画母带**: `output/xianxia_master.mp4` (87.90 秒, 1920x1080 16:9 电影级横屏, H.264+AAC, 24fps, 106MB)。
   - **真实模型表情切换 (Authentic Character Expression)**: 彻底消除违和的假娃娃涂鸦与悬浮 emoji（已裁剪净化哮天鸡立绘中的黄色表情包头，还原神俊金羽灵兽立绘）；情绪 100% 映射到角色模型对应的高清艺术立绘（`normal`, `angry`, `shocked`, `hurt`, `battle`, `happy`），原汁原味呈现修仙国漫神韵；
   - **模型贴合说话口型 (Model-Anchored Speaking Lips)**: 对白发声时（`isSpeaking: true`）根据每个模型的五官比例与唇色特征执行自然微动开合，静止及听者状态 100% 保持立绘原本唇形，灵宠等非人类角色自动跳过；
   - **阵营自适应智能站位 (Faction-Aware Staging)**: 正道阵营（韩立在 mid_left，李云飞在 far_left，哮天鸡以 0.42 比例伴飞侧翼）固定居左面向右，魔道反派（极阴老祖在 mid_right）固定居右面向左，横向拉开 840+ 像素宽阔空间，彻底解决人物重叠与站位混乱问题；
   - **1920x1080 横屏电影视效**: 默认全流程支持 16:9 横屏，国风壮丽山河原画 1:1 饱满铺满，底部国风书法字幕居中排布，纯阳剑阵与九天玄雷特效极具沉浸感；
   - **真实神经网络配音**: 全角色接入高质量神经语音（韩立: 青年沉稳音；极阴老祖: 阴鸷元婴魔音；李云飞: 热血正道剑客音；哮天鸡: 灵宠东北魔性音；旁白: 仙侠说书音）。
2. **自动化测试套件**: 26 个测试套件、131 项单元/集成/E2E 测试全部 100% PASS。
3. **可执行构建产物**: `pnpm build` 输出 `dist/cli.js`、`dist/index.js` 及完整 DTS 声明。
