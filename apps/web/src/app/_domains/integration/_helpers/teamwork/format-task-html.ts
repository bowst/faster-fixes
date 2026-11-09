import type { CustomMetadata, DiagnosticTrail } from "@fasterfixes/core";
import {
  describeVideoLocation,
  formatIssueTitle,
} from "../github/format-issue-body";

export type FeedbackForTeamworkTask = {
  comment: string;
  // Null on a video Feedback (ADR-0020).
  pageUrl: string | null;
  selector: string | null;
  clickX: number | null;
  clickY: number | null;
  browserName: string | null;
  browserVersion: string | null;
  os: string | null;
  viewportWidth: number | null;
  viewportHeight: number | null;
  screenshotUrl: string | null;
  reviewerName: string;
  metadata: Record<string, unknown> | null;
  diagnosticTrail: DiagnosticTrail | null;
  customMetadata?: CustomMetadata | null;
  dashboardUrl: string;
  videoId?: string | null;
  videoTitle?: string | null;
  startMs?: number | null;
  endMs?: number | null;
  frameX?: number | null;
  frameY?: number | null;
  frameWidth?: number | null;
  frameHeight?: number | null;
};

const SEPARATOR = " · ";

// Reviewer-controlled text is escaped so it cannot add links, images or raw
// HTML to a task the team will open.
function escapeMarkdown(value: string): string {
  return value
    .replace(/[\\`*_{}[\]()#+!|~]/g, "\\$&")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Only http(s) targets become links, so a reviewer cannot plant a
// `javascript:` link. `href` percent-encodes whitespace and angle brackets;
// parentheses are encoded too because they end a Markdown link target.
function safeUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  return parsed.href.replace(/\(/g, "%28").replace(/\)/g, "%29");
}

function link(label: string, href: string): string {
  const target = safeUrl(href);
  if (!target) return escapeMarkdown(label);
  return `[${escapeMarkdown(label)}](${target})`;
}

// A code span ends at a backtick or a blank line, so both are removed.
function code(value: string): string {
  return `\`${collapseWhitespace(value).replace(/`/g, "'")}\``;
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** A task name is one line: the comment is flattened, then truncated like every Tracker title. */
export function formatTeamworkTaskName(comment: string): string {
  return formatIssueTitle(collapseWhitespace(comment));
}

/**
 * The task description in Markdown (Teamwork rejects HTML descriptions), in
 * the section order of the GitHub issue body. The screenshot is a link rather
 * than an image: the signed URL expires after an hour.
 */
export function formatTeamworkTaskDescription(
  feedback: FeedbackForTeamworkTask,
): string {
  const blocks: string[] = [];

  blocks.push(
    feedback.comment
      .split("\n")
      .map((line) => `> ${escapeMarkdown(line)}`)
      .join("\n"),
  );

  const details: string[] = [];
  if (feedback.videoId) {
    details.push(
      `**Video:** ${escapeMarkdown(describeVideoLocation(feedback).join(SEPARATOR))}`,
    );
  }
  if (feedback.pageUrl) {
    const displayUrl = feedback.pageUrl.replace(/^https?:\/\//, "");
    details.push(`**Page:** ${link(displayUrl, feedback.pageUrl)}`);
  }

  const locationParts: string[] = [];
  const md = feedback.metadata;
  if (typeof md?.reactComponentPath === "string" && md.reactComponentPath) {
    locationParts.push(code(md.reactComponentPath));
  }
  if (typeof md?.sourceFile === "string" && md.sourceFile) {
    locationParts.push(code(md.sourceFile));
  }
  if (feedback.selector) locationParts.push(code(feedback.selector));
  if (feedback.clickX != null && feedback.clickY != null) {
    locationParts.push(`at (${feedback.clickX}, ${feedback.clickY})`);
  }
  if (locationParts.length > 0) {
    details.push(`**Element:** ${locationParts.join(SEPARATOR)}`);
  }

  if (feedback.screenshotUrl) {
    details.push(
      `**Screenshot:** ${link("view", feedback.screenshotUrl)} (link valid for one hour, also available in the dashboard)`,
    );
  }
  // Two trailing spaces force a line break inside one paragraph.
  if (details.length > 0) blocks.push(details.join("  \n"));

  const envParts: string[] = [];
  if (feedback.browserName) {
    envParts.push(
      feedback.browserName +
        (feedback.browserVersion ? ` ${feedback.browserVersion}` : ""),
    );
  }
  if (feedback.os) envParts.push(feedback.os);
  if (feedback.viewportWidth && feedback.viewportHeight) {
    envParts.push(`${feedback.viewportWidth} × ${feedback.viewportHeight}`);
  }
  blocks.push(
    [
      "**Environment**",
      ...(envParts.length > 0
        ? [escapeMarkdown(envParts.join(SEPARATOR))]
        : []),
      `Submitted by ${escapeMarkdown(feedback.reviewerName)}`,
    ].join("  \n"),
  );

  const customEntries = Object.entries(feedback.customMetadata ?? {});
  if (customEntries.length > 0) {
    blocks.push(
      [
        "**Custom metadata**",
        "",
        ...customEntries.map(
          ([key, value]) =>
            `- ${escapeMarkdown(key)}: ${escapeMarkdown(collapseWhitespace(String(value)))}`,
        ),
      ].join("\n"),
    );
  }

  const trail = feedback.diagnosticTrail;
  if (trail && (trail.console.length > 0 || trail.network.length > 0)) {
    const lines = [
      `**Diagnostics** (${trail.console.length} console, ${trail.network.length} network)`,
    ];
    if (trail.console.length > 0) {
      lines.push("", "Console", "");
      for (const entry of trail.console) {
        lines.push(
          `- ${code(entry.level)} ${escapeMarkdown(collapseWhitespace(entry.message))}`,
        );
      }
    }
    if (trail.network.length > 0) {
      lines.push("", "Network", "");
      for (const entry of trail.network) {
        const status = entry.status === 0 ? "ERR" : String(entry.status);
        lines.push(
          `- ${code(entry.method)} ${escapeMarkdown(entry.url)} → ${status} (${Math.round(entry.duration)}ms)`,
        );
      }
    }
    blocks.push(lines.join("\n"));
  }

  blocks.push(link("View in dashboard", feedback.dashboardUrl));

  return blocks.join("\n\n");
}
