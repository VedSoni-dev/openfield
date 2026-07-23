// Transition presets. How a shot enters or exits — cut energy between shots.
import type { Preset } from "./types.js";

export const TRANSITION_PRESETS: Preset[] = [
  {
    id: "match-cut",
    label: "Match Cut",
    category: "transition",
    desc: "Shape or motion carries into the next shot.",
    template: "the shot begins matching the shape and motion of the previous frame, a seamless match cut, continuous visual rhyme",
    tags: ["seamless", "rhyme", "continuous"],
  },
  {
    id: "smash-cut",
    label: "Smash Cut",
    category: "transition",
    desc: "Abrupt jarring hard cut in.",
    template: "an abrupt smash cut into the action, sudden jarring energy, instant hard transition",
    tags: ["abrupt", "hard", "jarring"],
  },
  {
    id: "cross-dissolve",
    label: "Cross Dissolve",
    category: "transition",
    desc: "Soft fade blending two images.",
    template: "the shot cross-dissolves in, one image softly blending and melting into the next, gentle overlap",
    tags: ["dissolve", "fade", "soft"],
  },
  {
    id: "film-burn",
    label: "Film Burn",
    category: "transition",
    desc: "Analog light-leak flash between shots.",
    template: "an analog film-burn transition, orange light leak flaring across the frame, celluloid flash",
    tags: ["light-leak", "analog", "flash", "burn"],
  },
  {
    id: "light-flash",
    label: "Light Flash",
    category: "transition",
    desc: "Bright white flash cut.",
    template: "a bright white light-flash transition punching into the shot, high-energy exposure blowout",
    tags: ["flash", "white", "energy"],
  },
  {
    id: "glitch-cut",
    label: "Glitch Cut",
    category: "transition",
    desc: "Digital datamosh stutter in.",
    template: "a digital glitch transition, datamosh stutter and RGB tearing resolving into the shot",
    tags: ["glitch", "datamosh", "digital", "stutter"],
  },
];
