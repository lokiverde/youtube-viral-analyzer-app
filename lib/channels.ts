export interface ChannelConfig {
  id: string;
  name: string;
  handle: string;
  audience: string;
  tone: string;
  topics: string;
  thumbnailColors: string;
  titlePatterns: string[];
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
  },
};

export function getChannel(id: string): ChannelConfig | undefined {
  return CHANNELS[id];
}
