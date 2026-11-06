import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@/server/errors/domain-errors";
import { prisma } from "@workspace/db";

type GetTeamworkAccessArgs = {
  userId: string;
  projectId: string;
  // Reads (pickers) allow any member; writes are owner/admin only.
  requireAdmin: boolean;
  adminDeniedMessage?: string;
};

/**
 * Resolves the Organization owning the Project, checks the caller's membership,
 * and returns the Organization's Teamwork installation. Resolving the
 * Organization from the Project, not the caller's active one, keeps a user of
 * several Organizations from reading another one's Teamwork site.
 */
export async function getTeamworkAccess(
  {
    userId,
    projectId,
    requireAdmin,
    adminDeniedMessage,
  }: GetTeamworkAccessArgs,
  db: typeof prisma = prisma,
) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { organizationId: true },
  });

  if (!project) {
    throw new NotFoundError("Project not found.");
  }

  const membership = await db.member.findFirst({
    where: {
      organizationId: project.organizationId,
      userId,
      ...(requireAdmin ? { role: { in: ["owner", "admin"] } } : {}),
    },
  });

  if (!membership) {
    throw new ForbiddenError(adminDeniedMessage ?? "Access denied.");
  }

  const installation = await db.teamworkInstallation.findUnique({
    where: { organizationId: project.organizationId },
    select: { id: true, siteUrl: true },
  });

  if (!installation) {
    throw new BadRequestError(
      "Teamwork is not connected. Connect a Teamwork site first.",
    );
  }

  return { organizationId: project.organizationId, installation };
}

export type GetTeamworkAccessOutput = Awaited<
  ReturnType<typeof getTeamworkAccess>
>;
