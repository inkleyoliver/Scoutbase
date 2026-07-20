import { ROLE_META } from "@/lib/constants";
import { formatRelativeDue } from "@/lib/date";
import type { DigestData } from "./buildDigest";

// §8.1 — clean HTML, role-coloured chips. Keep it simple: table-based
// layout for email client compatibility, no external assets/fonts.
export function renderDigestHtml(data: DigestData, weekday: string): string {
  const chip = (roleKey: "gsl" | "explorers" | "both") => {
    const meta = ROLE_META[roleKey];
    return `<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;background:${meta.colorSoft};color:${meta.color};">${meta.label}</span>`;
  };

  const topFiveHtml = data.topFive.length
    ? data.topFive
        .map(
          (a) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #e7e5e4;">
          ${chip(a.role_key)}
          <div style="font-weight:600;margin-top:4px;">${escapeHtml(a.title)}</div>
          <div style="font-size:13px;color:#57534e;">${escapeHtml(formatRelativeDue(a.due_date) ?? "")}</div>
        </td>
      </tr>`
        )
        .join("")
    : `<tr><td style="padding:8px 0;color:#57534e;">Nothing urgent today.</td></tr>`;

  const chasesHtml = data.waitingChases.length
    ? `<ul style="margin:4px 0 0;padding-left:18px;">${data.waitingChases
        .map((a) => `<li>${escapeHtml(a.title)}${a.waiting_on ? ` — waiting on ${escapeHtml(a.waiting_on)}` : ""}</li>`)
        .join("")}</ul>`
    : "";

  const sections: string[] = [];
  sections.push(`
    <h2 style="font-size:15px;margin:24px 0 8px;">Today's top ${data.topFive.length}</h2>
    <table role="presentation" width="100%">${topFiveHtml}</table>
  `);

  if (data.waitingChases.length > 0) {
    sections.push(`
      <h2 style="font-size:15px;margin:24px 0 8px;">Waiting on ≥ 7 days</h2>
      ${chasesHtml}
    `);
  }

  if (data.staleCount > 0) {
    sections.push(`
      <p style="margin:24px 0 0;font-size:14px;">
        ${data.staleCount} item${data.staleCount === 1 ? "" : "s"} going stale — 30-second triage in the app.
      </p>
    `);
  }

  if (data.skewMessage) {
    sections.push(`<p style="margin:12px 0 0;font-size:14px;color:#57534e;">${escapeHtml(data.skewMessage)}</p>`);
  }

  if (data.inboxPendingCount > 0) {
    sections.push(`
      <p style="margin:12px 0 0;font-size:14px;">
        ${data.inboxPendingCount} item${data.inboxPendingCount === 1 ? "" : "s"} waiting in your Inbox.
      </p>
    `);
  }

  return `<!doctype html>
<html>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1917;max-width:520px;margin:0 auto;padding:24px;">
    <h1 style="font-size:18px;margin:0 0 8px;">Scoutbase — ${weekday}</h1>
    ${sections.join("\n")}
    <p style="margin-top:32px;font-size:12px;color:#a8a29e;">You're getting this because Scoutbase's daily digest is on. Turn it off any time in Settings.</p>
  </body>
</html>`;
}

export function renderDigestSubject(weekday: string, count: number): string {
  return `Scoutbase — ${weekday}: ${count} for today`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
