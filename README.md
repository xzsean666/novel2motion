# novel2motion

> **Novel → AI Director → Three.js 2.5D/3D Animation → Master Video**
>
> 基于 Node.js (TypeScript) + Three.js 的纯后端代码化小说推文动画生成工作台。
> 小说文本一键全自动生成高质感、魔性生动、带 3D 运镜与多轨音效的短视频母带。

---

## 🌟 核心理念与技术突破

告别传统的“静态 2D 位图硬搬贴图”（画面死板、画质发虚、无景深运镜、动作僵硬），`novel2motion` 全面升级为现代 **Node.js + Three.js** 纯后端工业化视频生成架构：

1. **Three.js 2.5D 舞台与 3D 电影级运镜 (ThreeStage & CameraController)**
   - 远景天劫雷云、中景群峰、近景角色分置于 2.5D 深度视差平面。
   - 真实 3D 摄像机平滑推拉（Dolly Zoom）、甩镜头（Pan）、受击震屏（Camera Shake）。
2. **纸片人部件傀儡与真人魔性人脸贴合 (Puppet Rig & Meme Faces)**
   - 5.5~6 头身修仙成男，35° 俯冲向前御剑飞行姿态，肢体骨骼与呼吸起伏律动。
   - 头部预留面部材质 UV，张学友魔性脸（“食屎啦你”）、冷峻剑客脸、白须老祖脸在发丝遮罩下动态无缝贴合切换。
3. **爆款短视频毛笔行楷金字描边排版 (Calligraphy Subtitle)**
   - 加载国风马善政毛笔行楷字体，渲染金黄色字身、5px 纯黑立体描边与深沉投影，告别文字模糊。
4. **炫酷粒子与视觉后处理管线 (Particles & Post-processing)**
   - 天劫玄雷折线闪电弧、青竹蜂云剑绿色剑气粒子拖尾、受击白闪顿帧（Hit Flash）。
5. **双核心底层 SDK 强力驱动**:
   - **`kvdb-sdk`**（`/ssd0/git/kvdb-nodejs`）：基于 SQLite 的角色圣经、素材库、TTS 音频缓存与并发作业队列。
   - **`node-task-runtime`**（`/ssd0/git/NodeJS-Task-Runtime`）：多线程工作池、FFmpeg 子进程无泄漏管理与临时目录自动清理。

---

## 🏛 核心流程架构

```mermaid
graph LR
    Novel[小说文本输入] --> AI[AI 导演分镜]
    AI --> Assets[角色/背景/音效注册表 (kvdb-sdk)]
    AI --> Audio[TTS 配音 & 避让混音 (FFmpeg)]
    Assets --> Three[Three.js 2.5D 舞台 & 纸片人傀儡]
    Audio --> Video[无头离线渲染与流式视频压制]
    Three --> Video
    Video --> MP4[成品 1080p 视频 (.mp4)]
```

---

## 📦 依赖管理与安装规范

本项目依赖两个经过深度优化的企业级 SDK，**严格通过 GitHub 仓库 + 具体 Commit Hash** 安装：

```json
{
  "dependencies": {
    "kvdb-sdk": "github:xzsean666/kvdb-nodejs#89040274713ecc86863e8d47963f8f8d92f5f388",
    "node-task-runtime": "github:xzsean666/NodeJS-Task-Runtime#1ae1577e5bfd759f0ed0a55433e80f136116ee66"
  }
}
```

---

## 🚀 快速开始

### 1. 工业级 AI 短剧/漫剧生成 (全新 TASK-130 架构，推荐！)

```bash
# 生成 9:16 移动端竖屏短剧，并一键导出剪映/CapCut 桌面工程草稿
pnpm tsx src/cli.ts drama examples/animation-quality.txt \
  -o output/ai_short_drama_master.mp4 \
  --aspect 9:16 \
  --provider cinematic_motion \
  --export-draft output/jianying_draft.json

# 仅导出影视分镜剧本 JSON (含景别、运镜语言与双语 Prompt)
pnpm tsx src/cli.ts storyboard examples/animation-quality.txt -o storyboard.json
```

- **生成模型支持**: `--provider <cinematic_motion | kling | hailuo | wan>`
- **画幅支持**: `--aspect <9:16 | 16:9>`
- **剪映直通**: 输出的 `jianying_draft.json` 可直接在剪映/CapCut 桌面版打开进行二次精剪！

---

### 2. 传统推文动效出片模式 (兼容老版)

```bash
# 安装依赖
pnpm install

# 命令行生成传统推文视频
pnpm novel2motion render novel.txt -o output.mp4 --width 1280 --height 720 --fps 24

# 运行自动化测试套件 (30 套件, 156 测试 100% PASS)
pnpm test
```

---

## 📄 研发文档体系

开发与维护请遵守 `docs/AI/` 目录规范：
- 顶层代理协作守则: [`AGENTS.md`](./AGENTS.md)
- 总目标与交付标准: [`docs/AI/GOAL.md`](./docs/AI/GOAL.md)
- 详细架构说明: [`docs/AI/ARCHITECTURE.md`](./docs/AI/ARCHITECTURE.md)
- 历史架构决策: [`docs/AI/DECISIONS.md`](./docs/AI/DECISIONS.md)
- 14 项任务全景看板: [`docs/AI/TASK_INDEX.md`](./docs/AI/TASK_INDEX.md)
- 会话恢复状态记录: [`docs/AI/SESSION_STATE.md`](./docs/AI/SESSION_STATE.md)
