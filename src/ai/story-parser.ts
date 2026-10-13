import { StoryChunk } from "./story-chunk.js";
import { CharacterBinder } from "./character-binder.js";

export class StoryParser {
  constructor(private readonly binder: CharacterBinder) {}

  /**
   * Infers meme face expression based on dialogue text and speech verbs.
   */
  private inferMemeFace(text: string, verbContext = ""): StoryChunk["suggestedMemeFace"] {
    const combined = `${verbContext} ${text}`;

    if (
      /震惊|怎么可能|难以置信|瞳孔微缩|倒吸一口凉气|什么！？|嘶！|骇然|失色|大惊|高呼/.test(combined)
    ) {
      return "shocked";
    }

    if (
      /怒吼|找死|狂怒|暴怒|纳命来|杀意|冷喝|放肆|受死|厉声|喝道|大喝|死期|怒斥|咆哮/.test(combined)
    ) {
      return "angry";
    }

    if (
      /冷笑|嗤笑|嘴角微扬|不过如此|雕虫小技|跳梁小丑|淡然一笑|轻笑/.test(combined)
    ) {
      return "smug";
    }

    if (
      /冷汗|苦笑|尴尬|无奈|擦了擦额头|心虚/.test(combined)
    ) {
      return "sweat";
    }

    if (
      /大哭|痛哭|惨呼|呜咽|哀嚎|悲恸/.test(combined)
    ) {
      return "crying";
    }

    if (
      /全力一击|剑气如虹|杀！|斩！|迎战/.test(combined)
    ) {
      return "battle";
    }

    return "normal";
  }

  /**
   * Detects combat actions and matching sound effects.
   */
  private detectCombatDetails(text: string): {
    isCombat: boolean;
    keywords: string[];
    suggestedSfx?: string;
  } {
    const keywords: string[] = [];
    let suggestedSfx: string | undefined;

    if (/雷电|雷霆|玄雷|天雷|天劫|霹雳|狂雷|金雷|轰雷|神雷/.test(text)) {
      keywords.push("thunder");
      suggestedSfx = "sfx_thunder_blast";
    }

    if (/飞剑|剑阵|剑光|剑气|青竹|出鞘|长剑/.test(text)) {
      keywords.push("sword");
      if (!suggestedSfx) suggestedSfx = "sfx_sword_slash";
    }
    if (/挥剑|挥出|斩向|劈向|突刺|拔剑|一剑/.test(text)) {
      keywords.push("slash");
      if (!suggestedSfx) suggestedSfx = "sfx_sword_slash";
    }

    if (/倒飞|吐血|击飞|重创|惨叫|轰然倒地|受创/.test(text)) {
      keywords.push("hit");
      suggestedSfx = "sfx_hit_impact";
    }

    if (/重拳|铁拳|轰出一拳|一拳/.test(text)) {
      keywords.push("punch");
      suggestedSfx = "sfx_punch_heavy";
    }

    return {
      isCombat: keywords.length > 0,
      keywords,
      suggestedSfx
    };
  }

  /**
   * Parses arbitrary novel text into structured StoryChunks with character binding.
   */
  async parse(rawText: string): Promise<StoryChunk[]> {
    const chunks: StoryChunk[] = [];
    this.binder.reset();

    // Split text by lines, trimming whitespace
    const paragraphs = rawText
      .split(/\r?\n/)
      .map((p) => p.trim())
      .filter(Boolean);

    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      // Regex to detect Chinese and English quotes
      const quoteRegex = /([“"「])([^”"」]+)([”"」])/g;
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = quoteRegex.exec(paragraph)) !== null) {
        const preQuote = paragraph.slice(lastIndex, match.index).trim();
        const quoteContent = match[2].trim();
        lastIndex = match.index + match[0].length;

        // Extract speech verb suffix (e.g. "厉声喝道：", "冷笑道：")
        let speakerRaw: string | undefined;
        let speechVerb = "";
        let narrativeBeforeSpeaker = "";

        const verbPattern =
          /(?:嘴角微扬|眼中寒芒一闪|神色自若|眉头微皱|面色微变)?\s*(?:冷冷|厉声|怒声|冷冷地|突然|豁然|缓缓)?\s*(?:冷笑道|冷笑|冷哼道|冷哼|厉声喝道|大喝道|大喝|喝道|怒吼道|怒吼|沉声道|大笑道|大笑|笑道|微笑道|微笑|嗤笑道|嗤笑|喃喃自语道|喃喃道|喃喃|惊呼道|惊呼|大惊失色|神色骇然|震惊失色|震惊高呼|高呼|咆哮|暴怒咆哮|问道|答道|叹道|道|说)[:：]?$/;

        // Check if preQuote mentions any registered character first!
        let boundChar = await this.binder.bindSpeaker(undefined, preQuote);
        if (boundChar) {
          speakerRaw = boundChar.name;
          // Find the exact location of the longest matching character name in preQuote
          const sortedNames = [boundChar.name, ...boundChar.aliases].sort((a, b) => b.length - a.length);
          let bestPos = -1;
          let matchedName = "";
          for (const n of sortedNames) {
            const p = preQuote.lastIndexOf(n);
            if (p !== -1) {
              bestPos = p;
              matchedName = n;
              break;
            }
          }
          if (bestPos > 0) {
            narrativeBeforeSpeaker = preQuote.slice(0, bestPos).replace(/[,，;；]$/, "").trim();
          } else {
            narrativeBeforeSpeaker = "";
          }
          speechVerb = preQuote.slice(bestPos + matchedName.length);
        } else {
          // Fallback to verbPattern regex extraction
          const verbMatch = preQuote.match(verbPattern);
          if (verbMatch && verbMatch.index !== undefined) {
            speechVerb = verbMatch[0];
            const beforeVerb = preQuote.slice(0, verbMatch.index).trim();
            const speakerMatch = beforeVerb.match(/([\u4e00-\u9fa5a-zA-Z0-9_]{1,8})$/);
            if (speakerMatch) {
              speakerRaw = speakerMatch[1];
              narrativeBeforeSpeaker = beforeVerb
                .slice(0, speakerMatch.index)
                .replace(/[,，;；]$/, "")
                .trim();
              boundChar = await this.binder.bindSpeaker(speakerRaw);
            } else {
              narrativeBeforeSpeaker = beforeVerb;
            }
          } else {
            narrativeBeforeSpeaker = preQuote;
          }
        }

        // If there is actual narrative text preceding the speaker attribution, analyze it
        if (narrativeBeforeSpeaker) {
          const combat = this.detectCombatDetails(narrativeBeforeSpeaker);
          const mentions = await this.binder.findMentions(narrativeBeforeSpeaker);
          chunks.push({
            id: `chunk_${++chunkIndex}`,
            type: combat.isCombat ? "combat" : "narration",
            text: narrativeBeforeSpeaker,
            boundSpeakerId: mentions[0]?.id,
            boundTargetId: mentions[1]?.id,
            actionKeywords: combat.keywords,
            suggestedSfx: combat.suggestedSfx,
            suggestedMemeFace: combat.isCombat ? "battle" : "normal"
          });
        }

        if (!boundChar && !speakerRaw) {
          // Try resolving alternate speaker
          boundChar = await this.binder.resolveAlternatingSpeaker();
        }

        const memeFace = this.inferMemeFace(quoteContent, speechVerb);

        chunks.push({
          id: `chunk_${++chunkIndex}`,
          type: "dialogue",
          text: quoteContent,
          speakerRaw: boundChar?.name || speakerRaw,
          boundSpeakerId: boundChar?.id,
          actionKeywords: [],
          suggestedMemeFace: memeFace
        });
      }

      // Trailing narrative after last quote
      const remaining = paragraph.slice(lastIndex).trim();
      if (remaining) {
        const combat = this.detectCombatDetails(remaining);
        const mentions = await this.binder.findMentions(remaining);
        chunks.push({
          id: `chunk_${++chunkIndex}`,
          type: combat.isCombat ? "combat" : "narration",
          text: remaining,
          boundSpeakerId: mentions[0]?.id,
          boundTargetId: mentions[1]?.id,
          actionKeywords: combat.keywords,
          suggestedSfx: combat.suggestedSfx,
          suggestedMemeFace: combat.isCombat ? "battle" : "normal"
        });
      }
    }

    return chunks;
  }
}
