# TASK-130: 全面架构升级跃迁：工业级现代 AI 短剧/漫剧全流程生成引擎 (Generative AI Mini-Drama Pipeline)

- 状态: DONE
- 优先级: P0
- 负责人: AI Agent
- 关联模块: `src/drama`, `src/cli`, `tests`

---

## 1. 根本痛点诊断与方向修正 (Diagnosis & Architectural Pivot)

### 1.1 过去方向的根本错误
- **错误定位**: 过去系统将“小说转视频”误判为“2D 纸片人傀儡动效（Paper Doll Rig）+ 在立绘脸上画几何椭圆/贝塞尔曲线假嘴（FaceAnimator）+ 2D Canvas 平移”。
- **残酷现实**: 这种输出形态本质上是 2021 年代的“低幼沙雕推文/搞笑表情包贴纸动画”，与当今抖音、快手、ReelShort、DramaBox 等主流平台要求的**工业级影视级 AI 短剧/漫剧**相去甚远。用户对短剧的预期是影视镜头感、高画质扩散视频、真实面部口型微表情与剧情张力，而非纸片人皮影戏！

### 1.2 工业级短剧全流程标准 (Industry Standard)
根据对 GitHub（ViMax、huobao-drama、AIDrama Studio、Toonflow、SkyReels-V1）及行业生产线（Dify + ComfyUI + 可灵/海螺）的深度研判，现代 AI 短剧标准流水线包含 6 大核心支柱：
1. **AI 导演剧本拆解 (Screenplay Director)**: 黄金 3 秒冲击钩子、景别蒙太奇 (特写/中景/全景)、运镜指令 (Dolly In/Out, Pan, Whip Zoom)、多模态提示词 (FLUX/SDXL 画面 Prompt + 可灵/海螺/通义万相 视频动态 Prompt)。
2. **角色一致性体系 (Character Bible & Consistency)**: 角色人设档案、多角度参考图、LoRA/IP-Adapter 权重锚定，避免每镜头换脸。
3. **多模型视频生成适配器 (Video Generator Providers)**: 接入快手可灵 (Kling AI)、MiniMax 海螺 (Hailuo AI)、阿里通义万相 (Wan 2.1)、本地 ComfyUI，并配备高质感电影级运镜引擎 (`CinematicMotionProvider`)。
4. **真实神经人脸口型同步 (Neural Lip-Sync)**: 预留 LivePortrait / MuseTalk / Wav2Lip 驱动标准，彻底废弃贴纸画嘴。
5. **视听多轨非线性剪辑合成 (Cinematic Composer)**: 9:16 移动端竖屏主流画幅、镜头蒙太奇无缝拼接、情绪 TTS 配音、SFX 击打音效、电影级配乐 (自适应 -16dB 智能音频闪避 Audio Ducking)、爆款短剧大字字幕。
6. **剪映/CapCut 桌面工程草稿直通 (Jianying Draft Exporter)**: 自动生成 `draft_content.json`，支持创作者在剪映中一键打开二次精剪与 4K 母带导出！

---

## 2. 核心架构与代码交付 (Deliverables)

1. **短剧领域模型与 DSL** (`src/drama/models/drama-dsl.ts`):
   - 强类型规范景别 (`ShotScale`)、运镜语言 (`CameraMotion`)、转场 (`DramaTransition`)、双语 Prompt、情绪对白与 SFX 打点。
2. **AI 导演分镜引擎** (`src/drama/director/drama-director.ts`):
   - 小说段落自动语义感知，提取冲突对白与打斗爆发，生成黄金 3 秒空镜钩子与全套分镜头。
3. **角色资产与一致性库** (`src/drama/consistency/character-bible.ts`):
   - 管理角色肖像、外貌特征与提示词注入，锁定视觉连续性。
4. **视频生成提供商体系** (`src/drama/video/`):
   - `IVideoGeneratorProvider` 统一抽象。
   - `KlingVideoProvider`: 快手可灵图生视频与运镜控制。
   - `HailuoVideoProvider`: MiniMax 海螺电影级连贯性。
   - `WanVideoProvider`: 通义万相 Wan 2.1 适配。
   - `CinematicMotionProvider`: 离线电影级运镜回退引擎（平滑 Ken Burns 运镜 + 暗角 + 景深视差）。
   - `MockVideoProvider`: 极速回归测试验证。
5. **影视关键帧画面合成器** (`src/drama/composer/keyframe-composer.ts`):
   - 基于 `@napi-rs/canvas` 与原画素材合成 16:9 影视分镜关键帧：智能匹配原画背景，人物立绘左右对峙（韩立朝右、极阴朝左，间距合理无重叠），台词镜头单人中心大特写，国风烫金书法大字字幕与青玉说话人标签烧录，并叠加雷电剑气微光。
6. **剪映/CapCut 工程草稿导出器** (`src/drama/composer/jianying-exporter.ts`):
   - 导出 100% 兼容剪映多轨道（视频轨、音频轨、音效轨、文本字幕轨）的 `draft_content.json`，已全面支持 16:9 横屏。
7. **影视级视听多轨合成器** (`src/drama/composer/drama-composer.ts`):
   - FFmpeg 蒙太奇无缝压制、多音轨混合、智能闪避与 SRT 字幕烧录。
8. **全流程流水线与 CLI 命令** (`src/drama/pipeline.ts`, `src/cli/index.ts`):
   - 默认画幅全面设为 16:9 横屏 (1920x1080)；
   - `novel2motion drama <story.txt> -o <out.mp4> --aspect 16:9 --provider <provider> --export-draft <draft.json>`
   - `novel2motion storyboard <story.txt> -o <storyboard.json>`
9. **实机母带与抽帧自检**:
   - `output/drama_landscape_master.mp4` (1920x1080, 24fps, 45.8s, 14 镜头)；
   - 第 8 秒对峙帧与第 15 秒对白特写帧实机抽帧检查确认：横屏 16:9、人物双雄在场正视、台词大字字幕清晰烧录。
10. **全面测试验证**:
    - `tests/drama_pipeline.test.ts` (5 tests PASS)
    - `tests/drama_cli.test.ts` (2 tests PASS)
    - 全仓库 30 个测试套件、156 项自动化测试 100% PASS。

---

## 3. 验收标准达成情况

- [x] 小说文本自动编导为影视级分镜脚本（景别、运镜、双语提示词、对白情绪）。
- [x] 提供多模型短剧视频生成驱动（可灵、海螺、万相、本地电影级运镜）。
- [x] 原生支持 16:9 影视横屏（1920x1080 默认）与 9:16 移动端竖屏短剧。
- [x] 画面人物真实在场、站位对峙清晰无重叠、对白大字字幕醒目烧录。
- [x] 支持直接导出剪映桌面版工程草稿，无缝融入专业短剧后期工作流。
- [x] 全流程无缝集成 `node-task-runtime` 与 `kvdb-sdk`。

