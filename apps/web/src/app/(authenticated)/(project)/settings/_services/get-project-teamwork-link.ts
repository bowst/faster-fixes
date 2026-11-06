import { ForbiddenError, NotFoundError } from "@/server/errors/domain-errors";
import { prisma } from "@workspace/db";
import type { GetProjectTeamworkLinkInput } from "./get-project-teamwork-link.schema";

export async function getProjectTeamworkLink(
  { projectId, userId }: GetProjectTeamworkLinkInput & { userId: string },
  db: typeof prisma = prisma,
) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { organizationId: true },
  });

  if (!project) {
    throw new NotFoundError("Project not found.");
  }

  // Not routed through `getTeamworkAccess`: the current link stays readable
  // even when the Organization has disconnected Teamwork.
  const membership = await db.member.findFirst({
    where: { organizationId: project.organizationId, userId },
  });

  if (!membership) {
    throw new ForbiddenError("Access denied.");
  }

  return db.projectTeamworkLink.findUnique({
    where: { projectId },
    select: {
      id: true,
      teamworkProjectId: true,
      teamworkProjectName: true,
      tasklistId: true,
      tasklistName: true,
      autoCreateTasks: true,
      linkHealthIssue: true,
    },
  });
}

export type GetProjectTeamworkLinkOutput = Awaited<
  ReturnType<typeof getProjectTeamworkLink>
>;
