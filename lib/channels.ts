export interface ChannelConfig {
  id: string;
  name: string;
  handle: string;
  audience: string;
  tone: string;
  topics: string;
  thumbnailColors: string;
  titlePatterns: string[];
  sampleThumbnails: string[];
  thumbnailStyle: string;
}

export const CHANNELS: Record<string, ChannelConfig> = {
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
  },
};

export function getChannel(id: string): ChannelConfig | undefined {
  return CHANNELS[id];
}
