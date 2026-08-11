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
 * Builds a detailed FLUX prompt from a thumbnail concept, channel branding,
 * style guide, and viral best practices.
 *
 * FLUX responds to dense visual description rather than the bulleted
 * instruction lists DALL-E tolerated, so this reads as one scene brief.
 */
export function buildFluxPrompt(
  concept: string,
  channel: ChannelConfig,
  styleGuide: string | null,
  textOverlay: string,
  includeHeadshot: boolean
): string {
  const channelStyle = `${channel.thumbnailColors}. ${channel.thumbnailVibe}`;

  let prompt = `A YouTube thumbnail, 16:9 landscape, 1280x720.

VISUAL CONCEPT:
${concept}

CHANNEL BRANDING:
${channel.name} channel. Color palette: ${channelStyle}

TEXT OVERLAY:
Large bold text reading exactly "${textOverlay}" rendered in a thick condensed sans-serif face (Impact or Montserrat Black), all caps, with a heavy contrasting outline and drop shadow. The text sits along the top edge or the upper-left third, never across the subject's face and never in the bottom-right corner. It stays crisp and readable at 120x68 pixels. ${channel.thumbnailTextTreatment}. Render no words other than "${textOverlay}" anywhere in the image.`;

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

RENDERING:
Highly saturated complementary colors, dramatic rim lighting, one clear focal point, a simple uncluttered background, sharp focus, no blur or noise, professional editorial photography quality rather than generic stock. The mood is ${concept.includes("warning") || concept.includes("mistake") ? "urgent and alarming" : "curious and energetic"}. The photograph fills the entire 16:9 frame edge to edge with no border, no frame, no letterbox bars and no flat margin around it. No YouTube interface, no play button, no video player chrome, no watermark.`;

  return prompt;
}

/**
 * Builds a GPT-4o prompt to craft an optimized FLUX prompt from a concept.
 * This two-step approach (GPT-4o → FLUX) produces better results than
 * sending the raw concept straight to the image model.
 */
export function buildPromptCrafterSystem(): string {
  return `You are an expert at writing FLUX image generation prompts for YouTube thumbnails.

Your job: Take a thumbnail concept description and transform it into an optimized FLUX prompt that will produce a viral, click-worthy YouTube thumbnail.

VIRAL THUMBNAIL PRINCIPLES (always incorporate):
1. EMOTIONAL IMPACT: Close-up facial expressions increase CTR by 30%. Shock, curiosity, and excitement outperform neutral.
2. COLOR PSYCHOLOGY: High saturation, complementary colors (blue+orange, yellow+violet). Warm colors = excitement, cool = calm authority.
3. SIMPLICITY: One clear focal point. 1-2 key elements maximum. The thumbnail must read at 120x68 pixels on mobile.
4. MrBeast FORMULA: Extreme emotion + vivid saturation + simple background + bold text overlay.
5. CURIOSITY GAP: The visual should raise a question only the video answers.
6. TEXT RULES: 2-3 words max, thick sans-serif font, high-contrast outline/shadow, avoid bottom-right corner (YouTube shows duration there).
7. COMPOSITION: Rule of thirds. Clear visual hierarchy. Guide the eye to the focal point.
8. CONTRAST: Foreground must pop from background. Use light-on-dark or dark-on-light.

PROMPT WRITING RULES (FLUX-specific):
- Write flowing descriptive prose, not a bulleted list of instructions. FLUX reads the whole prompt as one scene description.
- Front-load the subject and action in the first sentence — FLUX weights early tokens most heavily.
- Be specific about colors (use hex codes), positions, sizes, camera angle and lighting.
- Put the text overlay in double quotes and state it exactly once, e.g. bold text reading "STOP THIS". FLUX renders short quoted strings well but garbles long ones — keep it to 3 words or fewer and never ask for two different text elements.
- Spell out symbols in the overlay: write AND rather than &, and drop any punctuation FLUX would try to draw. Symbols come out duplicated or malformed.
- Always describe the shot as filling the entire frame edge to edge — a full-bleed photograph with no border, no frame, no letterbox bars, no white or grey margin, no drop shadow around the image itself. FLUX otherwise insets the scene inside a flat background.
- State plainly that no other words, letters or watermarks appear in the image.
- Keep the whole prompt under 250 words. Long prompts dilute FLUX's attention.
- Avoid requesting realistic photographs of specific real people.
- Do not include negative phrasing like "no ugly hands" — describe what you want instead.
- End with "sharp focus, high contrast, professional YouTube thumbnail quality".

Return ONLY the FLUX prompt text. No explanation, no JSON, just the prompt.`;
}
