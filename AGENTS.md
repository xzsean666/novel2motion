# AGENTS.md

> `novel2motion` AI 工程代理与协作守则

本文件是 AI Agent 在本仓库工作的顶层行为准则。所有在本仓库工作的 AI 实例必须严格遵守本文件与 `docs/AI/` 目录下的事实来源。

---

## 1. 核心事实来源 (Source of Truth)

工作时遵循以下事实来源层级：
1. **本文件与全局规则**: `AGENTS.md`
2. **总目标**: `docs/AI/GOAL.md`
3. **架构说明**: `docs/AI/ARCHITECTURE.md`
4. **重要决策**: `docs/AI/DECISIONS.md`
5. **任务索引**: `docs/AI/TASK_INDEX.md`
6. **当前状态**: `docs/AI/SESSION_STATE.md`
7. **当前任务**: `docs/AI/tasks/TASK-xxx.md`

若文档间存在细微冲突，以最新决策 `DECISIONS.md` 和当前处于 `IN_PROGRESS` 的 `TASK-xxx.md` 为准。

---

## 2. 账号与 Git 操作路由规范

- 本仓库路径位于 `/ssd0/git/novel2motion`。
- **必须使用 GitHub 账号**: `xzsean666`。
- 若执行 `gh` CLI 命令或涉及 Git 认证的操作前，必须确保当前激活账号为 `xzsean666`：
  ```bash
  gh auth switch --user xzsean666
  ```
- 不主动执行 `git push`、`git reset --hard`、`git checkout` 等可能影响生产或丢弃用户工作的破坏性操作。

---

## 3. 本地优化 SDK 依赖与维护规范 (Local SDK Dependency & Maintenance Protocol)

系统中包含两个已优化且必须依赖的核心底层 SDK：
1. **数据库与缓存/队列 SDK**: `/ssd0/git/kvdb-nodejs` (`kvdb-sdk`)
2. **任务与运行时调度 SDK**: `/ssd0/git/NodeJS-Task-Runtime` (`node-task-runtime`)

### 3.1 依赖安装强制规则 (严格执行 GitHub + Commit Hash)
- **严禁使用本地路径安装**：禁止在 `package.json` 中配置 `file:../kvdb-nodejs`、`link:..` 或 npm link。
- **必须通过 GitHub 仓库 + 具体 Commit Hash 引用**：
  ```json
  "dependencies": {
    "kvdb-sdk": "github:xzsean666/kvdb-nodejs#89040274713ecc86863e8d47963f8f8d92f5f388",
    "node-task-runtime": "github:xzsean666/NodeJS-Task-Runtime#1ae1577e5bfd759f0ed0a55433e80f136116ee66"
  }
  ```
- 每次更新依赖时，必须指明确切的 40 位 Git Commit SHA，保证完全可复现构建。

### 3.2 SDK Bug 修复与迭代闭环规范
- 若在 `novel2motion` 开发或执行过程中发现 `kvdb-sdk` 或 `node-task-runtime` 存在 bug、缺少必要功能或需要适配：
  1. AI 代理可直接进入对应本地目录（`/ssd0/git/kvdb-nodejs` 或 `/ssd0/git/NodeJS-Task-Runtime`）进行代码修复。
  2. 修复后在对应 SDK 目录运行测试确保 100% 通过（`pnpm test`）。
  3. 执行 Git 提交并通过 `xzsean666` 账号推送至 GitHub：
     ```bash
     gh auth switch --user xzsean666
     git commit -m "fix: xxx"
     git push origin main
     ```
  4. 获取最新的 Commit Hash (`git rev-parse HEAD`)，并在 `novel2motion` 的 `package.json` 中更新对应的 hash。

---

## 4. 技术栈自洽原则

本系统已全面升级为现代 **Node.js (TypeScript) + Three.js** 全栈架构：
- **运行环境**: Node.js (v20+ LTS, ESM 模块规范)
- **开发语言**: TypeScript 5.8+
- **图形与动画引擎**: Three.js (2.5D/3D 场景图、3D 运镜、骨骼/部件动画、粒子特效系统)
- **任务与多线程调度**: `node-task-runtime` (Worker Threads 线程池、FFmpeg 子进程无僵尸管理、临时目录清理)
- **数据持久化与作业队列**: `kvdb-sdk` (基于 SQLite 的工程数据持久化、音频/LLM 缓存、渲染任务队列)
- **音视频终极压制**: FFmpeg (经由 `node-task-runtime` 统一子进程流式调用)
- **实事求是**: 所有结论必须基于实际读取代码或实际运行的命令结果，严禁捏造测试通过。

---

## 5. 任务状态机规范

状态转移只允许如下路径：
```text
TODO -> IN_PROGRESS -> REVIEW -> DONE
                    \-> BLOCKED
```

- **TODO**: 尚未开始，依赖已满足或待排期。
- **IN_PROGRESS**: 当前正在执行（同一时间全局仅能有 1 个）。
- **REVIEW**: 代码实现已就绪，已完成自测验证，等待审查。
- **DONE**: 验收标准全部满足，所有验证命令实际执行通过，状态已持久化至 `SESSION_STATE.md`。
- **BLOCKED**: 遇到缺少外部凭证、缺少环境工具或不可解决的阻断问题。

---

## 6. Session 交互与交接流程

1. **启动时**:
   - 检查 `git status --short`。
   - 读取 `docs/AI/SESSION_STATE.md` 恢复上下文。
   - 确认当前或下一个可执行的任务。
   - 在开始编码前输出规范的“修改前计划”。
2. **结束时**:
   - 运行验证测试。
   - 更新 `docs/AI/SESSION_STATE.md` 与对应的 `TASK-xxx.md`。
   - 输出统一规范的“最终交接格式”。
