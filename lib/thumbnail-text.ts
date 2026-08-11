/**
 * Burns the thumbnail's text overlay in after generation.
 *
 * FLUX renders two words cleanly and garbles three, so the image model is asked
 * for a text-free background and the headline is composited here instead. The
 * glyphs are converted to SVG path data with opentype.js, which means nothing
 * at render time depends on a font being installed on the host.
 */

import { readFileSync } from "fs";
import path from "path";
import { parse as parseFont, type Font } from "opentype.js";
import sharp from "sharp";
import { ChannelConfig } from "./channels";

const FONT_FILE = path.join(process.cwd(), "assets", "Anton-Regular.ttf");

const MARGIN = 52;
const MAX_LINES = 3;
const MAX_FONT_SIZE = 168;
const MIN_FONT_SIZE = 68;
const FONT_STEP = 6;
const LINE_HEIGHT = 1.06;
/** Fraction of the canvas the headline may occupy, with and without a headshot. */
const TEXT_WIDTH_WITH_HEADSHOT = 0.56;
const TEXT_WIDTH_ALONE = 0.62;

export interface TextOverlayOptions {
  readonly width: number;
  readonly height: number;
  readonly reserveHeadshotSpace: boolean;
}

interface Layout {
  readonly lines: string[];
  readonly fontSize: number;
}

let cachedFont: Font | null = null;

function loadFont(): Font {
  if (cachedFont) return cachedFont;

  const file = readFileSync(FONT_FILE);
  // opentype wants a standalone ArrayBuffer, not the pooled Node Buffer slab.
  const bytes = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  cachedFont = parseFont(bytes);
  return cachedFont;
}

/** Uppercase, collapse whitespace and drop anything the display face cannot draw. */
function normalize(text: string): string {
  return text
    .toUpperCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function measure(font: Font, text: string, fontSize: number): number {
  return font.getAdvanceWidth(text, fontSize);
}

/** Greedy word wrap. Returns null when a single word cannot fit at this size. */
function wrap(
  font: Font,
  words: string[],
  fontSize: number,
  maxWidth: number
): string[] | null {
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (measure(font, word, fontSize) > maxWidth) return null;

    const candidate = current ? `${current} ${word}` : word;
    if (measure(font, candidate, fontSize) <= maxWidth) {
      current = candidate;
      continue;
    }

    lines.push(current);
    current = word;
  }

  if (current) lines.push(current);
  return lines;
}

/** Largest font size at which the headline fits the box in MAX_LINES or fewer. */
function fit(font: Font, text: string, maxWidth: number, maxHeight: number): Layout {
  const words = text.split(" ");

  for (let fontSize = MAX_FONT_SIZE; fontSize >= MIN_FONT_SIZE; fontSize -= FONT_STEP) {
    const lines = wrap(font, words, fontSize, maxWidth);
    if (!lines || lines.length > MAX_LINES) continue;
    if (lines.length * fontSize * LINE_HEIGHT <= maxHeight) return { lines, fontSize };
  }

  // Nothing fit cleanly — take the smallest size and accept the overflow.
  const lines = wrap(font, words, MIN_FONT_SIZE, maxWidth) ?? [text];
  return { lines: lines.slice(0, MAX_LINES), fontSize: MIN_FONT_SIZE };
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Builds the overlay as an SVG of filled paths. The same path data is drawn
 * three times — shadow, outline, fill — because painting a stroke underneath a
 * fill is more portable across SVG renderers than relying on paint-order.
 */
function buildSvg(
  font: Font,
  layout: Layout,
  channel: ChannelConfig,
  options: TextOverlayOptions
): string {
  const { fontSize, lines } = layout;
  const ascender = (font.ascender / font.unitsPerEm) * fontSize;
  const strokeWidth = Math.max(6, Math.round(fontSize * 0.11));
  const shadowOffset = Math.round(fontSize * 0.05);

  const pathData = lines
    .map((line, index) => {
      const baseline = MARGIN + ascender + index * fontSize * LINE_HEIGHT;
      return font.getPath(line, MARGIN, baseline, fontSize).toPathData(2);
    })
    .join(" ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${options.width}" height="${options.height}" viewBox="0 0 ${options.width} ${options.height}">
  <g transform="translate(${shadowOffset}, ${shadowOffset})">
    <path d="${escapeXml(pathData)}" fill="#000000" fill-opacity="0.45"
          stroke="#000000" stroke-opacity="0.45" stroke-width="${strokeWidth}" stroke-linejoin="round"/>
  </g>
  <path d="${escapeXml(pathData)}" fill="none" stroke="${channel.textOutline}"
        stroke-width="${strokeWidth}" stroke-linejoin="round" stroke-linecap="round"/>
  <path d="${escapeXml(pathData)}" fill="${channel.textFill}"/>
</svg>`;
}

/**
 * Composites the headline onto a generated background.
 * Returns the base image unchanged when there is no usable text.
 */
export async function compositeTextOverlay(
  baseImage: Buffer,
  rawText: string,
  channel: ChannelConfig,
  options: TextOverlayOptions
): Promise<Buffer> {
  const text = normalize(rawText);
  if (!text) return baseImage;

  const font = loadFont();
  const maxWidth =
    options.width *
      (options.reserveHeadshotSpace ? TEXT_WIDTH_WITH_HEADSHOT : TEXT_WIDTH_ALONE) -
    MARGIN;
  const maxHeight = options.height - MARGIN * 2;

  const layout = fit(font, text, maxWidth, maxHeight);
  const svg = buildSvg(font, layout, channel, options);

  return sharp(baseImage)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toBuffer();
}
