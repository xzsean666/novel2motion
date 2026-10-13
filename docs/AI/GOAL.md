# 项目目标与边界规范 (GOAL.md)

> `novel2motion` 的终极愿景：**Novel In → Video Out**。
> 让创作者仅需输入一段小说文本，系统即可自动化完成角色识别、固定资产匹配、Three.js 场景舞台编排、情绪与对白配音、动作音效绑定，并最终在纯后端无头环境下渲染出高质感、魔性生动的动画视频。

---

## 1. 核心产品定位与解决的问题

传统动画制作流程门槛极高，而此前简单的 2D 位图平移贴图存在“动作僵硬、画质发虚、缺乏视差景深、无法做到生动肢体与表情联动”等根本缺陷。
`novel2motion` 全面转向 **现代 Node.js (TypeScript) + Three.js** 纯后端代码化视频生成架构：
- **用户心智**：创作者专注于“小说内容输入”或“批量自动化出片”，系统通过 AI 导演、Three.js 现代场景图、成熟动效系统完成端到端自动化出片。
- **运行环境**：纯后端命令行（CLI）+ 高并发任务服务（API），基于 `node-task-runtime` 多线程/子进程管理与 `kvdb-sdk` 嵌入式高性能存储。

---

## 2. 用户核心诉求与关键系统目标

### 2.1 固定角色人设与魔性人脸体系 (Character Bible & Meme Faces)
- **目标**：
  - 基于 `kvdb-sdk` 建立强类型角色资产注册表，每个角色拥有全局唯一 `CharacterId`。
  - 支持固定角色立绘与**部件化傀儡（Paper Doll Rig）**：身体躯干、双臂、头部、法宝分层独立。
  - **真人魔性表情包脸（Meme Face）与标准表情自由切换**：张学友咆哮脸、冷峻剑客脸、白须老祖脸等作为独立材质（Texture）在发髻发丝内平滑贴合替换。
  - 角色绑定专属 TTS 音色参数（Voice ID, Speed, Pitch）。

### 2.2 背景素材统一复用与 2.5D 景深分层 (Reusable Background & 2.5D Depth)
- **目标**：
  - 基于 `kvdb-sdk` 建立背景资产池，按标签（`xianxia`, `thunder`, `office`, `forest`）进行语义复用匹配。
  - 在 Three.js 中实现 **2.5D 多层景深视差（Parallax Layers）**：远景天空、中景雷云群峰、近景浮石各置于不同 Z 轴深度。
  - 彻底杜绝每镜头重新生图带来的时空连续性撕裂与成本浪费。

### 2.3 背景音乐（BGM）、TTS 配音与自适应音频闪避 (Audio Ducking)
- **目标**：
  - 集成 Edge-TTS 自动化配音，利用 `kvdb-sdk` 的独立缓存系统（`Cache`）持久化对白音频，命中率 100% 避免重复请求。
  - 内置丰富情绪 BGM 库（轻松、日常、修仙热血、大战悬疑、高潮反转）。
  - **对白智能音频闪避（Audio Ducking）**：角色说话时 BGM 音量自动平滑压低（-14dB），对白结束平滑淡入恢复。
  - 多轨音频混音（BGM + TTS + 打斗音效）由 `node-task-runtime` 统一调度 FFmpeg 高性能压制。

### 2.4 Three.js 现代视觉特效与打斗动作系统 (Three.js VFX & Combat System)
- **目标**：
  - 告别静态位图死贴，利用 Three.js 成熟图形能力实现：
    - **真实粒子系统（Particle Systems）**：九天玄雷闪电、青竹蜂云剑气拖尾、金色灵力爆破。
    - **后处理与光效（Post-processing & Bloom）**：法宝辉光、雷暴强闪、击中白闪（Hit Flash）。
    - **3D 电影级运镜（Camera Motion）**：真实 3D 摄像机平滑推拉（Dolly Zoom）、甩镜头（Pan）、受击震屏（Camera Shake）。

### 2.5 纯后端无头渲染与流式视频编码 (Headless Rendering & Pipeline)
- **目标**：
  - 纯后端 Linux/macOS 环境下运行无头 WebGL / Three.js 渲染上下文（基于 Node.js 兼容环境）。
  - 通过 `node-task-runtime` 建立内存管道流式输出帧至 FFmpeg，毫秒级无锁编码为 H.264 / AAC MP4。
  - 支持任务队列管理（基于 `kvdb-sdk` Queue）与批处理作业，实时报告渲染进度。

---

## 3. 技术路线与交付标准

1. **核心底层依赖约束**：
   - 依赖 `/ssd0/git/kvdb-nodejs` (`kvdb-sdk`)，必须通过 `github:xzsean666/kvdb-nodejs#<hash>` 安装。
   - 依赖 `/ssd0/git/NodeJS-Task-Runtime` (`node-task-runtime`)，必须通过 `github:xzsean666/NodeJS-Task-Runtime#<hash>` 安装。
2. **纯后端开箱即用**：
   - 提供命令行工具 `novel2motion render <novel.txt> -o <output.mp4>`。
   - 渲染出的视频画质达到 1080p/720p 60fps/24fps 母带级水准，彻底消除画面发虚与动作僵硬问题。
