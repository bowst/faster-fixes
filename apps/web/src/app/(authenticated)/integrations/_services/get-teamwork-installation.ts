import { auth } from "@/server/auth";
import { BadRequestError, ForbiddenError } from "@/server/errors/domain-errors";
import { prisma } from "@workspace/db";

export async function getTeamworkInstallation(
  { headers, userId }: { headers: Headers; userId: string },
  db: typeof prisma = prisma,
) {
  const activeOrganization = await auth.api.getFullOrganization({ headers });

  if (!activeOrganization) {
    throw new BadRequestError("No active organization.");
  }

  // Any member may read the installation; the denial reads the loaded membership.
  const membership = await db.member.findFirst({
    where: { organizationId: activeOrganization.id, userId },
  });

  if (!membership) {
    throw new ForbiddenError("Access denied.");
  }

  const installation = await db.teamworkInstallation.findUnique({
    where: { organizationId: activeOrganization.id },
    include: {
      installedBy: { include: { user: { select: { name: true } } } },
    },
  });

  if (!installation) return null;

  // The API key never leaves the server, not even encrypted.
  return {
    id: installation.id,
    siteUrl: installation.siteUrl,
    siteName: installation.siteName,
    teamworkUserName: installation.teamworkUserName,
    installedByName: installation.installedBy?.user.name ?? null,
    createdAt: installation.createdAt,
  };
}

export type GetTeamworkInstallationOutput = Awaited<
  ReturnType<typeof getTeamworkInstallation>
>;
