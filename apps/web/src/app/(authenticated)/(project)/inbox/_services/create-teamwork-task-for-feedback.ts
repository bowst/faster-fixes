import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/server/errors/domain-errors";
import { inngest } from "@/server/inngest";
import {
  buildEvent,
  feedbackIntegrationIssueRequestedEvent,
} from "@/server/inngest/events";
import { prisma } from "@workspace/db";
import type { CreateTeamworkTaskForFeedbackInput } from "./create-teamwork-task-for-feedback.schema";

export async function createTeamworkTaskForFeedback(
  {
    feedbackId,
    userId,
  }: CreateTeamworkTaskForFeedbackInput & { userId: string },
  db: typeof prisma = prisma,
) {
  const feedback = await db.feedback.findUnique({
    where: { id: feedbackId },
    include: {
      project: {
        select: {
          organizationId: true,
          teamworkLink: { select: { id: true } },
        },
      },
      teamworkTaskLink: { select: { id: true } },
    },
  });

  if (!feedback) {
    throw new NotFoundError("Feedback not found.");
  }

  const membership = await db.member.findFirst({
    where: { organizationId: feedback.project.organizationId, userId },
  });

  if (!membership) {
    throw new ForbiddenError("Access denied.");
  }

  if (feedback.teamworkTaskLink) {
    throw new ConflictError(
      "A Teamwork task already exists for this feedback.",
    );
  }

  if (!feedback.project.teamworkLink) {
    throw new BadRequestError("No Teamwork task list linked to this project.");
  }

  await inngest.send(
    buildEvent(feedbackIntegrationIssueRequestedEvent, {
      feedbackId,
      target: "teamwork",
    }),
  );

  return { queued: true };
}
