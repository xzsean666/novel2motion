# TASK-111: Three.js 核心 2.5D 画布舞台空间与 5 槽位布局引擎

## 1. 任务元数据
- **任务 ID**: TASK-111
- **状态**: DONE
- **优先级**: P0
- **所属模块**: `src/engine/stage`
- **依赖任务**: TASK-102

---

## 2. 任务目标
利用 Three.js 构建 2.5D 画布舞台空间与标准化站位布局引擎（`ThreeStage` & `StageLayoutEngine`），确立 1920x1080 / 1280x720 视口坐标系、五槽位映射与 2.5D 深度分层视差体系。

---

## 3. 详细设计与实现要求
1. **Three.js 舞台场景 (`src/engine/stage/three-stage.ts`)**:
   - 初始化 `THREE.Scene`。
   - 建立 2.5D 景深分层系统：
     - 远景层（Far Sky, Z = -500）
     - 中景层（Clouds / Mountains, Z = -250）
     - 角色层（Actors, Z = 0）
     - 特效层（VFX / Particles, Z = 150）
     - 字幕层（Subtitles, Z = 300）
2. **五槽位映射与基准线 (`src/engine/stage/stage-slots.ts`)**:
   - 标准五槽位：`FarLeft` (0.15), `Left` (0.32), `Center` (0.50), `Right` (0.68), `FarRight` (0.85)。
   - 背景安全区与基准线（`baselineY = 0.66`）自动适配，支持御空飞行高空定位。
3. **单元测试 (`tests/three_stage.test.ts`)**:
   - 验证场景分层添加、槽位坐标换算与正交/透视矩阵计算。

---

## 4. 验收标准
- [x] 场景具备清晰的 2.5D 深度分层管理（`StageLayerManager` 5 层分立，Z 轴及 renderOrder 明确）。
- [x] 槽位与基准线坐标计算精确（`StageLayoutEngine` 5 槽位与飞行高度换算，正交/透视 1:1 像素映射）。
- [x] 单元测试 100% 通过（12/12 测试通过，全库累计 56 项测试全绿）。
- [x] TypeScript 类型无死角编译通过，导出 .d.ts 声明。

