import { describe, it, expect } from "vitest";
import { runToolCall, TOOLS, type AgentState } from "../src/orchestrator/agent.js";

function fresh(): AgentState {
  return { title: "Untitled", model: "seedance-2.0", shots: [], done: false };
}

describe("agent tool dispatch", () => {
  it("exposes the expected tool suite", () => {
    const names = TOOLS.map((t) => t.function.name);
    expect(names).toEqual(["search_presets", "list_cinema", "list_characters", "set_project", "add_shot", "finalize"]);
  });

  it("search_presets returns matches", () => {
    const s = fresh();
    const out = runToolCall("search_presets", { query: "orbit" }, s);
    expect(out).toMatch(/orbit/);
  });

  it("list_cinema lists groups", () => {
    const out = runToolCall("list_cinema", {}, fresh());
    expect(out).toMatch(/genre:/);
    expect(out).toMatch(/body:/);
  });

  it("set_project sets title + valid model, ignores bad model", () => {
    const s = fresh();
    runToolCall("set_project", { title: "My Film", model: "wan-2.2" }, s);
    expect(s.title).toBe("My Film");
    expect(s.model).toBe("wan-2.2");
    runToolCall("set_project", { title: "X", model: "not-real" }, s);
    expect(s.model).toBe("wan-2.2"); // unchanged
  });

  it("add_shot filters unknown preset ids and appends", () => {
    const s = fresh();
    runToolCall("add_shot", { subject: "a wolf", presets: ["orbit", "bogus-preset"], cinema: { body: "arri-alexa" } }, s);
    expect(s.shots).toHaveLength(1);
    expect(s.shots[0].presets).toEqual(["orbit"]);
    expect(s.shots[0].cinema).toEqual({ body: "arri-alexa" });
  });

  it("finalize sets done", () => {
    const s = fresh();
    runToolCall("finalize", {}, s);
    expect(s.done).toBe(true);
  });
});
