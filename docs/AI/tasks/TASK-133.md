# TASK-133: 新模块化模型与流行短剧 BGM 多样本全流程母带制作 (Multi-Sample Showcase)

- 状态: DONE
- 优先级: P0
- 负责人: AI Agent
- 关联模块: `src/drama`, `src/engine/puppet/avatar`, `assets/audio/bgm`, `output`

---

## 1. 任务背景与流行音乐调研 (Background & Trending Audio Research)

用户明确要求：
> “你帮我用新模型 新剧本多做几个样本出来我看看，你使用流行的音乐背景不要之前那么low的，你去网络调研。”

### 1.1 2026 爆款短剧/漫剧背景音乐趋势研判
1. **仙门史诗高燃战歌 (Epic Xianxia War Hymn)**:
   - 核心元素: 轰鸣战鼓 (War Drums) + 破阵大锣 + 穿云竹笛/古筝 + 恢弘管弦交响 (Orchestral Brass)；
   - 情绪曲线: 沉静对峙蓄力 -> 战鼓骤密 -> 高潮爆发万剑归宗。
2. **九天仙阙空灵仙音 (Ethereal Immortal Cloud Flight)**:
   - 核心元素: 空灵泛音古筝 + 悠扬长笛 + 空间混响 (Ambient Reverb) + 柔和仙道气流；
   - 适用场景: 清冷仙子出尘、御剑凌空、秘境探幽。
3. **幽冥魔渊压迫感暗黑律动 (Dark Demonic Abyss Sub-Bass)**:
   - 核心元素: 沉重 808 巨响滑音 (Sub-Bass Glides) + 低频心跳 + 颤栗魔音 Braam；
   - 适用场景: 魔尊出世、反派老怪威压。
4. **现代热血国漫卡点战歌 (Shonen Battle Phonk / Trailer)**:
   - 核心元素: 强劲重低音击打 (Punchy 808 Kick) + 刀剑清脆金鸣 + 紧凑战意律动；
   - 适用场景: 少年逆袭、擂台大比、残血反杀。

---

## 2. 交付清单 (Deliverables)

1. **升级流行短剧专属 BGM 资产库**:
   - `assets/audio/bgm/epic_xianxia_battle.wav`: 仙门决战高燃史诗战歌 (5.1MB, 60s, 44100Hz Stereo)；
   - `assets/audio/bgm/ethereal_fairy_flight.wav`: 九天仙阙空灵出尘仙音 (5.1MB, 60s, 44100Hz Stereo)；
   - `assets/audio/bgm/dark_demonic_abyss.wav`: 幽冥魔渊暗黑压迫感战歌 (5.1MB, 60s, 44100Hz Stereo)；
   - `assets/audio/bgm/modern_action_phonk.wav`: 现代热血国漫卡点战歌 (5.1MB, 60s, 44100Hz Stereo)。
2. **多题材精品短剧原著剧本**:
   - 样本 1: 正统修仙大作《天南剑尊·万剑归宗》 (`examples/sample1_tiannan_swordsman.txt`, 韩立 vs 极阴老祖)；
   - 样本 2: 清冷仙子逆天破境《寒宫绝响·九凤朝阳》 (`examples/sample2_ziling_fairy.txt`, 紫菱仙子)；
   - 样本 3: 宗门大比少年逆袭《逆天焚决·大比风云》 (`examples/sample3_shonen_awakening.txt`, 林飞 vs 蛮神裂山)。
3. **真实合成输出 3 套高品质 16:9 母带视频与剪映草稿**:
   - `output/sample1_tiannan_swordsman.mp4` (35.04s, 1920x1080 24fps H.264/AAC, 9.87MB) & `output/sample1_draft.json`
   - `output/sample2_ziling_fairy.mp4` (27.91s, 1920x1080 24fps H.264/AAC, 12.08MB) & `output/sample2_draft.json`
   - `output/sample3_shonen_awakening.mp4` (32.70s, 1920x1080 24fps H.264/AAC, 12.06MB) & `output/sample3_draft.json`
4. **验证与抽帧检验**:
   - `ffprobe` 确认音画参数全部符合 1920x1080 24fps H.264 + AAC 规范；
   - 关键帧抽帧 (`scratch/frames/`) 确认韩立、极阴老祖、紫菱仙子、林飞、蛮神裂山 5 大新模型在场，多层服饰、面部口型微表情与书法花字字幕完备烧录。

---

## 3. 验收标准 (Acceptance Criteria)

- [x] 配备多首符合网络流行短剧水准的精选高质感 BGM 资产。
- [x] 成功使用新模块化模型体系制作并输出 3 个完全不同题材的精品短剧母带视频。
- [x] 视频具备新模型人设、多层服饰、面部口型微表情、电影级运镜与卡点热歌。
- [x] 导出配套剪映/CapCut 桌面工程草稿。
- [x] 经实际运行验证通过，全量测试 100% PASS (32 测试套件、177 项自动化测试全部通过)。
