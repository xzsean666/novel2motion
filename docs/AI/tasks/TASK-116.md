# TASK-116: 国风马善政毛笔行楷大字金黄描边卡点字幕排版与渲染引擎

## 1. 任务元数据
- **任务 ID**: TASK-116
- **状态**: DONE
- **优先级**: P0
- **所属模块**: `src/engine/subtitle`
- **依赖任务**: TASK-111

---

## 2. 任务目标
打造符合爆款沙雕短视频特质的卡点大字字幕排版与渲染引擎。加载 `assets/fonts/MaShanZheng-Regular.ttf` 国风毛笔行楷字体，渲染金黄色填充、厚重纯黑立体描边与深沉投影的高清字幕网格，彻底消除文字发虚现象。

---

## 3. 详细设计与实现要求
1. **毛笔字体加载与光栅化 (`src/engine/subtitle/font-rasterizer.ts`)**:
   - 优先加载 `assets/fonts/MaShanZheng-Regular.ttf`（备选 `ZCOOLKuaiLe-Regular.ttf`）。
   - 利用 Canvas API 进行超高保真字形渲染（大字号：约画布高度 6.5%~7.5%）。
2. **爆款配色与三层渲染结构 (`src/engine/subtitle/calligraphy-subtitle.ts`)**:
   - 底层：4px 下方深黑阴影（Drop Shadow）。
   - 中层：5px~6px 纯黑厚重描边（Heavy Black Outline），确保在任何复杂背景上均清晰可辨。
   - 顶层：荧光金黄（`#FFDE00` / `#FFE600`）高饱和度文字填充。
3. **Three.js 字幕网格挂载 (`src/engine/subtitle/subtitle-mesh.ts`)**:
   - 生成动态 Canvas Texture 并挂载于 Three.js 最顶层正交平面（Z = 300）。
   - 严格跟随对白时间戳（`SubtitleCue.startTimeMs` ~ `endTimeMs`）显示与隐藏。
4. **单元测试 (`tests/subtitle_render.test.ts`)**:
   - 验证字幕纹理生成、字符测量排版与时间同步触发。

---

## 4. 验收标准
- [x] 成功渲染马善政毛笔行楷金字黑边字幕（`FontRasterizer` 三层高对比度金黄/烈焰红/素白渲染）。
- [x] 字幕边缘锐利、对比度极高，无半透明毛刺（`SubtitleMesh` 挂载于 Z=300 顶层平面）。
- [x] 单元测试 100% 通过（5/5 测试通过，全库累计 94 项测试全绿）。
- [x] TypeScript 类型无死角编译通过，导出 .d.ts 声明。

