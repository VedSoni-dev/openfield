// Mood / genre atmosphere presets. Whole-vibe looks in one click.
import type { Preset } from "./types.js";

export const MOOD_PRESETS: Preset[] = [
  {
    id: "epic-trailer",
    label: "Epic Trailer",
    category: "mood",
    desc: "Blockbuster scale, sweeping and heroic.",
    template: "epic cinematic blockbuster mood, sweeping heroic scale, dramatic atmosphere, high production value",
    tags: ["trailer", "heroic", "grand", "hollywood"],
  },
  {
    id: "dreamlike",
    label: "Dreamlike",
    category: "mood",
    desc: "Soft, floating, surreal haze.",
    template: "dreamlike surreal mood, soft ethereal haze, floating weightless quality, gentle glow, hypnotic",
    tags: ["surreal", "ethereal", "soft", "hypnotic"],
  },
  {
    id: "ominous-horror",
    label: "Ominous",
    category: "mood",
    desc: "Dread, shadow, creeping tension.",
    template: "ominous horror mood, creeping dread, deep shadows, unsettling stillness, tense atmosphere",
    tags: ["horror", "dread", "dark", "tense"],
  },
  {
    id: "cozy-warm",
    label: "Cozy",
    category: "mood",
    desc: "Warm, intimate, comforting.",
    template: "cozy warm intimate mood, soft golden light, comforting inviting atmosphere, gentle and homely",
    tags: ["warm", "intimate", "comfort", "homely"],
  },
  {
    id: "gritty-urban",
    label: "Gritty Urban",
    category: "mood",
    desc: "Raw street realism, hard edges.",
    template: "gritty urban mood, raw street realism, hard concrete textures, overcast desaturated grit",
    tags: ["street", "raw", "urban", "realism"],
  },
  {
    id: "whimsical-symmetry",
    label: "Whimsical",
    category: "mood",
    desc: "Symmetrical, pastel, storybook charm.",
    template: "whimsical storybook mood, perfectly symmetrical composition, pastel palette, quirky charming detail, deadpan framing",
    tags: ["wes-anderson", "symmetry", "pastel", "quirky"],
  },
  {
    id: "retro-80s",
    label: "Retro 80s",
    category: "mood",
    desc: "Synthwave neon nostalgia.",
    template: "retro 1980s mood, synthwave neon glow, nostalgic haze, chrome and sunset gradients, vintage futurism",
    tags: ["80s", "synthwave", "neon", "nostalgia"],
  },
  {
    id: "ethereal-fantasy",
    label: "Fantasy",
    category: "mood",
    desc: "Magical, luminous, otherworldly.",
    template: "ethereal fantasy mood, luminous magical atmosphere, otherworldly glow, enchanted and majestic",
    tags: ["fantasy", "magic", "luminous", "epic"],
  },
];
