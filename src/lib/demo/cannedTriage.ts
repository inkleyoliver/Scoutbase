// Heuristic, offline stand-in for the Anthropic triage call — used in
// DEMO_MODE when no real ANTHROPIC_API_KEY is configured (see runTriage.ts).
// Not an AI: just enough keyword matching to turn free text into a plausible
// AiProposal so the capture -> triage -> inbox flow is visibly alive without
// a network call. Deterministic given the same input.

import type { AiProposal, AiProposalItem, ActionCategory, RoleKey } from "@/lib/types";
import { todayISO, toISODate, addDays } from "@/lib/date";

function guessRole(text: string): RoleKey {
  const t = text.toLowerCase();
  if (/\b(explorer|unit|badge|camp|expedition|young leader)\b/.test(t)) return "explorers";
  if (/\b(trustee|gsl|hall|section leader|governance|group|census|agm)\b/.test(t)) return "gsl";
  return "both";
}

function guessCategory(text: string): ActionCategory {
  const t = text.toLowerCase();
  if (/\b(chase|email|reply|send|call|phone)\b/.test(t)) return "comms";
  if (/\b(recruit|volunteer|leader|trustee)\b/.test(t)) return "people";
  if (/\b(meeting|policy|governance|census|compliance|dbs)\b/.test(t)) return "governance";
  if (/\b(programme|camp|badge|expedition|night)\b/.test(t)) return "programme";
  return "admin";
}

function guessPriority(text: string): "urgent" | "high" | "normal" | "low" {
  const t = text.toLowerCase();
  if (/\b(urgent|asap|immediately)\b/.test(t)) return "urgent";
  if (/\b(important|soon|priority)\b/.test(t)) return "high";
  return "normal";
}

function guessDueDate(text: string): string | null {
  const t = text.toLowerCase();
  if (/\btoday\b/.test(t)) return todayISO();
  if (/\btomorrow\b/.test(t)) return toISODate(addDays(todayISO(), 1));
  if (/\bnext week\b/.test(t)) return toISODate(addDays(todayISO(), 7));
  if (/\bend of (the )?month\b/.test(t)) {
    const d = new Date();
    d.setMonth(d.getMonth() + 1, 0);
    return toISODate(d);
  }
  return null;
}

function guessWaitingOn(text: string): string | null {
  const match = text.match(/\b(?:chase|waiting on|following up with)\s+([A-Z][a-z]+)\b/);
  return match ? match[1] : null;
}

function splitCandidates(text: string): string[] {
  return text
    .split(/[\n.;]+|(?:,? and )/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 4);
}

function titleCase(sentence: string): string {
  const trimmed = sentence.replace(/^(need to|i need to|also|remember to)\s+/i, "").trim();
  if (!trimmed) return sentence.trim();
  return trimmed[0].toUpperCase() + trimmed.slice(1);
}

/**
 * Turns raw capture text into a plausible AiProposal without calling any
 * external API. Caps at 3 proposed items; anything beyond that (or any
 * fragment too short to look actionable) is dropped into non_action_notes
 * so nothing is silently discarded.
 */
export function buildCannedProposal(rawText: string): AiProposal {
  const candidates = splitCandidates(rawText);
  const itemCandidates = candidates.slice(0, 3);
  const overflow = candidates.slice(3);

  const items: AiProposalItem[] = itemCandidates.map((sentence) => ({
    title: titleCase(sentence).slice(0, 120),
    role_key: guessRole(sentence),
    category: guessCategory(sentence),
    priority: guessPriority(sentence),
    effort: "medium",
    due_date: guessDueDate(sentence),
    waiting_on: guessWaitingOn(sentence),
    milestone_title_match: null,
    subtasks: [],
    confidence: "medium",
  }));

  if (items.length === 0) {
    return {
      items: [],
      non_action_notes: [rawText.trim()].filter(Boolean),
    };
  }

  return {
    items,
    non_action_notes: overflow,
  };
}
