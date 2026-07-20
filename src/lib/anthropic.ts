import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

// Lazily construct the Anthropic client so importing this module (or
// building the app) never fails when ANTHROPIC_API_KEY is a placeholder.
// The key is only read the first time a triage call actually happens.
export function getAnthropicClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export const TRIAGE_MODEL = "claude-sonnet-4-6";
