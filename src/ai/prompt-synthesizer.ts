export interface CharacterPromptInput {
  name: string;
  description: string;
  gender?: "male" | "female" | "creature" | "unknown";
  bodyType?: string;
}

export interface BackgroundPromptInput {
  name: string;
  description: string;
  environment?: string;
  timeOfDay?: string;
}

/**
 * Builds standard 2D anime character sprite prompts with solid white background
 * specifically preventing chibi baby dolls and enforcing mature adult cultivators.
 */
export function buildCharacterPrompt(input: CharacterPromptInput): string {
  const genderDesc =
    input.gender === "female" ? "female Chinese Xianxia cultivator" : "male Chinese Xianxia cultivator";

  return [
    `A full-body slender adult ${genderDesc} (${input.name}), mature proportion (5.5 heads tall, NOT chibi, NOT a baby doll wawa).`,
    input.description ? `Appearance: ${input.description}.` : "",
    `Pose: floating dynamically in midair or standing on a flying sword, wide fluttering sleeves and elegant Daoist robes.`,
    `Art style: crisp 2D anime cel-shaded digital illustration, bold clean outlines, vibrant solid coloring, high contrast, sharp focus, no blur, no foggy diffusion.`,
    `Background: Isolated completely on pure solid white background #FFFFFF for clean cutout extraction. Full body visible from head to toe with no cropping.`
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Builds 16:9 cinematic anime digital wallpaper prompts for Xianxia backgrounds.
 */
export function buildBackgroundPrompt(input: BackgroundPromptInput): string {
  const timeDesc = input.timeOfDay ? `at ${input.timeOfDay}` : "with dramatic atmosphere";

  return [
    `A breathtaking cinematic Chinese Xianxia anime wallpaper scenery of ${input.name} ${timeDesc}.`,
    input.description ? `Scene features: ${input.description}.` : "",
    `Dramatic atmospheric lighting, volumetric clouds, ethereal spiritual aura, high-end anime background art, Makoto Shinkai style sky gradient, 16:9 composition, wide angle view, 4k digital painting illustration.`
  ]
    .filter(Boolean)
    .join(" ");
}
