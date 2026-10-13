# 任务索引表 (TASK_INDEX.md)

> `novel2motion` 现代 Node.js + Three.js 全栈重构研发任务全景总览 (TASK-101 ~ TASK-135)

---

## 1. 任务看板状态概览

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
| **TASK-114** | Three.js 真人魔性人脸贴图（张学友咆哮脸、冷峻脸、老道长脸）动态嵌合材质 | `src/engine` | P0 | TASK-113 | **DONE** |
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
| **TASK-126** | Three.js 生动角色动画重大重构：说话嘴部开合动效、面部表情系统与全套肢体动作状态机 | `src/engine` | P0 | TASK-113, 114 | **DONE** |
| **TASK-127** | 角色骨骼蒙皮与动画节奏修复 | `src/engine`, `src/renderer`, `src/cli` | P0 | TASK-126 | **REVIEW** |

---

## 2. 研发里程碑与分期目标 (Milestones)

### 第一阶段：基础设施与双核心 SDK 架构 (TASK-101 ~ TASK-104)
- 搭建现代化 TypeScript (ESM) Monorepo/Package 工程骨架。
- 采用 GitHub+Hash 方式接入 `/ssd0/git/kvdb-nodejs` (`kvdb-sdk`) 与 `/ssd0/git/NodeJS-Task-Runtime` (`node-task-runtime`)。
- 确立领域数据契约、Zod 严格校验、SQLite 存储与安全 FFmpeg 进程调度中枢。

### 第二阶段：资产智能处理与扩展系统 (TASK-105 ~ TASK-107)
- 组织内置免版权素材包（字体、音效、成男部件、背景）。
- 实现立绘自动抠图与包围盒裁剪管线（`MattingPipeline`）。
- 实现新角色/新背景按需生图扩展接口。

### 第三阶段：AI 导演与音频工程管线 (TASK-108 ~ TASK-110)
- 小说文本分块状态机与实体抽取，角色自动锁定。
- AI 导演高层分镜编排与打斗动作对齐。
- Edge-TTS 自动化配音与毫秒级时长标定，KVDB 高性能音频缓存。
- 智能 BGM 情绪编排与对白自适应闪避混音 (-14dB Audio Ducking)。

### 第四阶段：Three.js 核心动效与图形引擎 (TASK-111 ~ TASK-116)
- 2.5D 景深分层、3D 摄像机平滑运镜（推拉、甩镜、震屏）。
- 纸片人部件傀儡（成男御剑飞行姿态、呼吸律动、手臂挥剑）。
- 真人魔性人脸贴图（张学友咆哮脸、冷峻脸、老道长脸）动态材质贴合。
- 粒子特效（九天玄雷、蜂云剑气流光、受击白闪）、马善政毛笔行楷金字黑边描边字幕。

### 第五阶段：高效渲染、流式编码与工程归档 (TASK-117 ~ TASK-119)
- 分镜独立哈希增量渲染缓存（`SceneRenderCache`），修改单镜头秒级重编。
- 无头 Three.js 逐帧离线光栅化与流式 FFmpeg 管道编码。
- `.n2m` 单文件工程归档导入导出。

### 第六阶段：双模交互与全平台交付 (TASK-120 ~ TASK-124)
- 交付一键运行的命令行工具：`novel2motion render input.txt -o output.mp4`。
- 基于 `kvdb-sdk` 队列的高并发任务服务端 (REST API + SSE 进度流)。
- Web 可视化 Three.js 2.5D 舞台编辑器（支持鼠标自由拖拽、实时 60fps 动效预览）。
- 多轨时间轴检视器、小说交互解析面板、角色人设库与在线播放器。
- 跨平台原生桌面客户端封装。

### 第七阶段：爆款实机终验与母带交付 (TASK-125)
- 生成 25 秒完整沙雕仙侠推文动画实机母带 (`xianxia_output.mp4`)，彻底验收“去娃娃化、真人魔性人脸嵌合、硬边不发虚、毛笔金字字幕与 3D 运镜”。

### 第八阶段：生动角色动画重大重构 (TASK-126)
- 彻底攻克角色呆板无动态问题：实现对白高频说话开合嘴唇动效（`Lip Flapping`）、面部真实情感系统（`On-Face Emotions`：额角跳动青筋、脸颊汗滴、痛苦血丝、动态眨眼）、丰富肢体战斗姿态机（御剑斩击剑弧、双手结印、受击后仰翻滚、沟通前倾点头）。
- 重新渲染 88 秒高画质母带视频 `output/xianxia_master.mp4` 并全部验收通过。
