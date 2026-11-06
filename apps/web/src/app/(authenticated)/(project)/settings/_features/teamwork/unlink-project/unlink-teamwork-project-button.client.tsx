"use client";

import { useTRPC } from "@/lib/trpc/trpc-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import { Unlink } from "lucide-react";
import { toast } from "sonner";

type UnlinkTeamworkProjectButtonProps = {
  projectId: string;
};

export function UnlinkTeamworkProjectButton({
  projectId,
}: UnlinkTeamworkProjectButtonProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const unlinkMutation = useMutation(
    trpc.authenticated.projects.teamwork.unlinkProject.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.authenticated.projects.teamwork.getLink.queryKey({
            projectId,
          }),
        });
        toast.success("Teamwork task list unlinked.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-fit">
          <Unlink className="size-3" />
          Unlink task list
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unlink Teamwork task list?</AlertDialogTitle>
          <AlertDialogDescription>
            Feedback will no longer create Teamwork tasks. Existing tasks will
            not be deleted, and the organization stays connected to Teamwork.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => unlinkMutation.mutate({ projectId })}
            variant="destructive"
          >
            Unlink
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
