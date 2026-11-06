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
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import type { GetTeamworkInstallationOutput } from "../../_services/get-teamwork-installation";

type TeamworkConnectedProps = {
  installation: NonNullable<GetTeamworkInstallationOutput>;
};

export function TeamworkConnected({ installation }: TeamworkConnectedProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const disconnectMutation = useMutation(
    trpc.authenticated.integrations.teamwork.disconnect.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey:
            trpc.authenticated.integrations.teamwork.getInstallation.queryKey(),
        });
        toast.success("Teamwork disconnected.");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col">
        <span className="font-medium">{installation.siteName}</span>
        <span className="text-sm text-muted-foreground">
          API key of {installation.teamworkUserName}, connected
          {installation.installedByName
            ? ` by ${installation.installedByName}`
            : ""}{" "}
          on{" "}
          {new Date(installation.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" asChild>
          <a
            href={installation.siteUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open in Teamwork
            <ExternalLink className="ml-1 size-3" />
          </a>
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              Disconnect
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disconnect Teamwork?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the stored API key and unlinks all projects from
                this Teamwork site. Existing Teamwork tasks will not be deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => disconnectMutation.mutate()}>
                Disconnect
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
