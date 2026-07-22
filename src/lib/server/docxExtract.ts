"use server";

import mammoth from "mammoth";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB — matches next.config.ts's serverActions.bodySizeLimit

/**
 * The `mammoth` npm package only offers convertToHtml/extractRawText, no
 * markdown output — extractRawText alone would flatten bullet points into
 * plain paragraphs. Bullets matter here: the heuristic parser
 * (src/lib/triageFallback.ts) treats a leading "- " as a strong signal of
 * an actual action item, so list items are converted to "- " lines before
 * the rest of the HTML is stripped.
 */
function htmlToNoteMarkdown(html: string): string {
  return html
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/(p|h[1-6]|div|tr)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * §7.5 meeting notes — extracts text from an uploaded .docx file so it can
 * fill a note's body, ready to review before "Extract actions" runs on it.
 */
export async function extractDocxNoteBody(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false as const, error: "No file received." };
  }

  if (!file.name.toLowerCase().endsWith(".docx")) {
    return { ok: false as const, error: "Only .docx files are supported." };
  }

  if (file.size > MAX_BYTES) {
    return { ok: false as const, error: "File is too large (10MB max)." };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await mammoth.convertToHtml({ buffer });
    const text = htmlToNoteMarkdown(result.value);
    if (!text) {
      return { ok: false as const, error: "Couldn't find any text in that document." };
    }
    return { ok: true as const, text };
  } catch {
    return { ok: false as const, error: "Couldn't read that file — is it a valid .docx?" };
  }
}
