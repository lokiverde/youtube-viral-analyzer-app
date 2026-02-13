import { ChannelConfig } from "./channels";

/**
 * Builds a system prompt for GPT-4o vision to analyze sample thumbnails
 * and produce a reusable style guide description.
 */
export function buildStyleAnalysisPrompt(): string {
  return `You are an expert YouTube thumbnail analyst. Analyze these sample thumbnails and describe the visual style in detail.

Focus on:
1. **Color palette** — dominant colors, accent colors, saturation level, warm vs cool tones
2. **Composition** — layout pattern (centered, rule of thirds, split), focal point placement
3. **Text treatment** — font style (serif/sans-serif/display), text size relative to image, text position, outline/shadow/glow effects, text colors
4. **Mood & tone** — energetic, professional, dramatic, playful, urgent, etc.
5. **Recurring elements** — faces, expressions, objects, backgrounds, overlays, borders, arrows, icons
6. **Background style** — solid color, gradient, blurred photo, graphic pattern, clean/busy

Output a single paragraph (150-200 words) that a designer could use to replicate this exact style. Be specific about colors (use hex codes when possible), font characteristics, and spatial relationships. Do NOT list the images separately — synthesize the common style across all samples.`;
}

/**
 * Builds a detailed DALL-E 3 prompt from a thumbnail concept, channel branding,
 * style guide, and viral best practices.
 */
export function buildDallePrompt(
  concept: string,
  channel: ChannelConfig,
  styleGuide: string | null,
  textOverlay: string,
  includeHeadshot: boolean
): string {
  const channelStyle = channel.id === "techtony"
    ? "Electric Blue (#0066FF), Black, Neon Green (#39FF14), White. Tech-forward, modern, high-energy."
    : "Navy Blue (#1B365D), Gold (#C5A572), White, Warm Gray. Professional, trustworthy, premium real estate.";

  let prompt = `Create a YouTube thumbnail image (landscape, 16:9 aspect ratio).

VISUAL CONCEPT:
${concept}

CHANNEL BRANDING:
${channel.name} channel. Color palette: ${channelStyle}

TEXT OVERLAY:
Include bold text reading "${textOverlay}" in a prominent position. Use thick sans-serif font (like Impact or Montserrat Black). The text must be:
- Maximum 3 words
- LARGE and immediately readable at small sizes
- High contrast against the background (use outline, shadow, or contrasting background)
- Positioned following the rule of thirds (avoid bottom-right corner)
- ${channel.id === "techtony" ? "Electric blue or neon green text with black outline" : "Gold or white text with dark navy outline"}`;

  if (styleGuide) {
    prompt += `

STYLE REFERENCE:
Match this visual style: ${styleGuide}`;
  }

  if (includeHeadshot) {
    prompt += `

PERSON PLACEMENT:
Leave a clear space on the left or right third of the image for a person's head and shoulders to be composited in later. The space should be roughly 30-35% of the image width. Design the background and other elements to work around this space.`;
  }

  prompt += `

VIRAL THUMBNAIL RULES:
- High color saturation (150%+ of normal) — make colors POP
- Maximum 1-2 focal points. Simplicity wins.
- Strong emotional resonance (the image should trigger ${concept.includes("warning") || concept.includes("mistake") ? "concern/urgency" : "curiosity/excitement"})
- Complementary color theory for contrast (blue+orange, yellow+violet, red+cyan)
- Clean, sharp edges — no blur or noise
- Professional quality, not generic stock photo feel
- The thumbnail must be compelling even at 120x68 pixels (mobile size)
- Do NOT include any YouTube UI elements, play buttons, or video player frames

OUTPUT:
A single 1792x1024 pixel landscape image. Vivid, high-contrast, scroll-stopping.`;

  return prompt;
}

/**
 * Builds a GPT-4o prompt to craft an optimized DALL-E prompt from a concept.
 * This two-step approach (GPT-4o → DALL-E) produces better results than
 * sending the concept directly to DALL-E.
 */
export function buildPromptCrafterSystem(): string {
  return `You are an expert at writing DALL-E 3 image generation prompts for YouTube thumbnails.

Your job: Take a thumbnail concept description and transform it into an optimized DALL-E 3 prompt that will produce a viral, click-worthy YouTube thumbnail.

VIRAL THUMBNAIL PRINCIPLES (always incorporate):
1. EMOTIONAL IMPACT: Close-up facial expressions increase CTR by 30%. Shock, curiosity, and excitement outperform neutral.
2. COLOR PSYCHOLOGY: High saturation, complementary colors (blue+orange, yellow+violet). Warm colors = excitement, cool = calm authority.
3. SIMPLICITY: One clear focal point. 1-2 key elements maximum. The thumbnail must read at 120x68 pixels on mobile.
4. MrBeast FORMULA: Extreme emotion + vivid saturation + simple background + bold text overlay.
5. CURIOSITY GAP: The visual should raise a question only the video answers.
6. TEXT RULES: 2-3 words max, thick sans-serif font, high-contrast outline/shadow, avoid bottom-right corner (YouTube shows duration there).
7. COMPOSITION: Rule of thirds. Clear visual hierarchy. Guide the eye to the focal point.
8. CONTRAST: Foreground must pop from background. Use light-on-dark or dark-on-light.

PROMPT WRITING RULES:
- Be extremely specific about colors (use hex codes), positions, sizes, lighting
- Describe the scene in detail but keep it achievable for AI image generation
- Always specify "16:9 aspect ratio, landscape orientation, 1792x1024 pixels"
- Include the exact text to render and describe its styling in detail
- Avoid requesting realistic photographs of specific real people
- End with "Vivid, high-contrast, professional YouTube thumbnail quality"

Return ONLY the DALL-E prompt text. No explanation, no JSON, just the prompt.`;
}
