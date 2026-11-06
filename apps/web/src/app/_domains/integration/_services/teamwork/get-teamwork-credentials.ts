import { prisma } from "@workspace/db";
import { TeamworkNotConnectedError } from "./teamwork-errors";
import type { TeamworkCredentials } from "./teamwork-rest-client";
import { decryptToken } from "./token-crypto";

/** The Organization's Teamwork site and decrypted API key, for one REST call chain. */
export async function getTeamworkCredentials(
  organizationId: string,
  db: typeof prisma = prisma,
): Promise<TeamworkCredentials> {
  const installation = await db.teamworkInstallation.findUnique({
    where: { organizationId },
    select: { siteUrl: true, apiKey: true },
  });

  if (!installation) {
    throw new TeamworkNotConnectedError();
  }

  return {
    siteUrl: installation.siteUrl,
    apiKey: decryptToken(installation.apiKey),
  };
}

export type GetTeamworkCredentialsOutput = Awaited<
  ReturnType<typeof getTeamworkCredentials>
>;
