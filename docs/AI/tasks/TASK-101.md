# TASK-101: Node.js + TS (ESM) 基础工程搭建与 GitHub+Hash SDK 依赖引入

## 1. 任务元数据
- **任务 ID**: TASK-101
- **状态**: DONE
- **优先级**: P0
- **所属模块**: `infra`
- **依赖任务**: 无

---

## 2. 任务目标
初始化现代 Node.js (TypeScript, ESM) 工程骨架，配置 TypeScript 5.8+、`tsup` 构建器、`vitest` 测试框架，并通过 GitHub+Hash 规范引入两个核心底层 SDK：
1. `kvdb-sdk`: `github:xzsean666/kvdb-nodejs#89040274713ecc86863e8d47963f8f8d92f5f388`
2. `node-task-runtime`: `github:xzsean666/NodeJS-Task-Runtime#1ae1577e5bfd759f0ed0a55433e80f136116ee66`

同时引入 `three`、`@types/three`、`commander`、`zod` 等核心依赖。

---

## 3. 详细设计与实现要求
1. **`package.json` 配置**:
   - `"type": "module"`，`"scripts"` 配置 `build`, `dev`, `test`, `typecheck`。
   - 依赖声明必须遵守 GitHub+Commit Hash 规则，严禁本地 `file:` 路径。
   - 配置 peer dependencies（如 `better-sqlite3`）。
2. **`tsconfig.json` 配置**:
   - `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`, `"target": "ES2022"`, `"strict": true`。
3. **`tsup.config.ts` & `vitest.config.ts`**:
   - 支持 Node.js ESM 打包输出与单测运行。
4. **冒烟测试 (`tests/infra_smoke.test.ts`)**:
   - 验证 `KVDB`、`createRuntime` 与 `THREE` 的导入与基本实例化无报错。

---

## 4. 验收标准
- [x] `pnpm install` 成功，两款 GitHub+Hash SDK 均顺利拉取并自动执行 `prepare` 编译。
- [x] `pnpm typecheck` 零类型报错。
- [x] `pnpm test` 通过冒烟测试（5/5 测试全部通过）。
- [x] `pnpm build` 顺利生成 ESM 与声明文件。
