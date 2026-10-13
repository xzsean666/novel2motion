# TASK-110: Edge-TTS 配音合成、KVDB 毫秒级音频缓存与自适应 BGM 避让混音器

## 1. 任务元数据
- **任务 ID**: TASK-110
- **状态**: DONE
- **优先级**: P0
- **所属模块**: `src/audio`
- **依赖任务**: TASK-103, TASK-104

---

## 2. 任务目标
构建专业的自动化音频处理管线。集成 Edge-TTS 实现角色多音色语音合成与毫秒级时长对齐，通过 `kvdb-sdk` 缓存语音文件，并通过 FFmpeg 滤镜图实现多轨音频混音（BGM + 对白 + 打斗 SFX）与对白自适应 BGM 音量闪避（-14dB Audio Ducking）。

---

## 3. 详细设计与实现要求
1. **TTS 合成与缓存 (`src/audio/tts-synthesizer.ts`)**:
   - 集成 `edge-tts`（支持标准音色 `zh-CN-YunxiNeural`、`zh-CN-XiaoxiaoNeural`、`zh-CN-YunjianNeural` 等）。
   - 通过 `kvdb-sdk` 缓存音频文件路径与实测时长（ms），二次调用 0ms 响应。
   - 提供测试专用的 Mock 合成器。
2. **时间轴对齐 (`src/audio/dialogue-aligner.ts`)**:
   - 提取音频真实时长并回填至 `TimelineEvent.Dialogue`，确保时间轴毫秒级精确对齐。
3. **多轨混音与自适应音频闪避 (`src/audio/audio-mixer.ts`)**:
   - 构建动态 FFmpeg Filter Graph：
     - 主轨：情绪 BGM 循环与跨分镜平滑淡入淡出。
     - 旁白/对白轨：在对白出现的精确起始/结束时间段内，自动将 BGM 音量压低至 0.2（-14dB），淡出 150ms，淡入 300ms。
     - 动作音效轨：打斗瞬间触发重击、剑鸣、雷暴等音效并叠加。
   - 由 `node-task-runtime` 统一调度 FFmpeg 执行，生成最终混合音轨 `mixed_audio.wav`。
4. **单元测试 (`tests/audio_pipeline.test.ts`)**:
   - 验证 TTS 缓存命中、时间戳对齐与音频闪避 Filter Graph 格式正确性。

---

## 4. 验收标准
- [x] 完整支持角色音色定制、TTS 合成与 SQLite 高性能持久化缓存。
- [x] 生成的混音文件包含台词、音效且 BGM 在台词时平滑衰减闪避（-14dB Ducking）。
- [x] 单元测试 100% 通过（4/4 测试通过，全库累计 44 项测试全绿）。
- [x] TypeScript 类型无死角编译通过，导出 .d.ts 声明。
