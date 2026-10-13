# TASK-103: 基于 kvdb-sdk 的 SQLite 项目持久化、角色圣经与素材资产注册表

## 1. 任务元数据
- **任务 ID**: TASK-103
- **状态**: DONE
- **优先级**: P0
- **所属模块**: `src/db`
- **依赖任务**: TASK-102

---

## 2. 任务目标
利用已优化接入的 `kvdb-sdk`，构建本地嵌入式 SQLite 数据存储层，实现角色圣经防漂移注册表（`CharacterRegistry`）、背景资产检索池（`BackgroundRegistry`）、工程持久化存储与 TTS 独立缓存池。

---

## 3. 详细设计与实现要求
1. **初始化 KVDB 数据库 (`src/db/connection.ts`)**:
   - 使用 SQLite 驱动 (`better-sqlite3`)，统一表前缀 `n2m_`。
2. **角色圣经注册表 (`src/db/character-registry.ts`)**:
   - 基于 `schema` 建立多键索引（`id` 为主键，`name` 为二级索引）。
   - 实现按精确名字、别名（Aliases）模糊匹配角色，防角色漂移。
   - 支持角色“锁定（is_pinned）”与表情差分映射。
3. **背景素材注册表 (`src/db/background-registry.ts`)**:
   - 支持多标签（Tags）语义检索（如 `["xianxia", "thunder"]`），优先复用背景。
4. **TTS 音频独立缓存 (`src/db/audio-cache.ts`)**:
   - 利用 `kvdb-sdk` 的独立缓存（`Cache`）系统，根据对白文本与音色 ID 缓存语音文件路径和音频时长。
5. **单元测试 (`tests/db_registries.test.ts`)**:
   - 验证角色查询、别名检索、背景标签匹配与音频缓存。

---

## 4. 验收标准
- [x] 完整集成 `kvdb-sdk`，利用 SQLite 存储实现 O(1) 角色点查与防角色漂移检索。
- [x] 单元测试 100% 通过（5/5 测试通过，累计 17 项全套测试全绿）。
- [x] TypeScript 类型无死角编译通过，导出 .d.ts 声明。
