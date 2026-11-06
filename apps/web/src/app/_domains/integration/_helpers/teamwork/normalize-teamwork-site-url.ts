// The API key is sent to this origin on every call, so only Teamwork-hosted
// sites are accepted: an arbitrary host would let a user aim the server, and
// the key, at any address it can reach.
const TEAMWORK_HOST_SUFFIX = ".teamwork.com";

/**
 * Reduces what a user pastes ("acme.teamwork.com", a deep link into the app,
 * a trailing slash) to the site origin, or `null` when it is not a Teamwork site.
 */
export function normalizeTeamworkSiteUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:") return null;
  if (url.port !== "") return null;
  if (!host.endsWith(TEAMWORK_HOST_SUFFIX)) return null;
  // The bare apex is the marketing site, not an account.
  if (host.length <= TEAMWORK_HOST_SUFFIX.length) return null;

  return `https://${host}`;
}
