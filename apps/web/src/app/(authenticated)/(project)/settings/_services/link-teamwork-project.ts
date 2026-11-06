import { BadRequestError } from "@/server/errors/domain-errors";
import { getTeamworkCredentials } from "@/app/_domains/integration/_services/teamwork/get-teamwork-credentials";
import { listTeamworkTasklists } from "@/app/_domains/integration/_services/teamwork/teamwork-rest-client";
import { prisma } from "@workspace/db";
import { getTeamworkAccess } from "./get-teamwork-access";
import type { LinkTeamworkProjectInput } from "./link-teamwork-project.schema";

export async function linkTeamworkProject(
  {
    projectId,
    teamworkProjectId,
    teamworkProjectName,
    tasklistId,
    tasklistName,
    autoCreateTasks,
    userId,
  }: LinkTeamworkProjectInput & { userId: string },
  db: typeof prisma = prisma,
) {
  const { organizationId, installation } = await getTeamworkAccess(
    {
      userId,
      projectId,
      requireAdmin: true,
      adminDeniedMessage: "Only owners and admins can link Teamwork projects.",
    },
    db,
  );

  // The ids come from the client, so confirm the task list belongs to the
  // chosen Teamwork project before every Feedback is sent there.
  const credentials = await getTeamworkCredentials(organizationId, db);
  const tasklists = await listTeamworkTasklists(credentials, teamworkProjectId);
  if (!tasklists.some((tasklist) => tasklist.id === tasklistId)) {
    throw new BadRequestError(
      "This task list is not in the selected Teamwork project.",
    );
  }

  const fields = {
    teamworkInstallationId: installation.id,
    teamworkProjectId,
    teamworkProjectName,
    tasklistId,
    tasklistName,
    autoCreateTasks,
  };

  const link = await db.projectTeamworkLink.upsert({
    where: { projectId },
    update: { ...fields, linkHealthIssue: null },
    create: { projectId, ...fields },
  });

  return { id: link.id };
}
