"use client";

import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { ExternalLink } from "lucide-react";
import type { GetProjectTeamworkLinkOutput } from "../../_services/get-project-teamwork-link";
import { UnlinkTeamworkProjectButton } from "./unlink-project/unlink-teamwork-project-button.client";
import { AutoCreateTasksSwitch } from "./update-link/auto-create-tasks-switch.client";

// Keyed on ProjectTeamworkLink.linkHealthIssue.
const LINK_HEALTH_MESSAGES: Record<string, string> = {
  stale_tasklist:
    "Teamwork rejected the linked task list, usually because it was deleted or archived. Unlink and pick a task list again to resume creating tasks.",
};

const FALLBACK_LINK_HEALTH_MESSAGE =
  "This link needs attention. Unlink and pick the task list again to clear this warning.";

type LinkedTeamworkProjectViewProps = {
  projectId: string;
  link: NonNullable<GetProjectTeamworkLinkOutput>;
  siteUrl: string;
};

export function LinkedTeamworkProjectView({
  projectId,
  link,
  siteUrl,
}: LinkedTeamworkProjectViewProps) {
  return (
    <div className="flex flex-col gap-4">
      {link.linkHealthIssue && (
        <Alert variant="destructive">
          <AlertDescription>
            {LINK_HEALTH_MESSAGES[link.linkHealthIssue] ??
              FALLBACK_LINK_HEALTH_MESSAGE}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-1">
        <a
          href={`${siteUrl}/app/projects/${link.teamworkProjectId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium hover:underline"
        >
          {link.teamworkProjectName}
          <ExternalLink className="ml-1 inline size-3" />
        </a>
        <p className="text-sm text-muted-foreground">
          Task list: {link.tasklistName}
        </p>
      </div>

      <AutoCreateTasksSwitch
        projectId={projectId}
        checked={link.autoCreateTasks}
      />

      <UnlinkTeamworkProjectButton projectId={projectId} />
    </div>
  );
}
