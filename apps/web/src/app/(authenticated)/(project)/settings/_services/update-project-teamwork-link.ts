import { NotFoundError } from "@/server/errors/domain-errors";
import { prisma } from "@workspace/db";
import { getTeamworkAccess } from "./get-teamwork-access";
import type { UpdateProjectTeamworkLinkInput } from "./update-project-teamwork-link.schema";

export async function updateProjectTeamworkLink(
  {
    projectId,
    autoCreateTasks,
    userId,
  }: UpdateProjectTeamworkLinkInput & { userId: string },
  db: typeof prisma = prisma,
) {
  await getTeamworkAccess(
    {
      userId,
      projectId,
      requireAdmin: true,
      adminDeniedMessage:
        "Only owners and admins can change Teamwork link settings.",
    },
    db,
  );

  const link = await db.projectTeamworkLink.findUnique({
    where: { projectId },
    select: { id: true },
  });

  if (!link) {
    throw new NotFoundError(
      "This project is not linked to a Teamwork project.",
    );
  }

  await db.projectTeamworkLink.update({
    where: { id: link.id },
    data: { autoCreateTasks },
  });

  return { success: true };
}
