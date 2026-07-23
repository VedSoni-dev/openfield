export type PresetCategory = "camera" | "lens" | "lighting" | "style" | "vfx" | "mood" | "transition";

export interface Preset {
  id: string;
  label: string;
  category: PresetCategory;
  /** One-line description of the move/look. */
  desc: string;
  /**
   * Prompt fragment injected into the final prompt. Use {subject} where the
   * user's subject should sit; the composer fills it. Written model-agnostic —
   * plain cinematography language every video model understands.
   */
  template: string;
  /** Optional structured params some models accept (e.g. camera_motion). */
  params?: Record<string, unknown>;
  /** Free-text tags for search. */
  tags?: string[];
}
