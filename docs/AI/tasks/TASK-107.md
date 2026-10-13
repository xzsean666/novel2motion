# TASK-107: AI 生图扩展引擎：新角色/新背景按需生图与自动入库

## 1. 任务元数据
- **任务 ID**: TASK-107
- **状态**: DONE
- **优先级**: P2
- **所属模块**: `src/ai`
- **依赖任务**: TASK-103, TASK-106

---

## 2. 任务目标
构建 AI 生图按需扩展引擎（`ImageGenerationService`）。当小说中出现既有角色库或背景库中未收录的新人物或新场景时，由 AI 自动生成标准 Prompt、调用生图 API、通过抠图管线处理并持久化沉淀入本地素材库，杜绝角色漂移与场景断裂。

---

## 3. 详细设计与实现要求
1. **Prompt 自动推导引擎 (`src/ai/prompt-synthesizer.ts`)**:
   - 根据小说人设描写（如“白衣飘飘青年剑客”）生成标准化的白底无透视 2D 动漫立绘提示词。
   - 根据场景描写生成 16:9 动漫壁纸级背景提示词。
2. **生图客户端适配器 (`src/ai/image-client.ts`)**:
   - 支持 OpenAI DALL-E 3、本地 ComfyUI / Stable Diffusion WebUI 端点。
   - 具备测试环境的 Mock 生图回落，确保离线构建与测试通过。
3. **自动入库管线 (`src/ai/asset-onboarding.ts`)**:
   - 生成的立绘自动走 `MattingPipeline` 抠图与包围盒裁剪。
   - 写入 `CharacterRegistry` 或 `BackgroundRegistry`。
4. **单元测试 (`tests/image_generator.test.ts`)**:
   - 验证 Prompt 生成、Mock 生图调用与自动入库流程。

---

## 4. 验收标准
- [x] 完整支持未知人物/未知地点的自动 Prompt 推导、生成与注册流程。
- [x] 生成角色通过 `MattingPipeline` 自动消除纯白底并推导锚点。
- [x] 单元测试 100% 通过（3/3 测试通过，全库累计 35 项测试全绿）。
- [x] TypeScript 类型无死角编译通过，导出 .d.ts 声明。
