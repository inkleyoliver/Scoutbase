import type { AiProposal, Contact, Milestone, RoleKey } from "./types";
import { todayISO } from "./date";

export interface TriageContext {
  milestones: Pick<Milestone, "title" | "role_key">[];
  contacts: Pick<Contact, "name" | "role_title">[];
}

const ROLE_CONTEXT = `
Two roles:
- "gsl": Group Lead Volunteer at a Scout Group undergoing structural reform (trustees, governance, section leaders, hall/property, DBS/compliance).
- "explorers": Explorer Scout Unit leadership at a separate group (programme nights, badges, camps, young leaders, parents).
- "both": cross-cutting personal/admin items that don't belong to one role (e.g. "renew DBS", "book First Response course").
`;

const ENUM_CONTEXT = `
Enums you MUST use exactly (lowercase, hyphen-free unless shown):
- role_key: "gsl" | "explorers" | "both"
- category: "governance" | "people" | "comms" | "programme" | "admin" | "other"
- priority: "urgent" | "high" | "normal" | "low"
- effort: "quick" | "medium" | "big"
- confidence: "high" | "medium" | "low"
`;

export function buildTriageSystemPrompt(ctx: TriageContext, extra?: string): string {
  const milestonesByRole: Record<string, string[]> = {};
  for (const m of ctx.milestones) {
    (milestonesByRole[m.role_key] ??= []).push(m.title);
  }
  const milestoneLines = Object.entries(milestonesByRole)
    .map(([role, titles]) => `  - ${role}: ${titles.join("; ") || "(none)"}`)
    .join("\n");

  const contactNames = ctx.contacts.map((c) => c.role_title ? `${c.name} (${c.role_title})` : c.name).join(", ") || "(none)";

  return `You are the triage assistant inside Scoutbase, a personal task manager for a Scouting volunteer juggling two roles.
Today's date is ${todayISO()} (ISO 8601, Europe/London).
${ROLE_CONTEXT}
Active milestone titles per role (for matching, not for inventing new ones):
${milestoneLines || "  (none yet)"}

Known contact names: ${contactNames}
${ENUM_CONTEXT}
Task: read the user's free-text capture (a "brain dump" or a pasted email) and propose zero or more discrete, actionable items. Do not invent tasks the text doesn't support. Split multiple distinct asks into separate items. If a sentence is just a note/observation with no action, put it in "non_action_notes" instead of forcing it into an item.

For each item:
- "title": short, imperative, specific (e.g. "Chase Dave about the hall lease").
- "role_key": best-guess role, "both" if genuinely unclear or cross-cutting.
- "category", "priority", "effort": your best judgement from the enums above. Default priority "normal", effort "medium" unless the text implies otherwise.
- "due_date": ISO date string if the text implies one (e.g. "by Friday", "before the AGM"), else null. Resolve relative dates against today's date above.
- "waiting_on": a person's name if this action is really "waiting for someone else to do something" (a chase), else null.
- "milestone_title_match": the exact title of a milestone above if this action clearly serves it, else null. Only set this with confidence "high" on the item.
- "subtasks": an array of short subtask title strings if the text implies a checklist, else [].
- "confidence": your confidence in this parse — "high" | "medium" | "low".
${extra ? `\n${extra}\n` : ""}
Respond with ONLY valid JSON, no prose, no markdown code fences, matching exactly this shape:
{
  "items": [
    {
      "title": "string",
      "role_key": "gsl" | "explorers" | "both",
      "category": "governance" | "people" | "comms" | "programme" | "admin" | "other",
      "priority": "urgent" | "high" | "normal" | "low",
      "effort": "quick" | "medium" | "big",
      "due_date": "YYYY-MM-DD" | null,
      "waiting_on": "string" | null,
      "milestone_title_match": "string" | null,
      "subtasks": ["string"],
      "confidence": "high" | "medium" | "low"
    }
  ],
  "non_action_notes": ["string"]
}`;
}

export const EMAIL_TRIAGE_EXTRA = `This text is an inbound email. Identify the actual asks in the email, not every sentence — emails often contain pleasantries, signatures, and context that are not actions. If the action is really "reply to / chase this person", set "waiting_on" to the sender's name.`;

const VALID_ROLE_KEYS: RoleKey[] = ["gsl", "explorers", "both"];

/**
 * Defensively parse a triage model response into an AiProposal.
 * Strips markdown code fences, tolerates leading/trailing prose, and
 * validates enum fields, discarding malformed items rather than throwing.
 * Returns null if nothing usable could be recovered — callers must treat
 * that as "triage failed" and keep the raw capture (§5.2 step 5: capture
 * must never be lost to an AI failure).
 */
export function parseTriageResponse(raw: string): AiProposal | null {
  let text = raw.trim();

  // Strip ```json ... ``` or ``` ... ``` fences.
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  // If there's still leading/trailing prose, grab the outermost { ... }.
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;
  const rawItems = Array.isArray(obj.items) ? obj.items : [];

  const items = rawItems
    .map((it): AiProposal["items"][number] | null => {
      if (typeof it !== "object" || it === null) return null;
      const o = it as Record<string, unknown>;
      if (typeof o.title !== "string" || !o.title.trim()) return null;

      const role_key = VALID_ROLE_KEYS.includes(o.role_key as RoleKey)
        ? (o.role_key as RoleKey)
        : "both";

      const category = ["governance", "people", "comms", "programme", "admin", "other"].includes(
        o.category as string
      )
        ? (o.category as AiProposal["items"][number]["category"])
        : "other";

      const priority = ["urgent", "high", "normal", "low"].includes(o.priority as string)
        ? (o.priority as AiProposal["items"][number]["priority"])
        : "normal";

      const effort = ["quick", "medium", "big"].includes(o.effort as string)
        ? (o.effort as AiProposal["items"][number]["effort"])
        : "medium";

      const confidence = ["high", "medium", "low"].includes(o.confidence as string)
        ? (o.confidence as "high" | "medium" | "low")
        : "low";

      const due_date =
        typeof o.due_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.due_date) ? o.due_date : null;

      const subtasks = Array.isArray(o.subtasks)
        ? o.subtasks.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        : [];

      return {
        title: o.title.trim(),
        role_key,
        category,
        priority,
        effort,
        due_date,
        waiting_on: typeof o.waiting_on === "string" && o.waiting_on.trim() ? o.waiting_on.trim() : null,
        milestone_title_match:
          typeof o.milestone_title_match === "string" && o.milestone_title_match.trim()
            ? o.milestone_title_match.trim()
            : null,
        subtasks,
        confidence,
      };
    })
    .filter((x): x is AiProposal["items"][number] => x !== null);

  const non_action_notes = Array.isArray(obj.non_action_notes)
    ? obj.non_action_notes.filter((s): s is string => typeof s === "string")
    : [];

  if (items.length === 0 && non_action_notes.length === 0) return null;

  return { items, non_action_notes };
}
