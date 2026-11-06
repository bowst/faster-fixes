"use client";

import { usePlanGate } from "@/app/_domains/subscription";
import { useActiveOrganization } from "@/lib/auth";
import { useTRPC } from "@/lib/trpc/trpc-client";
import { getErrorMessage } from "@/utils/error/get-error-message";
import { matchQueryStatus } from "@/utils/tanstack-query/match-query-status";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { TeamworkProjectPicker } from "./link-project/teamwork-project-picker.client";
import { LinkedTeamworkProjectView } from "./linked-teamwork-project-view.client";

type TeamworkSectionProps = {
  projectId: string;
};

export function TeamworkSection({ projectId }: TeamworkSectionProps) {
  const { data: activeOrg } = useActiveOrganization();
  const { canAccess } = usePlanGate();

  if (!canAccess("teamworkIntegration")) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Teamwork integration is available on paid plans.
        </p>
        <Button className="w-fit" asChild>
          <a href="/account/billing">Upgrade your plan</a>
        </Button>
      </div>
    );
  }

  return <TeamworkSectionInner orgId={activeOrg?.id} projectId={projectId} />;
}

type TeamworkSectionInnerProps = {
  orgId: string | undefined;
  projectId: string;
};

function TeamworkSectionInner({ orgId, projectId }: TeamworkSectionInnerProps) {
  const trpc = useTRPC();

  const installationQuery = useQuery(
    trpc.authenticated.integrations.teamwork.getInstallation.queryOptions(
      undefined,
      { enabled: !!orgId },
    ),
  );

  return matchQueryStatus(installationQuery, {
    Loading: <Skeleton className="h-16 w-full" />,
    Errored: (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load Teamwork integration. Try refreshing the page.
        </AlertDescription>
      </Alert>
    ),
    Empty: (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Connect a Teamwork site in organization settings to link a task list.
        </p>
        <Button variant="link" className="w-fit px-0" asChild>
          <a href="/integrations">Go to integrations</a>
        </Button>
      </div>
    ),
    Success: ({ data: installation }) => (
      <LinkOrPickTeamworkProject
        projectId={projectId}
        siteUrl={installation.siteUrl}
      />
    ),
  });
}

type LinkOrPickTeamworkProjectProps = {
  projectId: string;
  siteUrl: string;
};

function LinkOrPickTeamworkProject({
  projectId,
  siteUrl,
}: LinkOrPickTeamworkProjectProps) {
  const trpc = useTRPC();

  const linkQuery = useQuery(
    trpc.authenticated.projects.teamwork.getLink.queryOptions({ projectId }),
  );

  const teamworkProjectsQuery = useQuery(
    trpc.authenticated.projects.teamwork.listProjects.queryOptions(
      { projectId },
      { enabled: !linkQuery.data },
    ),
  );

  return matchQueryStatus(linkQuery, {
    Loading: <Skeleton className="h-32 w-full" />,
    Errored: (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load the Teamwork link. Try refreshing the page.
        </AlertDescription>
      </Alert>
    ),
    Success: ({ data: link }) =>
      link ? (
        <LinkedTeamworkProjectView
          projectId={projectId}
          link={link}
          siteUrl={siteUrl}
        />
      ) : (
        matchQueryStatus(teamworkProjectsQuery, {
          Loading: <Skeleton className="h-32 w-full" />,
          Errored: (error) => (
            <Alert variant="destructive">
              <AlertTitle>Failed to load your Teamwork projects</AlertTitle>
              <AlertDescription>{getErrorMessage(error)}</AlertDescription>
            </Alert>
          ),
          Success: ({ data: teamworkProjects }) => (
            <TeamworkProjectPicker
              projectId={projectId}
              teamworkProjects={teamworkProjects ?? []}
            />
          ),
        })
      ),
  });
}
