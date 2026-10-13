# TASK-127: 角色骨骼蒙皮与动画节奏修复

- 状态: REVIEW
- 优先级: P0
- 范围: 角色网格蒙皮、离线帧渲染、分镜时间轴、镜头与命中特效
- 背景: 用户反馈现有视频质量差，要求正常动画效果。

## 修改前计划

1. 用 Three.js Skeleton/SkinnedMesh 将现有透明立绘绑定到头、双臂、衣摆骨骼，离线输出必须实际使用蒙皮顶点。
2. 对白、攻击、命中和镜头在事件切换时启动；攻击包含蓄力、出手、命中、恢复，禁止每帧重启。
3. 减少遮挡立绘的色块与光效，适配横屏、竖屏和不同分辨率。
4. 输出独立新样片，检查动作连续性、人物可见性和特效消退；执行类型检查、构建和测试。

## 验收标准

- 角色手臂、头部与衣摆相对于身体有独立运动。
- 口型随头部蒙皮一起运动，听者不持续张嘴。
- 攻击蓄力时目标不提前受伤，命中特效只触发一次并能消退。
- camera/sfx 事件不产生额外空白等待；切换对白清除上次攻击状态。
- 提供可复现样片脚本与真实验证结果，不把编码参数合格等同于艺术质量合格。

## 参考

- https://en.esotericsoftware.com/spine-examples-spineboy : 身体骨骼层级、动作分层、hoverboard 脚部约束。
- https://en.esotericsoftware.com/spine-meshes : 网格权重与骨骼变形。
- 仅参考技术设计，不复制 Spine 示例素材或引入 Spine 商业运行时。

## 实现与验证

- `src/engine/puppet/sprite-rig.ts`: Three.js 六骨骼蒙皮，归一化权重，固定脚部锚点。
- `src/renderer/sprite-mesh-rasterizer.ts`: 蒙皮三角网格实际出片；口型先绘入纹理以随头部移动；修正上下坐标方向。
- `src/engine/scene-player.ts`: 一次进入事件、动作衔接、蓄力/前冲/命中/收势，避免提前受伤、逐帧白闪与残留特效。
- `src/ai/`: 按文本提及顺序绑定攻击方/目标；识别雷霆、玄雷与挥剑；显式挥剑编排为近身斩击。
- 镜头按事件启动；减少大面积光罩与重复飞剑；字幕按输出尺寸缩放，重新测量实际字宽；旧缓存因渲染版本更新自动失效。
- 校正原有过期的 SDK 队列类型/参数及测试数据类型；CLI 测试注入离线 TTS，避免网络配音超时。

实际执行：

- `pnpm typecheck`: PASS。
- `pnpm build`: PASS，ESM 与 DTS 构建成功。
- `pnpm test`: 27 个套件、141 项测试通过。
- 最后的剑光锚点与前冲距离调整后，`pnpm exec vitest run tests/animation_quality.test.ts tests/headless_renderer.test.ts`: 12 项通过，类型检查与构建再次通过。
- `pnpm render:preview`: 实际生成 `output/animation_quality.mp4`，2 个镜头，18.855 秒，1280x720，30fps，H.264/AAC，10,367,002 bytes。
- `scratch/frames/animation_quality_contact.png` 与 `animation_quality_slash.png`: 全片连续抽帧与挥剑连续抽帧，用于检查人物方向、手臂变化、剑弧、命中与恢复。

## 交接与限制

工程验证完成，状态为 REVIEW，等待用户观看样片评价视觉风格。原 `output/xianxia_master.mp4` 保留。未执行提交或推送。

现有角色素材是整张 PNG，并非完整分层角色或 3D 模型。此实现提供局部骨骼形变和明确动作节奏，不宣称达到逐帧动画片或完整 3D 动画的艺术质量。背面、转身、走跑、夸张大幅动作需要进一步制作角色资产。
