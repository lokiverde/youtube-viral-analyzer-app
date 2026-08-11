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
  includeHeadshot: boolean
): string {
  const channelStyle = `${channel.thumbnailColors}. ${channel.thumbnailVibe}`;

  let prompt = `A YouTube thumbnail, 16:9 landscape, 1280x720.

VISUAL CONCEPT:
${concept}

CHANNEL BRANDING:
${channel.name} channel. Color palette: ${channelStyle}

NO TEXT:
The image contains no text of any kind. No words, no letters, no numbers, no signage, no captions, no logos, no watermarks. The headline is added afterwards, so leave the upper-left third of the frame visually calm and uncluttered: an area of sky, wall, shadow or shallow-focus background that a large block of type can sit on top of without covering the subject.`;

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

Your job: Take a thumbnail concept description and transform it into an optimized FLUX prompt that will produce a viral, click-worthy YouTube thumbnail BACKGROUND. The headline text is composited on afterwards by the application, so the generated image must contain no text at all.

VIRAL THUMBNAIL PRINCIPLES (always incorporate):
1. EMOTIONAL IMPACT: Close-up facial expressions increase CTR by 30%. Shock, curiosity, and excitement outperform neutral.
2. COLOR PSYCHOLOGY: High saturation, complementary colors (blue+orange, yellow+violet). Warm colors = excitement, cool = calm authority.
3. SIMPLICITY: One clear focal point. 1-2 key elements maximum. The thumbnail must read at 120x68 pixels on mobile.
4. MrBeast FORMULA: Extreme emotion + vivid saturation + simple background + bold text overlay.
5. CURIOSITY GAP: The visual should raise a question only the video answers.
6. HEADLINE SPACE: the headline is composited on later in the upper-left third, so that region must stay visually quiet and the subject must not sit under it.
7. COMPOSITION: Rule of thirds. Clear visual hierarchy. Guide the eye to the focal point.
8. CONTRAST: Foreground must pop from background. Use light-on-dark or dark-on-light.

PROMPT WRITING RULES (FLUX-specific):
- Write flowing descriptive prose, not a bulleted list of instructions. FLUX reads the whole prompt as one scene description.
- Front-load the subject and action in the first sentence — FLUX weights early tokens most heavily.
- Be specific about colors (use hex codes), positions, sizes, camera angle and lighting.
- NEVER ask for text, words, letters, numbers, signage, captions or logos. The headline is composited on afterwards, and any text FLUX draws will collide with it. State explicitly that the image contains no text.
- Reserve the upper-left third for the headline: describe that area as calm, uncluttered background (sky, wall, shadow, shallow-focus blur) and put the subject and focal detail to the right of it.
- Always describe the shot as filling the entire frame edge to edge — a full-bleed photograph with no border, no frame, no letterbox bars, no white or grey margin, no drop shadow around the image itself. FLUX otherwise insets the scene inside a flat background.
- State plainly that no other words, letters or watermarks appear in the image.
- Keep the whole prompt under 250 words. Long prompts dilute FLUX's attention.
- Avoid requesting realistic photographs of specific real people.
- Do not include negative phrasing like "no ugly hands" — describe what you want instead.
- End with "sharp focus, high contrast, professional YouTube thumbnail quality".

Return ONLY the FLUX prompt text. No explanation, no JSON, just the prompt.`;
}
