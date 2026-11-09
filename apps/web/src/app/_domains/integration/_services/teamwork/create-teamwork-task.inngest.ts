import { rethrowDomainErrorsAsNonRetriable } from "@/server/errors/non-retriable";
import { TeamworkTaskConfigurationError } from "./teamwork-errors";
import {
  formatTeamworkTaskDescription,
  formatTeamworkTaskName,
} from "../../_helpers/teamwork/format-task-html";
import { createTeamworkTask as createTask } from "./teamwork-rest-client";
import { getTeamworkCredentials } from "./get-teamwork-credentials";
import { getSignedAssetUrl } from "@/server/storage/get-signed-asset-url";
import { buildFeedbackDashboardUrl } from "../../_helpers/build-feedback-dashboard-url";
import type { CustomMetadata, DiagnosticTrail } from "@fasterfixes/core";
import { prisma } from "@workspace/db";
import { inngest } from "@/server/inngest";
import {
  feedbackCreatedEvent,
  feedbackIntegrationIssueRequestedEvent,
} from "@/server/inngest/events";

export const createTeamworkTask = inngest.createFunction(
  {
    id: "create-teamwork-task",
    retries: 3,
    concurrency: { key: "event.data.feedbackId", limit: 1 },
    triggers: [
      { event: feedbackCreatedEvent },
      {
        event: feedbackIntegrationIssueRequestedEvent,
        if: "event.data.target == 'teamwork'",
      },
    ],
  },
  async ({ event }) => {
    const { feedbackId } = event.data;

    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
      include: {
        project: {
          include: {
            teamworkLink: { include: { teamworkInstallation: true } },
          },
        },
        reviewer: { select: { name: true } },
        video: { select: { title: true } },
        screenshot: { select: { key: true, bucket: true } },
        teamworkTaskLink: { select: { id: true } },
      },
    });

    if (!feedback) return { skipped: "feedback_not_found" };

    // A re-emitted `feedback/created` must never create a second task.
    if (feedback.teamworkTaskLink) {
      return { skipped: "teamwork_task_already_exists" };
    }

    const link = feedback.project.teamworkLink;
    if (!link) return { skipped: "no_teamwork_link" };

    // Auto-create gates only `feedback/created`; the inbox button bypasses it.
    const isManualTrigger =
      event.name === "feedback/integration-issue-requested";
    if (!isManualTrigger && !link.autoCreateTasks) {
      return { skipped: "auto_create_disabled" };
    }

    // A disconnected Installation or a rejected key is a fact about the data,
    // so retrying reads the same row; a Teamwork outage still retries.
    const credentials = await getTeamworkCredentials(
      link.teamworkInstallation.organizationId,
    ).catch(rethrowDomainErrorsAsNonRetriable);

    let screenshotUrl: string | null = null;
    if (feedback.screenshot) {
      screenshotUrl = await getSignedAssetUrl(feedback.screenshot, 3600);
    }

    const description = formatTeamworkTaskDescription({
      comment: feedback.comment,
      pageUrl: feedback.pageUrl,
      selector: feedback.selector,
      clickX: feedback.clickX,
      clickY: feedback.clickY,
      browserName: feedback.browserName,
      browserVersion: feedback.browserVersion,
      os: feedback.os,
      viewportWidth: feedback.viewportWidth,
      viewportHeight: feedback.viewportHeight,
      screenshotUrl,
      reviewerName: feedback.reviewer.name,
      metadata: feedback.metadata as Record<string, unknown> | null,
      diagnosticTrail: feedback.diagnosticTrail as DiagnosticTrail | null,
      customMetadata: feedback.customMetadata as CustomMetadata | null,
      dashboardUrl: buildFeedbackDashboardUrl(feedback),
      videoId: feedback.videoId,
      videoTitle: feedback.video?.title,
      startMs: feedback.startMs,
      endMs: feedback.endMs,
      frameX: feedback.frameX,
      frameY: feedback.frameY,
      frameWidth: feedback.frameWidth,
      frameHeight: feedback.frameHeight,
    });

    let task;
    try {
      task = await createTask(credentials, {
        tasklistId: link.tasklistId,
        name: formatTeamworkTaskName(feedback.comment),
        description,
      });
    } catch (error) {
      // Drift in the user's Teamwork cannot be retried away. Mark the link so
      // the settings page shows it instead of the failure dying in the queue.
      if (error instanceof TeamworkTaskConfigurationError) {
        await prisma.projectTeamworkLink.update({
          where: { id: link.id },
          data: { linkHealthIssue: error.reason },
        });
        return {
          skipped: "teamwork_configuration_rejected",
          reason: error.reason,
        };
      }
      return rethrowDomainErrorsAsNonRetriable(error);
    }

    await prisma.feedbackTeamworkTaskLink.create({
      data: {
        feedbackId: feedback.id,
        projectTeamworkLinkId: link.id,
        taskId: task.id,
        taskUrl: task.url,
        lastSyncSource: "app",
        lastSyncAt: new Date(),
      },
    });

    return { taskId: task.id };
  },
);
