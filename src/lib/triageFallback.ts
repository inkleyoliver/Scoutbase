// Heuristic, offline triage fallback — this is the PRODUCTION default triage
// path whenever no real ANTHROPIC_API_KEY is configured (see
// hasRealAnthropicKey() in src/lib/server/runTriage.ts), not just a demo
// artifact. Oli has decided not to pay for an Anthropic API key, so this
// keyword-based heuristic is what real captures get triaged by day to day —
// including "Extract actions" on meeting notes, which reuses this same
// function on much longer, more mixed text than a typical brain dump.
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
const MAX_ITEMS = 8;

const ACTION_VERBS =
  "chase|email|call|phone|text|message|book|arrange|organise|organize|review|draft|send|confirm|check|" +
  "update|finalise|finalize|submit|renew|order|prepare|contact|ask|remind|schedule|sort( out)?|fix|get|buy|" +
  "print|publish|share|circulate|distribute|write( up)?|create|set up|complete|investigate|research|" +
  "find out|look into|follow up";

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

// Common sentence-starters that are capitalised but aren't names — without
// this, "Need to email the DC…" reads "Need" as a person via the
// "Name to <verb>" pattern below.
const NON_NAME_WORDS = new Set([
  "need",
  "needs",
  "also",
  "please",
  "remember",
  "must",
  "should",
  "we",
  "they",
  "he",
  "she",
  "it",
  "you",
  "i",
]);

function guessWaitingOn(text: string): string | null {
  const chase = text.match(/\b(?:chase|waiting on|following up with|chase up)\s+([A-Z][a-z]+)\b/);
  if (chase) return chase[1];
  // "Dave to send the invoice" — someone else was assigned the action, so
  // Oli is effectively waiting on them.
  const assigned = text.match(new RegExp(`\\b([A-Z][a-z]+)\\s+to\\s+(?:${ACTION_VERBS})\\b`, "i"));
  if (assigned && !NON_NAME_WORDS.has(assigned[1].toLowerCase())) return assigned[1];
  return null;
}

function stripMarker(line: string): string {
  return line
    .replace(/^\s*[-*•]\s*\[[ xX]?\]\s*/, "") // "- [ ] " / "* [x] " checkbox bullets
    .replace(/^\s*[-*•]\s*/, "") // plain "- " / "* " bullets
    .replace(/^\s*\d+[.)]\s*/, "") // "1. " / "2) " numbered lists
    .replace(/^\s*(action|todo|next step|follow[- ]up)\s*[:\-]\s*/i, "") // explicit labels
    .trim();
}

/**
 * How actionable a candidate line looks, independent of its position in the
 * text. Meeting notes mix discussion with the odd real action, so picking
 * "the first N fragments" (as a brain dump reasonably can) doesn't work —
 * this scores every candidate and keeps the ones that actually look like
 * something to do.
 */
function scoreActionability(rawLine: string): number {
  let score = 0;
  if (/^\s*[-*•]\s*\[[ xX]?\]/.test(rawLine)) score += 3; // checkbox bullet
  if (/^\s*(action|todo|next step|follow[- ]up)\s*[:\-]/i.test(rawLine)) score += 3; // explicit label
  if (new RegExp(`^\\s*(?:${ACTION_VERBS})\\b`, "i").test(rawLine)) score += 2; // starts with an imperative verb
  if (new RegExp(`\\b([A-Z][a-z]+)\\s+to\\s+(?:${ACTION_VERBS})\\b`).test(rawLine)) score += 2; // "Dave to send…"
  if (/\b(need(s)? to|must|to action)\b/i.test(rawLine)) score += 1;
  if (guessDueDate(rawLine)) score += 1; // has a deadline phrase
  return score;
}

const STRONG_MARKER = /^\s*(?:[-*•]\s*\[[ xX]?\]|(?:action|todo|next step|follow[- ]up)\s*[:\-])/i;

function splitCandidates(text: string): string[] {
  const lines = text.split(/\n+/).map((l) => l.trim());
  const candidates: string[] = [];
  for (const line of lines) {
    if (!line) continue;
    // A checkbox bullet or explicit "Action:"/"TODO:" label is already one
    // item — splitting it further on internal commas/periods would break
    // it apart. Anything else (a brain-dump sentence, a discussion line in
    // a meeting note) gets split on sentence boundaries so multiple items
    // packed into one line/paragraph are each scored independently.
    if (STRONG_MARKER.test(line)) {
      candidates.push(line);
    } else {
      candidates.push(...line.split(/[.;]+|(?:,? and )/i).map((s) => s.trim()));
    }
  }
  return candidates.map(stripMarker).filter((s) => s.length > 4);
}

function titleCase(sentence: string): string {
  const trimmed = sentence.replace(/^(need to|i need to|also|remember to|must|should)\s+/i, "").trim();
  if (!trimmed) return sentence.trim();
  return trimmed[0].toUpperCase() + trimmed.slice(1);
}

/**
 * Turns raw capture text into a plausible AiProposal without calling any
 * external API. Candidates are ranked by how actionable they look (checkbox/
 * "Action:" markers, imperative verbs, "Name to do X", deadline phrases) and
 * the top matches (up to MAX_ITEMS) become proposed items; the rest land in
 * non_action_notes so nothing is silently discarded. If nothing scores as
 * actionable at all (e.g. terse phrasing this heuristic doesn't recognise),
 * falls back to treating the first few fragments as items — better an
 * imperfect proposal than none.
 */
export function buildFallbackTriageProposal(rawText: string): AiProposal {
  const candidates = splitCandidates(rawText);
  const scored = candidates.map((text, i) => ({ text, i, score: scoreActionability(text) }));

  const actionable = scored.filter((c) => c.score > 0);
  const ranked =
    actionable.length > 0
      ? actionable.sort((a, b) => b.score - a.score || a.i - b.i)
      : scored.slice(0, 5).map((c) => ({ ...c, score: 0 }));

  const chosen = ranked.slice(0, MAX_ITEMS);
  const chosenIdx = new Set(chosen.map((c) => c.i));
  const overflow = scored.filter((c) => !chosenIdx.has(c.i)).map((c) => c.text);

  const items: AiProposalItem[] = chosen
    .sort((a, b) => a.i - b.i) // restore original reading order for display
    .map(({ text, score }) => ({
      title: titleCase(text).slice(0, 120),
      role_key: guessRole(text),
      category: guessCategory(text),
      priority: guessPriority(text),
      effort: guessEffort(text),
      due_date: guessDueDate(text),
      waiting_on: guessWaitingOn(text),
      milestone_title_match: null,
      subtasks: [],
      confidence: score >= 3 ? "high" : "medium",
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
