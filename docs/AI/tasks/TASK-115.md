# TASK-115: Three.js 粒子特效与打斗白闪视效管线

## 1. 任务元数据
- **任务 ID**: TASK-115
- **状态**: DONE
- **优先级**: P1
- **所属模块**: `src/engine/vfx`
- **依赖任务**: TASK-111

---

## 2. 任务目标
构建现代仙侠战斗视觉特效管线。实现天劫紫色曲折闪电弧（九天玄雷）、青竹蜂云剑绿色剑气流光拖尾粒子、受击全屏白闪顿帧（Hit Flash）与法宝辉光。

---

## 3. 详细设计与实现要求
1. **九天玄雷闪电特效 (`src/engine/vfx/lightning-effect.ts`)**:
   - 利用 `THREE.Line` / 折线几何体与动态着色器生成紫金色曲折闪电弧。
   - 随时间帧随机分支分叉，并在雷击瞬间触发全屏瞬间白闪。
2. **青竹蜂云剑剑气拖尾粒子 (`src/engine/vfx/sword-trail-particles.ts`)**:
   - 基于 `THREE.Points` / `BufferGeometry` 创建粒子发射器。
   - 飞剑移动时在尾部持续发射绿色灵力光斑与星点粒子，带生命周期衰减（Alpha & Scale Fade）。
3. **视觉后处理与打斗顿帧 (`src/engine/vfx/screen-fx.ts`)**:
   - `ScreenFlash`: 受击瞬间覆盖白色半透明遮罩（1~3 帧快速衰减）。
   - `CameraShakeSync`: 与音频重击音效精确对齐，触发高频震屏。
4. **单元测试 (`tests/vfx_pipeline.test.ts`)**:
   - 验证粒子生命周期更新、白闪透明度计算与特效触发器正确性。

---

## 4. 验收标准
- [x] 具备雷电 (`LightningEffect`)、剑气流光粒子 (`SwordTrailParticles`) 与受击白闪视效 (`ScreenFlash` / `VFXManager`)。
- [x] 单元测试 100% 通过（6/6 测试通过，全库累计 89 项测试全绿）。
- [x] TypeScript 类型无死角编译通过，导出 .d.ts 声明。

