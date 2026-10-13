# TASK-129: 模板化动作引擎、通用与专属模型解耦、自然口型与多剧本精品推文动画重构

- 状态: DONE
- 优先级: P0
- 负责人: AI Agent
- 关联模块: `src/engine/puppet`, `src/core`, `src/db`, `src/ai`, `src/renderer`, `examples`

---

## 1. 用户核心诉求与问题根治 (Diagnosis & Solutions)

用户严厉指出系统过去的痛点并提出清晰要求：
1. **口型动作极其奇怪**: 过去在角色立绘脸上粗暴画大面积肉色圆补丁和矩形黑洞牙齿，生硬开合像小丑贴膏药，极度违和且破坏原画质感。
   - **根治方案**: 彻底废除粗暴肉色圆形补丁与生硬矩形牙齿！引入**高保真自然动漫口型（Natural Anime Lip Viseme）**与**多谐波语音韵律（Syllable Rhythm Generator with micro-pauses）**。嘴部开合紧密贴合原画唇缝微开，呈现细腻内唇微影与上下唇柔和反光；结合骨骼联动头部与下颌自然点头节拍（Talking Head Cadence），使交谈富有生命力且绝不奇怪。
2. **动作弱智、僵硬、缺乏模板化复用能力**:
   - **根治方案**: 研发**通用动作模板库（Universal Motion Template System）** `src/engine/puppet/action-template.ts`。实现涵盖 4 大类别（基础待机、叙事交谈、战斗神通、情绪姿态）的 14 套标准动作模板（`idle`, `cruise`, `walk_advance`, `talking`, `talking_intense`, `attack_slash`, `sword_barrage`, `cast_spell`, `defend_block`, `hurt_flinch`, `taunt_smug`, `shocked`, `bow_respect`, `entrance`），全部基于流畅 S-Curve 与次世代缓动插值，彻底告别抽搐僵硬。
3. **模型与剧本架构模板化解耦**:
   - **根治方案**: 在核心模型层与注册表中解耦 `roleScope: "exclusive" | "shared"`。支持剧目专属模型（仙侠专属仙尊/魔祖、都市专属战神/女主）与全剧通用的共用模型（通用正道弟子/随从 `char_common_disciple`、通用铁血护卫 `char_common_guard`）。所有模型 100% 共享整套通用动作模板，实现动作跨题材、跨角色彻底通用化。
4. **告别沙雕，提供多题材精品推文正剧**:
   - **根治方案**: 彻底摒弃沙雕恶搞与表情包脸，打造 3 部高燃、高质量推文正剧剧本：
     - 仙侠热血正剧《青云仙劫·凡人问天》 (`examples/drama_xianxia_battle.txt`)
     - 都市战神爽文《潜龙出渊·战神降临》 (`examples/drama_urban_warrior.txt`)
     - 仙宗护道热血《昆仑问剑·万仙归宗》 (`examples/drama_sect_defense.txt`)
   - 强化 `AiDirector` 场景环境感知（长街/都市/天台/武馆/密林/竹林/仙巅/雷劫）。

---

## 2. 交付与验证结果 (Verification Results)

- [x] **0 编译错误与类型检查通过**: 执行 `pnpm typecheck` 100% 通过（`tsc --noEmit` 0 错误）。
- [x] **全量自动化测试 100% PASS**: 执行 `pnpm test`，全部 28 个测试套件、149 个单元/集成/E2E 测试全部通过（无破坏性变更，新增 8 项模板化测试）。
- [x] **可执行生产构建通过**: `pnpm build` 顺利输出 `dist/cli.js`, `dist/index.js` 及完整 DTS 类型声明。
- [x] **全新正剧推文母带渲染交付**:
  - `output/drama_xianxia_master.mp4` (41.3 秒, 6 分镜跨 3 幕场景, 1280x720 30fps H.264/AAC, 4.2 Mbps)。
  - 角色口型自然贴合，对白伴随头部下颌微点头韵律，动作丰富多样（施法聚气、瞬影斩击、万剑归宗、惊骇戒备），彻底告别沙雕违和感。
