# TASK-118: 无头 Three.js 逐帧离线光栅化与流式 FFmpeg 管道编码器

## 1. 任务元数据
- **任务 ID**: TASK-118
- **状态**: DONE
- **优先级**: P0
- **所属模块**: `src/renderer`
- **依赖任务**: TASK-104, TASK-111

---

## 2. 任务目标
构建纯后端无头视频渲染与导出管线。在 Node.js 环境中驱动 Three.js 逐帧离线光栅化，提取高保真 RGBA 像素流，通过 `node-task-runtime` 管道流式输入 FFmpeg 进程，合成多轨音频并一键压制输出高品质 MP4 视频。

---

## 3. 详细设计与实现要求
1. **无头 Three.js 离线渲染器 (`src/renderer/headless-renderer.ts`)**:
   - 在 Node.js 端利用跨平台高性能离线 Canvas（如 `@napi-rs/canvas` 或软件 WebGL 上下文）初始化 Three.js。
   - 按照设定帧率（24fps / 30fps）逐毫秒驱动时间轴前进，触发 `renderer.render(scene, camera)`。
   - 提取原始 RGBA 像素数据（`Buffer` / `Uint8Array`）。
2. **FFmpeg 内存管道流式压制器 (`src/renderer/stream-encoder.ts`)**:
   - 建立 FFmpeg 子进程，参数：
     ```bash
     ffmpeg -y -f rawvideo -pix_fmt rgba -s 1280x720 -r 24 -i pipe:0 \
            -i mixed_audio.wav -c:v libx264 -pix_fmt yuv420p -crf 18 \
            -c:a aac -b:a 192k -shortest output.mp4
     ```
   - 通过 `node-task-runtime` 统一接管 FFmpeg stdin 管道写入与 stderr 进度监听。
   - 自动防卡死与内存背压控制（Backpressure）。
3. **集成测试 (`tests/headless_renderer.test.ts`)**:
   - 验证无头离线连续多帧渲染、像素提取与视频编码流程。

---

## 4. 验收标准
- [ ] 纯后端能够无头渲染 Three.js 场景，输出无撕裂、音画精准同步的 MP4。
- [ ] 单元测试 100% 通过。
