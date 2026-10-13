# TASK-120: 纯后端 CLI 命令行交互工具

## 1. 任务元数据
- **任务 ID**: TASK-120
- **状态**: DONE
- **优先级**: P0
- **所属模块**: `src/cli`
- **依赖任务**: TASK-109, TASK-110, TASK-111, TASK-112, TASK-113, TASK-114, TASK-115, TASK-116, TASK-117, TASK-118

---

## 2. 任务目标
打造友好、专业的纯后端 CLI 命令行交互工具（`src/cli.ts`），提供开箱即用的 `novel2motion render` 核心命令，并编写端到端集成测试，确保小说文本全自动生成最终合成视频。

---

## 3. 详细设计与实现要求
1. **CLI 命令体系 (`src/cli/index.ts`)**:
   - `novel2motion render <input>`:
     - `--output, -o`: 指定最终输出视频文件（默认 `./output.mp4`）。
     - `--width`: 画布宽度（默认 1280 或 1920）。
     - `--height`: 画布高度（默认 720 或 1080）。
     - `--fps`: 帧率（默认 24 或 30）。
     - `--cache-dir`: 分镜增量缓存目录。
   - `novel2motion init <project_dir>`: 初始化工程。
   - `novel2motion export <project_id> -o <file.n2m>`: 导出工程归档。
2. **终端高保真分步进度展示**:
   - `[1/4] 小说文本分块与实体抽取...`
   - `[2/4] AI 导演高层分镜编导与 TTS 对齐...`
   - `[3/4] Three.js 2.5D 舞台与时间轴动作编译...`
   - `[4/4] 无头离线渲染与流式 FFmpeg 编码 [██████████] 100%`
3. **端到端集成测试 (`tests/e2e_cli.test.ts`)**:
   - 验证无头命令行由文本生成视频全流程。

---

## 4. 验收标准
- [ ] 命令行工具可在终端执行并顺利产出 MP4 文件。
- [ ] 端到端集成测试 100% 通过。
