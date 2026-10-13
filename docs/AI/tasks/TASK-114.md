# TASK-114: Three.js 真人魔性人脸贴图动态嵌合材质

## 1. 任务元数据
- **任务 ID**: TASK-114
- **状态**: DONE
- **优先级**: P0
- **所属模块**: `src/engine/materials`
- **依赖任务**: TASK-113

---

## 2. 任务目标
实现头部面部贴图与发髻发丝动态无缝嵌合材质（`MemeFaceMaterial`）。使角色能够在保持仙风道骨的长发发簪外轮廓完整的前提下，实时无缝切换张学友经典魔性咆哮脸、冷峻剑客脸、白须老祖脸等真人表情，打造强烈沙雕反差感。

---

## 3. 详细设计与实现要求
1. **面部 UV 与遮罩材质 (`src/engine/materials/meme-face-material.ts`)**:
   - 头部 Mesh 细分为底层面部材质与顶层发丝遮罩层。
   - 采用 `THREE.MeshBasicMaterial` / Shader 材质，支持纹理即时替换。
2. **表情纹理映射表 (`src/engine/materials/expression-textures.ts`)**:
   - `Normal`: 冷峻剑客 / 威严老怪。
   - `Shocked`: **张学友经典“食屎啦你”咆哮大笑脸**。
   - `Hurt`: 张学友大惊失色脸 + 汗滴纹理。
   - `Angry`: 怒目圆睁青筋微凸人脸。
3. **单元测试 (`tests/meme_face_material.test.ts`)**:
   - 验证材质切换响应时间、UV 映射正确性与贴图内存释放。

---

## 4. 验收标准
- [x] 支持即时动态切换张学友魔性脸与常规人脸（`MemeFaceMaterial` 与 `ExpressionTextureManager` 毫秒级切换）。
- [x] 边缘自然无接缝，`alphaTest: 0.05` 彻底消除半透明杂边。
- [x] 单元测试 100% 通过（7/7 测试通过，全库累计 83 项测试全绿）。
- [x] TypeScript 类型无死角编译通过，导出 .d.ts 声明。

