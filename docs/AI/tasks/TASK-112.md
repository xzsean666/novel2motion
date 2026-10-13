# TASK-112: Three.js 3D 摄像机平滑运镜、推拉特写与打斗震屏控制器

## 1. 任务元数据
- **任务 ID**: TASK-112
- **状态**: DONE
- **优先级**: P0
- **所属模块**: `src/engine/camera`
- **依赖任务**: TASK-111

---

## 2. 任务目标
构建现代电影级 3D 运镜系统（`CameraController`）。实现平滑平移（Pan）、特写推拉镜头（Dolly Zoom）、多轴衰减震屏（Camera Shake）与呼吸微动（Idle Breathing Float），彻底摆脱死板视角。

---

## 3. 详细设计与实现要求
1. **平滑运镜与插值 (`src/engine/camera/camera-controller.ts`)**:
   - 支持沿 X/Y 轴平移运镜、沿 Z 轴推近/拉远特写（Zoom In/Out）。
   - 支持缓动曲线（Cubic / Quad Easing）平滑过渡。
2. **打斗高频震屏系统 (`src/engine/camera/camera-shake.ts`)**:
   - 接收打斗命中、雷暴、重击事件，触发带高斯阻尼衰减的多轴随机高频位移。
   - 支持震级强度（Intensity: Light / Heavy）与持续时长（DurationMs）。
3. **呼吸与巡航浮动 (`src/engine/camera/idle-motion.ts`)**:
   - 为镜头增加微妙的正弦呼吸浮动，增强场景灵动感。
4. **单元测试 (`tests/camera_controller.test.ts`)**:
   - 验证运镜插值、震屏衰减与摄像机视口矩阵计算。

---

## 4. 验收标准
- [x] 摄像机支持平移、特写推拉与震屏（Pan/Zoom/Shake/Idle Breathing 完整集成）。
- [x] 单元测试 100% 通过（11/11 测试通过，全库累计 67 项测试全绿）。
- [x] TypeScript 类型无死角编译通过，导出 .d.ts 声明。

