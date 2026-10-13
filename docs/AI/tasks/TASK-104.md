# TASK-104: 基于 node-task-runtime 的任务执行中枢、FFmpeg 子进程流控与临时目录清理

## 1. 任务元数据
- **任务 ID**: TASK-104
- **状态**: DONE
- **优先级**: P0
- **所属模块**: `src/runtime`
- **依赖任务**: TASK-101

---

## 2. 任务目标
利用已优化接入的 `node-task-runtime`，构建统一的高性能异步任务执行中枢。通过 `runtime.cli` 安全包装 FFmpeg 子进程，实现临时文件自动防泄漏清理、无僵尸进程管理、stderr 实时进度解析，并配置多线程工作池（Worker Threads）用于时间轴计算。

---

## 3. 详细设计与实现要求
1. **运行时初始化 (`src/runtime/app-runtime.ts`)**:
   - `createRuntime({ workers: "auto" })`，自动感知 CPU 核心数。
   - 注册全局执行耗时 APM 中间件。
2. **FFmpeg CLI 任务包装器 (`src/runtime/ffmpeg-task.ts`)**:
   - 使用 `runtime.cli` 封装 FFmpeg 外部进程调用。
   - 配置 `autoCleanTemp: "always"`，在 `context.createTempDir()` 中安全创建临时渲染帧序列与音频混音文件，执行完毕或崩溃后自动清理。
   - 监听 `onStderr` 实时捕获 `time=` 与 `frame=` 字符串，计算渲染进度并通过 `context.reportProgress` 回报。
3. **工作线程池任务 (`src/runtime/timeline-worker.ts`)**:
   - 将小说文本分块与时间轴缓动计算任务注册为 Worker Task，避免阻塞 Node.js 事件循环。
4. **单元测试 (`tests/runtime_tasks.test.ts`)**:
   - 验证 CLI 调用、临时目录自动清理与工作线程任务并发执行。

---

## 4. 验收标准
- [x] 完整接入 `node-task-runtime` 的 CLI、工作池与临时文件生命周期管理。
- [x] 单元测试 100% 通过（8/8 测试通过，全库 25 项测试全绿）。
- [x] TypeScript 类型无死角编译通过，导出 .d.ts 声明。
