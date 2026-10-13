# TASK-134: 高精度动漫级人物视觉重构与角色资产全面打磨 (Anime/Donghua Character Visual Overhaul)

- 状态: DONE
- 优先级: P0
- 负责人: AI Agent
- 关联模块: `src/drama/composer`, `src/engine/puppet/avatar`, `assets/characters`, `output`
- 完成时间: 2026-10-10T10:52:00+08:00

---

## 1. 任务背景与核心痛点诊断 (Problem Diagnosis)

用户强烈反馈：
> “我靠,你做的3d模型人物真的太烂了,你帮我优化,”

### 1.1 根本成因剖析
1. **代码几何涂鸦假人 (Origami Paper Cutouts)**:
   - 之前版本在 `src/engine/puppet/avatar/` 中将“模块化角色”误解为在无素材时通过 Canvas2D 路径函数（`ctx.roundRect`、`ctx.ellipse`、纯色三角形大袖）手绘几何多边形，导致角色像折纸纸偶或低幼 Flash 动画，质感粗糙。
2. **多题材原画资产缺失与错误绑定**:
   - 样本二（紫菱仙子）与样本三（林飞、蛮神裂山）缺少对应的高清立绘原画，且 `keyframe-composer.ts` 强制使用通用假人，未能根据剧情名称和设定智能映射到专属修仙/热血模型。
3. **镜头构图纵向锚定缺陷 (Head Clipping)**:
   - 在特写镜头 (`close_up`) 中，以脚底 `groundY = height * 0.98` 配合 `heightScale = 1.35` 放大角色，导致高个子、高马尾发带、道冠（如林飞、韩立）头部被屏幕顶边截断，五官严重出画。

---

## 2. 优化方案与实施措施 (Implementation Architecture)

### 2.1 高精国漫立绘资产生成与抠图入库
- 制作并接入 3 大题材、5 套高精透明底国风国漫角色艺术立绘：
  - **韩立** (`assets/characters/han_tianzun/`): 青衣道袍、御剑飞行、碧玉发冠、成男仙侠正气凛然；
  - **极阴祖师** (`assets/characters/evil_lord/`): 幽冥黑袍、白发阴鸷、元婴煞气；
  - **紫菱仙子** (`assets/characters/ziling_fairy/`): 冰魄神剑、紫霞仙裙、飘逸丝带、冰莲法环；
  - **林飞** (`assets/characters/lin_fei/`): 赤阳战袍、烈火灵剑、热血高马尾、少年坚毅目光；
  - **蛮神裂山** (`assets/characters/man_shen/`): 古铜肌理、蛮荒图腾、巨石重刃、体修力士威严霸气。
- 所有资产均完成精细 Alpha 透明通道抠图（边缘羽化，无白边黑边），并在 `assets/manifest.json` 注册角色别名与语音预设。

### 2.2 影视级运镜构图与纵向安全裕度 (Headroom Safety)
- **特写与中近景 (`close_up` / `medium_close_up`)**:
  - 彻底废除脚底死板贴地逻辑，改为基于顶部安全边距（`topMargin = height * 0.04 ~ 0.05`，留出 40~55px 顶空）反推 `groundY = topMargin + targetH`；
  - 呈现电影级胸腰部以上大魄力特写，发饰、高马尾、法冠 100% 完整入画；
  - 对白聚光灯焦点精确重置在角色面部与胸腔五官（`-targetH * 0.78`），柔化高光衬托面部神态。
- **对峙与打斗中景 (`medium_shot` / `combat`)**:
  - 缩放微调为 `0.88`，脚底锚定 `height * 0.94`，顶部留出 65px+ 充裕留白；
  - 左右双人拉开间距（主角 24% X 面向右，反派 76% X 面向左），双人眼神交汇正面交锋；
  - 脚底脚踏专属神通法印（御剑尾流、冰莲晶环、赤阳炎爆、幽冥煞气、碎石金芒），身侧两段式极速残影（Combat Ghosts）。

### 2.3 程序化模块化假人质感降级托底优化
- 在 `face-mesh-builder.ts` 中重构面部多层质感：
  - 皮肤径向渐变模拟赛璐璐立体光影，增设柔和蜜桃腮红（`rgba(251, 146, 178, 0.32)`）；
  - 动漫晶莹虹膜多渐变、内环同心瞳孔、星芒与反光双高光，飞扬眼线与双眼皮折痕。

---

## 3. 验收标准与交付物 (Acceptance Criteria)

- [x] 5 套核心角色全部拥有高精透明底原画资产，资产注册表健全。
- [x] 构图严谨：全景、对峙中景、说话人特写均具备 40px+ 顶部留白，彻底根治断头/削头现象。
- [x] 角色具备专属脚底神兵/法环、护体灵光、打斗残影与对白面部聚光灯。
- [x] 重新渲染全部 3 套影视级母带视频与剪映草稿。
- [x] 实机抽帧验证各镜头画面，画质达到商业短剧/推文漫剧水准。
- [x] 自动化测试套件与 TypeScript 类型检查 100% 通过。
