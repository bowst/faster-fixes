import { describe, expect, it } from "vitest";
import {
  type FeedbackForTeamworkTask,
  formatTeamworkTaskDescription,
  formatTeamworkTaskName,
} from "./format-task-html";

const feedback: FeedbackForTeamworkTask = {
  comment: "The save button does nothing",
  pageUrl: "https://example.com/settings",
  selector: "#save",
  clickX: 10,
  clickY: 20,
  browserName: "Chrome",
  browserVersion: "130",
  os: "macOS",
  viewportWidth: 1280,
  viewportHeight: 720,
  screenshotUrl: "https://cdn.example.com/shot.png?sig=1&exp=2",
  reviewerName: "Ada",
  metadata: null,
  diagnosticTrail: {
    console: [{ level: "error", message: "Save\nfailed", timestamp: 0 }],
    network: [
      {
        method: "POST",
        url: "https://example.com/api/save",
        status: 0,
        duration: 12.4,
        timestamp: 0,
      },
    ],
  },
  dashboardUrl: "https://app.example.com/inbox?feedbackId=fb_1",
};

describe("formatTeamworkTaskName", () => {
  it("flattens a multi-line comment to one line", () => {
    expect(formatTeamworkTaskName("Broken\n\n  header")).toBe("Broken header");
  });

  it("truncates a long comment like the other Trackers", () => {
    const name = formatTeamworkTaskName("word ".repeat(40));
    expect(name.length).toBeLessThanOrEqual(83);
    expect(name.endsWith("...")).toBe(true);
  });
});

describe("formatTeamworkTaskDescription", () => {
  it("escapes reviewer-controlled text so it cannot add links or markup", () => {
    const text = formatTeamworkTaskDescription({
      ...feedback,
      comment: `<img src=x onerror="alert(1)"> [click](https://evil.example)`,
      reviewerName: "**Eve**",
    });

    expect(text).not.toContain("<img");
    expect(text).toContain('&lt;img src=x onerror="alert\\(1\\)"&gt;');
    expect(text).toContain("\\[click\\]\\(https://evil.example\\)");
    expect(text).toContain("Submitted by \\*\\*Eve\\*\\*");
  });

  it("quotes every line of the comment", () => {
    const text = formatTeamworkTaskDescription({
      ...feedback,
      comment: "a\nb",
    });
    expect(text).toContain("> a\n> b");
  });

  it("renders the page, element, screenshot and dashboard links", () => {
    const text = formatTeamworkTaskDescription(feedback);

    expect(text).toContain(
      "**Page:** [example.com/settings](https://example.com/settings)",
    );
    expect(text).toContain("**Element:** `#save` · at (10, 20)");
    expect(text).toContain(
      "**Screenshot:** [view](https://cdn.example.com/shot.png?sig=1&exp=2)",
    );
    expect(text).toContain(
      "[View in dashboard](https://app.example.com/inbox?feedbackId=fb_1)",
    );
  });

  it("encodes characters that would end a link target early", () => {
    const text = formatTeamworkTaskDescription({
      ...feedback,
      pageUrl: "https://example.com/a (b)",
    });
    expect(text).toContain("](https://example.com/a%20%28b%29)");
  });

  it("lists diagnostics with one line per entry", () => {
    const text = formatTeamworkTaskDescription(feedback);

    expect(text).toContain("(1 console, 1 network)");
    expect(text).toContain("- `error` Save failed");
    expect(text).toContain(
      "- `POST` https://example.com/api/save → ERR (12ms)",
    );
  });

  it("omits optional sections that have no data", () => {
    const text = formatTeamworkTaskDescription({
      ...feedback,
      selector: null,
      clickX: null,
      clickY: null,
      screenshotUrl: null,
      diagnosticTrail: null,
      customMetadata: null,
    });

    expect(text).not.toContain("Element:");
    expect(text).not.toContain("Screenshot:");
    expect(text).not.toContain("Diagnostics");
    expect(text).not.toContain("Custom metadata");
  });

  it("renders Custom metadata in declared order", () => {
    const text = formatTeamworkTaskDescription({
      ...feedback,
      customMetadata: { userId: "42", beta: true },
    });

    expect(text).toContain("- userId: 42\n- beta: true");
  });
});
