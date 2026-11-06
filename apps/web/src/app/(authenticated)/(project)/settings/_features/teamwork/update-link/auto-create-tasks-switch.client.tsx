"use client";

import { useTRPC } from "@/lib/trpc/trpc-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { toast } from "sonner";

type AutoCreateTasksSwitchProps = {
  projectId: string;
  checked: boolean;
};

export function AutoCreateTasksSwitch({
  projectId,
  checked,
}: AutoCreateTasksSwitchProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const updateMutation = useMutation(
    trpc.authenticated.projects.teamwork.updateLink.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.authenticated.projects.teamwork.getLink.queryKey({
            projectId,
          }),
        });
        toast.success("Settings updated.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <Label htmlFor="teamwork-auto-create" className="text-sm">
          Auto-create tasks from feedback
        </Label>
        <p className="text-xs text-muted-foreground">
          When off, create tasks one at a time from the inbox.
        </p>
      </div>
      <Switch
        id="teamwork-auto-create"
        checked={checked}
        disabled={updateMutation.isPending}
        onCheckedChange={(value) =>
          updateMutation.mutate({ projectId, autoCreateTasks: value })
        }
      />
    </div>
  );
}
