# TASK-121: 基于 kvdb-sdk 队列的高并发任务服务端与 Web API

## 1. 任务元数据
- **任务 ID**: TASK-121
- **状态**: DONE
- **优先级**: P1
- **所属模块**: `src/server`
- **依赖任务**: TASK-103, TASK-120

---

## 2. 任务目标
利用 `kvdb-sdk` 内置的高性能可靠作业队列（`db.queue`），构建无须 Redis 的纯后端并发视频生成 API 服务端，支持异步任务提交、SSE 实时进度流推送与结果下载。

---

## 3. 详细设计与实现要求
1. **HTTP 服务端架构 (`src/server/server.ts`)**:
   - 轻量高并发 HTTP 服务（基于 Fastify / 原生 HTTP）。
   - 核心路由：
     - `POST /api/jobs`: 提交小说文本，入队返回 `jobId`。
     - `GET /api/jobs/:id`: 查询任务当前状态（queued / processing / completed / failed）与下载路径。
     - `GET /api/jobs/:id/events`: Server-Sent Events (SSE) 实时广播渲染进度。
     - `GET /api/characters`: 角色列表检索与锁定。
     - `GET /api/backgrounds`: 背景列表检索。
2. **队列消费者 Worker (`src/server/queue-worker.ts`)**:
   - 使用 `emailQueue = db.queue("render_jobs")` 的 `queue.process()` 模式。
   - 具有原子租约（Atomic Lease）、可见性超时（Visibility Timeout）与并发控制（Concurrency: 2~4）。
3. **单元与 API 测试 (`tests/server_api.test.ts`)**:
   - 模拟任务提交、队列消费与状态轮询。

---

## 4. 验收标准
- [ ] 成功运行 HTTP 服务，支持通过 API 提交任务并在后台队列并发渲染。
- [ ] 单元与集成测试通过。
