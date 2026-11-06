import { ForbiddenError, NotFoundError } from "@/server/errors/domain-errors";
import { prisma } from "@workspace/db";
import type { UnlinkTeamworkProjectInput } from "./unlink-teamwork-project.schema";

// Not plan-gated, and not routed through `getTeamworkAccess`: unlinking must
// stay possible after a downgrade or after Teamwork was disconnected.
export async function unlinkTeamworkProject(
  { projectId, userId }: UnlinkTeamworkProjectInput & { userId: string },
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
      role: { in: ["owner", "admin"] },
    },
  });

  if (!membership) {
    throw new ForbiddenError(
      "Only owners and admins can unlink Teamwork projects.",
    );
  }

  await db.projectTeamworkLink.deleteMany({ where: { projectId } });

  return { success: true };
}
