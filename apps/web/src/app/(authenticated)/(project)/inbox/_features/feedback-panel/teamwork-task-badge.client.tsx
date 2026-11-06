"use client";

import { useTRPC } from "@/lib/trpc/trpc-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { ListChecks } from "lucide-react";
import { toast } from "sonner";
import type { ListFeedbackOutput } from "../../_services/list-feedback";

type TeamworkTaskBadgeProps = {
  taskLink: ListFeedbackOutput[number]["teamworkTaskLink"];
  feedbackId: string;
  hasTeamworkLink: boolean;
  projectId: string;
};

export function TeamworkTaskBadge({
  taskLink,
  feedbackId,
  hasTeamworkLink,
  projectId,
}: TeamworkTaskBadgeProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const createTaskMutation = useMutation(
    trpc.authenticated.projects.feedback.createTeamworkTask.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.authenticated.projects.feedback.list.queryKey({
            projectId,
          }),
        });
        toast.success("Teamwork task creation queued.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  if (taskLink) {
    return (
      <a
        href={taskLink.taskUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ListChecks className="size-3.5" aria-hidden="true" />
        <span>Teamwork task {taskLink.taskId}</span>
      </a>
    );
  }

  if (!hasTeamworkLink) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => createTaskMutation.mutate({ feedbackId })}
      disabled={createTaskMutation.isPending}
    >
      <ListChecks className="mr-1 size-3.5" />
      Create Teamwork task
    </Button>
  );
}
