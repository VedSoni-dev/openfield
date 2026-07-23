// Minimal OpenAI-compatible chat client. Defaults to OpenRouter so contributors
// without an Anthropic/OpenAI key can use the free tier. BYOK.
//
// Env:
//   OPENFIELD_LLM_BASE   default https://openrouter.ai/api/v1
//   OPENFIELD_LLM_KEY    the API key (or OPENROUTER_API_KEY)
//   OPENFIELD_LLM_MODEL  default a free OpenRouter model

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  /** Assistant turns that called tools carry them here for the next request. */
  tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
}

export interface ToolDef {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>; // JSON Schema
  };
}

export interface ToolCall {
  id: string;
  function: { name: string; arguments: string };
}

export interface ChatResult {
  content: string | null;
  toolCalls: ToolCall[];
}

// Default to the real Nous Research Hermes 3 — the same family Higgsfield's
// "Hermes" agent is built on — tuned for function calling / tool orchestration.
export const HERMES_MODEL = "nousresearch/hermes-3-llama-3.1-70b";

export function llmConfig() {
  const base = process.env.OPENFIELD_LLM_BASE || "https://openrouter.ai/api/v1";
  const key = process.env.OPENFIELD_LLM_KEY || process.env.OPENROUTER_API_KEY || "";
  const model = process.env.OPENFIELD_LLM_MODEL || HERMES_MODEL;
  return { base, key, model };
}

export function llmConfigured(): boolean {
  return !!llmConfig().key;
}

export async function chat(
  messages: ChatMessage[],
  opts: { tools?: ToolDef[]; toolChoice?: "auto" | "required"; temperature?: number } = {},
): Promise<ChatResult> {
  const { base, key, model } = llmConfig();
  if (!key) throw new Error("no LLM key. Set OPENFIELD_LLM_KEY or OPENROUTER_API_KEY.");
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/VedSoni-dev/openfield",
      "X-Title": "openfield",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts.temperature ?? 0.7,
      ...(opts.tools ? { tools: opts.tools, tool_choice: opts.toolChoice ?? "auto" } : {}),
    }),
  });
  const data = (await res.json()) as any;
  if (!res.ok) throw new Error(`LLM error: ${JSON.stringify(data)}`);
  const msg = data.choices?.[0]?.message ?? {};
  return {
    content: msg.content ?? null,
    toolCalls: (msg.tool_calls ?? []).map((t: any) => ({
      id: t.id,
      function: { name: t.function?.name, arguments: t.function?.arguments ?? "{}" },
    })),
  };
}
