import { describe, it, expect } from "vitest";

describe("Anthropic API Key Validation", () => {
  it("should have ANTHROPIC_API_KEY set", () => {
    expect(process.env.ANTHROPIC_API_KEY).toBeDefined();
    expect(process.env.ANTHROPIC_API_KEY!.length).toBeGreaterThan(10);
  });

  it.runIf(process.env.RUN_LIVE_API_TESTS === "1")("should successfully call Anthropic API with a minimal request", async () => {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 10,
        messages: [{ role: "user", content: "Say hi" }],
      }),
    });
    expect(resp.status).toBe(200);
    const data = await resp.json();
    expect(data.content).toBeDefined();
    expect(data.content.length).toBeGreaterThan(0);
  });
});
