import { auth } from "@/server/auth";
import { BadRequestError, ForbiddenError } from "@/server/errors/domain-errors";
import { normalizeTeamworkSiteUrl } from "@/app/_domains/integration/_helpers/teamwork/normalize-teamwork-site-url";
import { TeamworkUnauthorizedError } from "@/app/_domains/integration/_services/teamwork/teamwork-errors";
import {
  getTeamworkPerson,
  TeamworkRequestError,
} from "@/app/_domains/integration/_services/teamwork/teamwork-rest-client";
import { encryptToken } from "@/app/_domains/integration/_services/teamwork/token-crypto";
import { prisma } from "@workspace/db";
import type { UpsertTeamworkInstallationInput } from "./upsert-teamwork-installation.schema";

export async function upsertTeamworkInstallation(
  {
    siteUrl,
    apiKey,
    headers,
    userId,
  }: UpsertTeamworkInstallationInput & { headers: Headers; userId: string },
  db: typeof prisma = prisma,
) {
  const activeOrganization = await auth.api.getFullOrganization({ headers });

  if (!activeOrganization) {
    throw new BadRequestError("No active organization.");
  }

  const membership = await db.member.findFirst({
    where: {
      organizationId: activeOrganization.id,
      userId,
      role: { in: ["owner", "admin"] },
    },
  });

  if (!membership) {
    throw new ForbiddenError("Only owners and admins can connect Teamwork.");
  }

  const normalizedSiteUrl = normalizeTeamworkSiteUrl(siteUrl);
  if (!normalizedSiteUrl) {
    throw new BadRequestError(
      "Enter a Teamwork site URL, for example https://yourcompany.teamwork.com.",
    );
  }

  // Validated before saving so a typo surfaces here, not as failed task runs.
  let person;
  try {
    person = await getTeamworkPerson({ siteUrl: normalizedSiteUrl, apiKey });
  } catch (error) {
    if (error instanceof TeamworkUnauthorizedError) {
      throw new BadRequestError(
        "Teamwork rejected this API key. Check the key and the site URL.",
      );
    }
    if (error instanceof TeamworkRequestError || error instanceof TypeError) {
      throw new BadRequestError(
        "Could not reach this Teamwork site. Check the site URL.",
      );
    }
    throw error;
  }

  const data = {
    siteUrl: normalizedSiteUrl,
    siteName: new URL(normalizedSiteUrl).hostname,
    apiKey: encryptToken(apiKey),
    teamworkUserName: person.name,
    installedById: membership.id,
  };

  await db.teamworkInstallation.upsert({
    where: { organizationId: activeOrganization.id },
    update: data,
    create: { organizationId: activeOrganization.id, ...data },
  });

  return { success: true };
}
