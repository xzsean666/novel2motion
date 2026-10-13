# novel2motion 架构设计说明书 (ARCHITECTURE.md)

> 全 Node.js (TypeScript) + Three.js 纯后端代码化推文动画引擎

---

## 1. 总体分层架构 (High-Level Architecture)

```mermaid
graph TD
    subgraph 接入层 (Interfaces)
        CLI["CLI 命令行工具 (Commander.js)<br/>novel2motion render input.txt -o out.mp4"]
        API["HTTP / REST API 服务 (Fastify / Hono)<br/>任务提交、状态轮询与视频流"]
    end

    subgraph 任务与调度中枢 (Task & Runtime Layer - node-task-runtime)
        Runtime["NodeJS-Task-Runtime 引擎<br/>• 线程池 (Worker Pool): 时间轴计算<br/>• CLI 子进程管理器: FFmpeg 进程流控<br/>• 临时文件防泄漏与自动清理<br/>• 任务执行管道 (Pipeline) & 重试机制"]
    end

    subgraph 持久化与缓存层 (Storage & Queue Layer - kvdb-sdk)
        KVDB["kvdb-sdk (SQLite 驱动)<br/>• 角色圣经 (Character Bible) & 素材资产库<br/>• 独立缓存 (Cacheable): TTS 音频与 LLM 响应<br/>• 可靠作业队列 (Queue): 渲染批处理与并发控制"]
    end

    subgraph 核心业务逻辑 (Core Business Modules)
        Parser["AI 导演与小说分块器 (StoryParser & AiDirector)<br/>LLM / 规则解析分镜与动作 DSL"]
        Audio["音频与对齐引擎 (AudioPipeline)<br/>Edge-TTS 配音、时长标定、自适应 BGM 避让混音"]
    end

    subgraph Three.js 图形与动效引擎 (Visual Animation Engine)
        Stage["Three.js 2.5D/3D 舞台系统<br/>• 3D 透视摄像机与运镜控制器 (Dolly / Shake)<br/>• 2.5D 景深分层系统 (Parallax Layers)"]
        Puppet["纸片人部件傀儡 (Paper Doll Rig)<br/>• 肢体/飞剑骨骼关节联动<br/>• 真人魔性人脸贴图 (Meme Face Texture) 动态嵌合"]
        VFX["视觉与粒子管线 (Particle & VFX)<br/>天劫玄雷、剑气拖尾、白闪光效、马善政毛笔金字字幕"]
    end

    subgraph 渲染与视频导出 (Headless Video Renderer)
        Headless["无头 Three.js 帧光栅化器<br/>逐帧导出 RGBA 像素流"]
        FFmpeg["FFmpeg 流式编码管道<br/>H.264 / AAC 无损硬件/CPU 压制输出 MP4"]
    end

    CLI --> Runtime
    API --> KVDB
    KVDB --> Runtime
    Runtime --> Parser
    Parser --> Audio
    Parser --> Stage
    Stage --> Puppet
    Stage --> VFX
    VFX --> Headless
    Audio --> FFmpeg
    Headless -->|Raw RGBA 管道| FFmpeg
    FFmpeg -->|最终成品 MP4| CLI
```

---

## 2. 核心底层 SDK 依赖契约 (Critical SDK Protocol)

本项目严格依赖以下两个已优化升级的本地同级 SDK：

### 2.1 依赖安装规范 (强制执行 GitHub + Commit Hash)
**严禁** 在 `package.json` 中使用本地相对路径（如 `"kvdb-sdk": "file:../kvdb-nodejs"`）。
**必须** 使用 GitHub 仓库结合具体 Commit Hash 进行固定：
```json
{
  "dependencies": {
    "kvdb-sdk": "github:xzsean666/kvdb-nodejs#89040274713ecc86863e8d47963f8f8d92f5f388",
    "node-task-runtime": "github:xzsean666/NodeJS-Task-Runtime#1ae1577e5bfd759f0ed0a55433e80f136116ee66"
  }
}
```

### 2.2 SDK 联动维护与 Bug 修复机制
- **`kvdb-sdk`** 源码位于 `/ssd0/git/kvdb-nodejs`。
- **`node-task-runtime`** 源码位于 `/ssd0/git/NodeJS-Task-Runtime`。
- 若在此两个库中发现 Bug 或需要扩展特性：
  1. 直接进入对应 SDK 目录修复代码，运行 `pnpm test` 自测通过。
  2. 使用指定 GitHub 账号 `xzsean666` 提交并推送到 GitHub 远端。
  3. 执行 `git rev-parse HEAD` 获取最新 Hash，更新 `novel2motion/package.json` 中的依赖声明并执行 `pnpm install`。

---

## 3. 详细模块设计与职责划分

### 3.1 领域模型与数据契约 (`src/core/`)
- **`models/character.ts`**: 角色定义、声音配置、肢体部件资产、表情差分字典（Normal, Angry, Shocked 等，支持动态人脸替换）。
- **`models/background.ts`**: 背景资产、标签、安全视口、2.5D 景深分层配置。
- **`models/dsl.ts`**: 高层分镜 DSL（`ScenePlan`、`TimelineEvent`、`ActionItem`、`SubtitleCue`）。
- **`models/timeline.ts`**: 精确到毫秒级的时间轴关键帧数据（摄像机轨迹、角色部件矩阵变换、音频时间戳）。

### 3.2 数据持久化与作业调度 (`src/db/`)
- 基于 **`kvdb-sdk`** 实例化 SQLite 数据库：
  ```ts
  const db = new KVDB({ driver: "sqlite", url: "./data/novel2motion.db", tablePrefix: "n2m_" });
  ```
- **角色圣经表 (`characters`)**: 存储固定角色配置，支持名称与别名快速索引。
- **背景素材表 (`backgrounds`)**: 存储预置与生成的背景。
- **TTS 音频缓存 (`cache`)**: 使用 `@Cacheable` 或独立缓存池持久化 TTS 语音，避免重复合成。
- **视频渲染队列 (`db.queue("render_jobs")`)**: 支持批量小说视频渲染，任务租约（Lease）、重试退避与优雅停机。

### 3.3 任务执行中枢与进程流控 (`src/runtime/`)
- 基于 **`node-task-runtime`** 实例化主运行时：
  ```ts
  const runtime = createRuntime({ workers: "auto" });
  ```
- **FFmpeg CLI 任务包装器**:
  - 利用 `runtime.cli` 安全包装 FFmpeg 子进程，实时监听 stderr 计算渲染百分比进度并广播。
  - 自动管理临时帧文件目录（`context.createTempDir()`），无论成功或崩溃均自动清理防泄漏。
  - 彻底规避僵尸进程问题。
- **多线程工作池**:
  - 将复杂的文本分块、时间轴缓动计算分配至 Worker Threads，保障主事件循环零卡顿。

### 3.4 AI 导演与小说分镜引擎 (`src/ai/`)
- **`StoryParser`**: 采用状态机与大模型抽取角色对白、旁白、情绪氛围与打斗动作。
- **`AiDirector`**:
  - 角色自动锁定：优先映射已有固定角色圣经。
  - 分镜编排：根据剧情发展自动调度运镜（特写、全景、震动）与打斗配对。
  - 情绪推断：自动匹配 BGM 情绪风格与角色表情材质。

### 3.5 音频管道与对白闪避混音器 (`src/audio/`)
- **Edge-TTS 合成器**: 高度保真的中文 AI 配音，自动标定音频真实时长（毫秒级对齐）。
- **`AudioMixer`**:
  - 多轨音频混音（BGM 轨 + 旁白/对白轨 + 打斗 SFX 轨）。
  - **动态音频闪避（Audio Ducking）**：生成智能 FFmpeg 滤镜图（Filter Graph），在对白时间窗口内自动将 BGM 音量压低至 0.2 (-14dB)，淡出 150ms，淡入 300ms。

### 3.6 Three.js 2.5D/3D 视觉动画引擎 (`src/engine/`)
- **舞台与摄像机 (`ThreeStage.ts`, `CameraController.ts`)**:
  - 采用正交/微透视摄像机，精确控制 1920x1080 视口。
  - 运镜系统支持：平滑移动（Pan）、推拉镜头（Zoom in/out）、打斗震屏（Camera Shake）、呼吸微动（Idle Float）。
- **纸片人傀儡系统 (`PuppetCharacter.ts`)**:
  - 将角色抽象为层次化 Mesh 组（飞剑、身躯、手臂、头部、法宝）。
  - 支持骨骼关节旋转（挥剑、俯冲飞行动作、被击中仰头）。
- **真人魔性人脸贴图材质 (`MemeFaceMaterial.ts`)**:
  - 头部 Mesh 预留人脸 UV 区域。
  - 在保持发丝发髻完好的前提下，材质贴图动态切换为张学友魔性脸、白须老祖脸、冷酷剑客脸。
- **粒子特效与后处理 (`ParticleSystem.ts`, `PostProcessing.ts`)**:
  - 剑气流光拖尾、天劫紫色雷电粒子、受击白闪顿帧（Hit Flash）。
- **毛笔书法金字描边字幕 (`CalligraphySubtitle.ts`)**:
  - 采用马善政毛笔行楷字体，渲染金黄色填充、厚重纯黑描边与立体阴影，爆款短视频风格。

### 3.7 无头渲染与流式视频编码 (`src/renderer/`)
- **无头光栅化 (`HeadlessRenderer.ts`)**:
  - 在纯后端利用兼容 WebGL/Canvas 环境逐帧驱动 Three.js 场景渲染。
  - 提取高保真 RGBA 像素 ArrayBuffer（零拷贝转移）。
- **FFmpeg 流式压制 (`StreamEncoder.ts`)**:
  - 经由 `node-task-runtime` 将逐帧二进制流通过管道输入 FFmpeg stdin。
  - 混合对齐好的音频流，一键生成 H.264 / AAC 格式的 MP4 母带文件。

---

## 4. 目录结构规划

```text
novel2motion/
├── package.json               # ESM, TypeScript, 依赖 kvdb-sdk & node-task-runtime (github+hash)
├── tsconfig.json
├── tsup.config.ts             # 构建打包配置
├── vitest.config.ts           # 单元测试与集成测试配置
├── assets/                    # 免版权内置核心媒体包 (立绘、背景、音效、BGM、毛笔字体)
│   ├── characters/            # 韩天尊、魔道老祖、哮天鸡等分层部件
│   ├── backgrounds/           # 天劫雷云界等 2.5D 分层背景
│   ├── audio/                 # BGM 与打斗音效库
│   ├── fonts/                 # 马善政毛笔字体等
│   └── manifest.json          # 内置资产清单
├── docs/                      # 架构文档与 AI 任务索引体系
│   └── AI/
│       ├── GOAL.md
│       ├── ARCHITECTURE.md
│       ├── DECISIONS.md
│       ├── TASK_INDEX.md
│       ├── SESSION_STATE.md
│       └── tasks/
└── src/
    ├── index.ts               # 顶层 SDK 导出
    ├── cli.ts                 # CLI 命令行入口
    ├── core/                  # 领域模型、DSL 与类型契约
    ├── db/                    # kvdb-sdk 封装、角色库、背景池、渲染队列
    ├── runtime/               # node-task-runtime 封装、FFmpeg 执行器、工作池
    ├── ai/                    # 小说解析状态机、AI 导演编排
    ├── audio/                 # TTS 语音合成、混音与音频闪避
    ├── engine/                # Three.js 2.5D 舞台、摄像机、纸片人傀儡、魔性脸材质、粒子
    ├── renderer/              # 无头帧捕获与 FFmpeg 流式编码导出
    └── server/                # HTTP API 与作业分发服务端
```
