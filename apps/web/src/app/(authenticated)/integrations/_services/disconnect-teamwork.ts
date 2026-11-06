import { auth } from "@/server/auth";
import { BadRequestError, ForbiddenError } from "@/server/errors/domain-errors";
import { prisma } from "@workspace/db";

// Teamwork API keys cannot be revoked by a third party, so disconnecting only
// forgets the key; the owner revokes it in Teamwork if needed.
export async function disconnectTeamwork(
  { headers, userId }: { headers: Headers; userId: string },
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
    throw new ForbiddenError("Only owners and admins can disconnect Teamwork.");
  }

  // Cascades to every Project link and task link.
  await db.teamworkInstallation.deleteMany({
    where: { organizationId: activeOrganization.id },
  });

  return { success: true };
}
