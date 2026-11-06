import { getTeamworkCredentials } from "@/app/_domains/integration/_services/teamwork/get-teamwork-credentials";
import { listTeamworkTasklists } from "@/app/_domains/integration/_services/teamwork/teamwork-rest-client";
import { prisma } from "@workspace/db";
import { getTeamworkAccess } from "./get-teamwork-access";
import type { ListTeamworkTasklistsForProjectInput } from "./list-teamwork-tasklists-for-project.schema";

export async function listTeamworkTasklistsForProject(
  {
    projectId,
    teamworkProjectId,
    userId,
  }: ListTeamworkTasklistsForProjectInput & { userId: string },
  db: typeof prisma = prisma,
) {
  const { organizationId } = await getTeamworkAccess(
    { userId, projectId, requireAdmin: false },
    db,
  );

  const credentials = await getTeamworkCredentials(organizationId, db);
  return listTeamworkTasklists(credentials, teamworkProjectId);
}

export type ListTeamworkTasklistsForProjectOutput = Awaited<
  ReturnType<typeof listTeamworkTasklistsForProject>
>;
