import { getTeamworkCredentials } from "@/app/_domains/integration/_services/teamwork/get-teamwork-credentials";
import { listTeamworkProjects } from "@/app/_domains/integration/_services/teamwork/teamwork-rest-client";
import { prisma } from "@workspace/db";
import { getTeamworkAccess } from "./get-teamwork-access";
import type { ListAccessibleTeamworkProjectsInput } from "./list-accessible-teamwork-projects.schema";

export async function listAccessibleTeamworkProjects(
  {
    projectId,
    userId,
  }: ListAccessibleTeamworkProjectsInput & { userId: string },
  db: typeof prisma = prisma,
) {
  const { organizationId } = await getTeamworkAccess(
    { userId, projectId, requireAdmin: false },
    db,
  );

  const credentials = await getTeamworkCredentials(organizationId, db);
  return listTeamworkProjects(credentials);
}

export type ListAccessibleTeamworkProjectsOutput = Awaited<
  ReturnType<typeof listAccessibleTeamworkProjects>
>;
