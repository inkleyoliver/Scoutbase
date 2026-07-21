// Heuristic, offline triage fallback — this is the PRODUCTION default triage
// path whenever no real ANTHROPIC_API_KEY is configured (see
// hasRealAnthropicKey() in src/lib/server/runTriage.ts), not just a demo
// artifact. Oli has decided not to pay for an Anthropic API key, so this
// keyword-based heuristic is what real captures get triaged by day to day.
// If a real ANTHROPIC_API_KEY is ever added, runTriage.ts transparently
// upgrades to calling the real model instead — nothing here needs to change
// for that upgrade path to keep working.
//
// Not an AI: just enough keyword matching + simple date parsing to turn free
// text into a plausible AiProposal so the capture -> triage -> inbox flow
// works without a network call. Deterministic given the same input (and the
// same "today").

import type { AiProposal, AiProposalItem, ActionCategory, ActionEffort, RoleKey } from "@/lib/types";
import { todayISO, toISODate, addDays } from "@/lib/date";

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function guessRole(text: string): RoleKey {
  const t = text.toLowerCase();
  if (/\b(explorer|unit|badge|camp|expedition|young leader|programme night|scout night)\b/.test(t)) return "explorers";
  if (/\b(trustee|gsl|hall|section leader|governance|group|census|agm|lease|charity commission)\b/.test(t)) return "gsl";
  return "both";
}

function guessCategory(text: string): ActionCategory {
  const t = text.toLowerCase();
  if (/\b(chase|email|reply|send|call|phone|text|message|follow up)\b/.test(t)) return "comms";
  if (/\b(recruit|volunteer|leader|trustee|dbs|appoint)\b/.test(t)) return "people";
  if (/\b(meeting|policy|governance|census|compliance|constitution|agm)\b/.test(t)) return "governance";
  if (/\b(programme|camp|badge|expedition|night|activity|hike)\b/.test(t)) return "programme";
  return "admin";
}

function guessPriority(text: string): "urgent" | "high" | "normal" | "low" {
  const t = text.toLowerCase();
  if (/\b(urgent|asap|immediately|emergency|critical)\b/.test(t)) return "urgent";
  if (/\b(important|soon|priority|deadline)\b/.test(t)) return "high";
  if (/\b(whenever|no rush|eventually|someday|low priority)\b/.test(t)) return "low";
  return "normal";
}

function guessEffort(text: string): ActionEffort {
  const t = text.toLowerCase();
  if (/\b(quick|five minutes|5 min|just|briefly|short email|one email)\b/.test(t)) return "quick";
  if (/\b(organi[sz]e|plan|write up|prepare|draft|arrange|sort out|overhaul|review the whole)\b/.test(t)) return "big";
  return "medium";
}

function nextWeekday(target: number): Date {
  const today = new Date(todayISO() + "T00:00:00");
  const diff = (target - today.getDay() + 7) % 7 || 7;
  return addDays(today, diff);
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

  const inDaysMatch = t.match(/\bin (\d+) days?\b/);
  if (inDaysMatch) return toISODate(addDays(todayISO(), Number(inDaysMatch[1])));

  const byWeekdayMatch = t.match(new RegExp(`\\b(?:by|before)\\s+(${WEEKDAYS.join("|")})\\b`));
  if (byWeekdayMatch) return toISODate(nextWeekday(WEEKDAYS.indexOf(byWeekdayMatch[1])));

  const thisWeekdayMatch = t.match(new RegExp(`\\b(?:this|on)\\s+(${WEEKDAYS.join("|")})\\b`));
  if (thisWeekdayMatch) return toISODate(nextWeekday(WEEKDAYS.indexOf(thisWeekdayMatch[1])));

  return null;
}

function guessWaitingOn(text: string): string | null {
  const match = text.match(/\b(?:chase|waiting on|following up with|chase up)\s+([A-Z][a-z]+)\b/);
  return match ? match[1] : null;
}

function splitCandidates(text: string): string[] {
  return text
    .split(/[\n.;]+|(?:,? and )/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 4);
}

function titleCase(sentence: string): string {
  const trimmed = sentence.replace(/^(need to|i need to|also|remember to|must|should)\s+/i, "").trim();
  if (!trimmed) return sentence.trim();
  return trimmed[0].toUpperCase() + trimmed.slice(1);
}

/**
 * Turns raw capture text into a plausible AiProposal without calling any
 * external API. Caps at 5 proposed items; anything beyond that (or any
 * fragment too short to look actionable) is dropped into non_action_notes
 * so nothing is silently discarded.
 */
export function buildFallbackTriageProposal(rawText: string): AiProposal {
  const candidates = splitCandidates(rawText);
  const itemCandidates = candidates.slice(0, 5);
  const overflow = candidates.slice(5);

  const items: AiProposalItem[] = itemCandidates.map((sentence) => ({
    title: titleCase(sentence).slice(0, 120),
    role_key: guessRole(sentence),
    category: guessCategory(sentence),
    priority: guessPriority(sentence),
    effort: guessEffort(sentence),
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
