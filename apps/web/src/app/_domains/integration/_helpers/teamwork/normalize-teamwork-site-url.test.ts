import { describe, expect, it } from "vitest";
import { normalizeTeamworkSiteUrl } from "./normalize-teamwork-site-url";

describe("normalizeTeamworkSiteUrl", () => {
  it("adds the scheme to a bare host", () => {
    expect(normalizeTeamworkSiteUrl("acme.teamwork.com")).toBe(
      "https://acme.teamwork.com",
    );
  });

  it("reduces a deep link to the site origin", () => {
    expect(
      normalizeTeamworkSiteUrl("https://Acme.teamwork.com/app/projects/12/"),
    ).toBe("https://acme.teamwork.com");
  });

  it("keeps a regional subdomain", () => {
    expect(normalizeTeamworkSiteUrl("https://acme.eu.teamwork.com")).toBe(
      "https://acme.eu.teamwork.com",
    );
  });

  it.each([
    "",
    "   ",
    "http://acme.teamwork.com",
    "https://acme.teamwork.com:8443",
    "https://teamwork.com",
    "https://acme.teamwork.com.evil.test",
    "https://evilteamwork.com",
    "not a url",
  ])("rejects %j", (input) => {
    expect(normalizeTeamworkSiteUrl(input)).toBeNull();
  });
});
