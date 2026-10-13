# TASK-102: 领域数据契约与动画分镜 DSL 规范定义

## 1. 任务元数据
- **任务 ID**: TASK-102
- **状态**: DONE
- **优先级**: P0
- **所属模块**: `src/core`
- **依赖任务**: TASK-101

---

## 2. 任务目标
在 `src/core/` 中定义高内聚、强类型的领域模型与动画分镜 DSL，使用 TypeScript 接口与 Zod 进行全量运行时校验。

---

## 3. 详细设计与实现要求
1. **角色模型 (`src/core/models/character.ts`)**:
   - `CharacterProfile`: id, name, aliases, description, voiceConfig (voiceId, speed, pitch), visualAssets (body, limbs, expressions, memeFaces)。
2. **背景模型 (`src/core/models/background.ts`)**:
   - `BackgroundAsset`: id, name, tags, layers (far, mid, near), safeArea (baselineY, minX, maxX)。
3. **分镜 DSL (`src/core/models/dsl.ts`)**:
   - `ScenePlan`: sceneId, backgroundId, bgm, initialStaging, timelineEvents。
   - `TimelineEvent`: 对白（Dialogue）、打斗攻击（Attack）、受击（Hit）、位移（Move）、旁白（Narration）、运镜（Camera）。
4. **时间轴模型 (`src/core/models/timeline.ts`)**:
   - 毫秒级时间轴，包含角色各部件的 3D/2.5D Transform 关键帧、表情贴图关键帧、摄像机运镜关键帧、音频提示。
5. **单元测试 (`tests/core_models.test.ts`)**:
   - 验证 DSL Schema 的序列化与反序列化，边界情况校验。

---

## 4. 验收标准
- [x] Zod 校验覆盖所有核心模型（CharacterProfile, BackgroundAsset, ScenePlan, StoryPlan, CompiledSceneTimeline）。
- [x] 单元测试 100% 验证通过（7/7 测试通过）。
- [x] TypeScript 类型无死角编译通过，导出 .d.ts 声明。
