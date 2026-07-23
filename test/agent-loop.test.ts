import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the LLM so we can drive the agent loop deterministically without a key.
const responses: any[] = [];
vi.mock("../src/orchestrator/llm.js", () => ({
  HERMES_MODEL: "nousresearch/hermes-3-llama-3.1-70b",
  chat: vi.fn(async () => responses.shift() ?? { content: "", toolCalls: [] }),
}));

const tc = (name: string, args: any) => ({ id: "call_" + name, function: { name, arguments: JSON.stringify(args) } });

describe("agentDirect loop", () => {
  beforeEach(() => (responses.length = 0));

  it("assembles a storyboard from scripted tool calls", async () => {
    const { agentDirect } = await import("../src/orchestrator/agent.js");
    responses.push(
      { content: "planning", toolCalls: [tc("set_project", { title: "Dune Run", model: "wan-2.2" }), tc("add_shot", { subject: "astronaut walks the dune", presets: ["orbit", "nope"], cinema: { body: "arri-alexa" } })] },
      { content: "more", toolCalls: [tc("add_shot", { subject: "sandstorm rises", presets: ["tracking"] }), tc("finalize", {})] },
    );
    const { storyboard, steps } = await agentDirect("a short film about an astronaut");
    expect(storyboard.title).toBe("Dune Run");
    expect(storyboard.model).toBe("wan-2.2");
    expect(storyboard.shots).toHaveLength(2);
    expect(storyboard.shots[0].presets).toEqual(["orbit"]); // bad id filtered
    expect(storyboard.shots[0].cinema).toEqual({ body: "arri-alexa" });
    expect(steps).toBe(2);
  });

  it("nudges when the model returns no tool calls, then proceeds", async () => {
    const { agentDirect } = await import("../src/orchestrator/agent.js");
    responses.push(
      { content: "let me think", toolCalls: [] },
      { content: "", toolCalls: [tc("add_shot", { subject: "a lone shot" }), tc("finalize", {})] },
    );
    const { storyboard } = await agentDirect("brief");
    expect(storyboard.shots).toHaveLength(1);
  });
});
