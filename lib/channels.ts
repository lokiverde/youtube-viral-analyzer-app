export type ChannelId = "techtony" | "huntermason" | "cheriscloset";

export interface ChannelConfig {
  id: ChannelId;
  name: string;
  handle: string;
  audience: string;
  tone: string;
  topics: string;
  thumbnailColors: string;
  titlePatterns: string[];
  sampleThumbnails: string[];
  thumbnailStyle: string;
  // UI + prompt theming (keyed per channel — no hardcoded ternaries)
  accentColor: string;
  accentBg: string;
  gradient: string;
  thumbnailVibe: string;
  thumbnailTextTreatment: string;
}

export const CHANNELS: Record<ChannelId, ChannelConfig> = {
  techtony: {
    id: "techtony",
    name: "TechTony",
    handle: "@techtonyai",
    audience: "Business owners, entrepreneurs, AI-curious professionals",
    tone: 'Practical, no-BS, "here\'s what actually works"',
    topics: "AI tools, automation, business tech, productivity",
    thumbnailColors: "Electric Blue (#0066FF), Black, Neon Green (#39FF14), White",
    titlePatterns: [
      "I Automated X and Here's What Happened",
      "The AI Tool That [Specific Result]",
      "Stop Using [Old Tool], Use This Instead",
      "X Tools I Use to Run My Entire [Business Type]",
    ],
    sampleThumbnails: [],
    thumbnailStyle:
      "High-energy tech aesthetic. Electric blue (#0066FF) and neon green (#39FF14) accents on dark backgrounds. Bold sans-serif text with glow effects. Modern, clean composition with tech gadgets or screens as props. Excited or surprised facial expressions. High saturation, futuristic feel.",
    accentColor: "#0066FF",
    accentBg: "rgba(0, 102, 255, 0.15)",
    gradient: "linear-gradient(135deg, #0066FF, #39FF14)",
    thumbnailVibe: "Tech-forward, modern, high-energy.",
    thumbnailTextTreatment: "Electric blue or neon green text with black outline",
  },
  huntermason: {
    id: "huntermason",
    name: "HunterMason",
    handle: "@huntermasonrealty",
    audience: "Real estate investors, landlords, property managers, HOA boards",
    tone: "Professional, expert, trustworthy",
    topics: "Income property, landlord tips, market analysis, HOA management",
    thumbnailColors: "Navy Blue (#1B365D), Gold (#C5A572), White, Warm Gray",
    titlePatterns: [
      "X Mistakes [Landlords/Investors] Make",
      "How I [Achieved Result] with [Property Type]",
      "The Truth About [Common Misconception]",
      "[Number] Things to Know Before [Action]",
    ],
    sampleThumbnails: [],
    thumbnailStyle:
      "Professional real estate aesthetic. Navy blue (#1B365D) and gold (#C5A572) palette. Clean, authoritative composition with property images or professional headshots. Warm, trustworthy tone. Bold white or gold text with subtle drop shadows on dark navy backgrounds. Premium, high-end feel.",
    accentColor: "#C5A572",
    accentBg: "rgba(27, 54, 93, 0.2)",
    gradient: "linear-gradient(135deg, #1B365D, #C5A572)",
    thumbnailVibe: "Professional, trustworthy, premium real estate.",
    thumbnailTextTreatment: "Gold or white text with dark navy outline",
  },
  cheriscloset: {
    id: "cheriscloset",
    name: "Cheri's Closet",
    handle: "@CourtneysCloset-v5x",
    audience: "Story lovers, emotional-drama fans, late-night binge listeners",
    tone: "Warm, cinematic, emotionally gripping storyteller",
    topics:
      "Narrated faceless short stories, family secrets, revenge, romance, betrayal, twist endings",
    thumbnailColors: "Deep Burgundy (#6B1E3C), Warm Rose (#C25B6E), Cream (#F5E6D3), Charcoal (#2A2320)",
    titlePatterns: [
      "She Never Expected [Twist] After [Event]",
      "The Secret My [Family Member] Kept for [Number] Years",
      "I [Action] and What Happened Next Changed Everything",
      "They Thought I Was [Assumption]... They Were Wrong",
    ],
    sampleThumbnails: [],
    thumbnailStyle:
      "Cinematic faceless-story aesthetic. Warm burgundy (#6B1E3C) and rose (#C25B6E) palette over moody charcoal backgrounds. Illustrated or AI-rendered character caught in an emotional beat (no real host face). Soft dramatic lighting, film-still framing. Bold cream caption text with dark outline. Intimate, suspenseful, emotionally charged mood.",
    accentColor: "#C25B6E",
    accentBg: "rgba(194, 91, 110, 0.18)",
    gradient: "linear-gradient(135deg, #6B1E3C, #C25B6E)",
    thumbnailVibe: "Cinematic, emotional, faceless narrated storytelling.",
    thumbnailTextTreatment: "Cream or warm-rose text with deep burgundy outline",
  },
};

export function getChannel(id: string): ChannelConfig | undefined {
  return CHANNELS[id as ChannelId];
}
