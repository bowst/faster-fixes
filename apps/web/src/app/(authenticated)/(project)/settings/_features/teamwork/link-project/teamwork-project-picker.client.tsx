"use client";

import { useTRPC } from "@/lib/trpc/trpc-client";
import { getErrorMessage } from "@/utils/error/get-error-message";
import { matchQueryStatus } from "@/utils/tanstack-query/match-query-status";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  LinkTeamworkProjectSchema,
  type LinkTeamworkProjectInput,
} from "../../../_services/link-teamwork-project.schema";
import type { ListAccessibleTeamworkProjectsOutput } from "../../../_services/list-accessible-teamwork-projects";

type TeamworkProjectPickerProps = {
  projectId: string;
  teamworkProjects: ListAccessibleTeamworkProjectsOutput;
};

export function TeamworkProjectPicker({
  projectId,
  teamworkProjects,
}: TeamworkProjectPickerProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<LinkTeamworkProjectInput>({
    resolver: zodResolver(LinkTeamworkProjectSchema),
    defaultValues: {
      projectId,
      teamworkProjectId: "",
      teamworkProjectName: "",
      tasklistId: "",
      tasklistName: "",
      autoCreateTasks: false,
    },
  });

  const teamworkProjectId = useWatch({
    control: form.control,
    name: "teamworkProjectId",
  });

  const tasklistsQuery = useQuery(
    trpc.authenticated.projects.teamwork.listTasklists.queryOptions(
      { projectId, teamworkProjectId },
      { enabled: !!teamworkProjectId },
    ),
  );

  const linkMutation = useMutation(
    trpc.authenticated.projects.teamwork.linkProject.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.authenticated.projects.teamwork.getLink.queryKey({
            projectId,
          }),
        });
        toast.success("Teamwork task list linked.");
      },
      onError: (error) => {
        form.setError("root", { message: error.message });
      },
    }),
  );

  const onSubmit = (data: LinkTeamworkProjectInput) => {
    linkMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <FormField
          control={form.control}
          name="teamworkProjectId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teamwork project</FormLabel>
              <Select
                value={field.value}
                onValueChange={(value) => {
                  const teamworkProject = teamworkProjects.find(
                    (p) => p.id === value,
                  );
                  if (!teamworkProject) return;
                  field.onChange(teamworkProject.id);
                  form.setValue("teamworkProjectName", teamworkProject.name);
                  // Task lists belong to one project; the previous choice is
                  // not in the new one.
                  form.setValue("tasklistId", "");
                  form.setValue("tasklistName", "");
                }}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a Teamwork project" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {teamworkProjects.map((teamworkProject) => (
                    <SelectItem
                      key={teamworkProject.id}
                      value={teamworkProject.id}
                    >
                      {teamworkProject.name}
                    </SelectItem>
                  ))}
                  {teamworkProjects.length === 0 && (
                    <SelectItem value="_empty" disabled>
                      No Teamwork projects available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {teamworkProjectId &&
          matchQueryStatus(tasklistsQuery, {
            Loading: <Skeleton className="h-16 w-full" />,
            Errored: (error) => (
              <Alert variant="destructive">
                <AlertTitle>Failed to load the task lists</AlertTitle>
                <AlertDescription>{getErrorMessage(error)}</AlertDescription>
              </Alert>
            ),
            Empty: (
              <p className="text-sm text-muted-foreground">
                This Teamwork project has no task list. Create one in Teamwork,
                then select the project again.
              </p>
            ),
            Success: ({ data: tasklists }) => (
              <FormField
                control={form.control}
                name="tasklistId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task list</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        const tasklist = tasklists.find((t) => t.id === value);
                        if (!tasklist) return;
                        field.onChange(tasklist.id);
                        form.setValue("tasklistName", tasklist.name);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a task list" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tasklists.map((tasklist) => (
                          <SelectItem key={tasklist.id} value={tasklist.id}>
                            {tasklist.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ),
          })}

        {form.formState.errors.root && (
          <p className="text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}

        <Button
          type="submit"
          disabled={linkMutation.isPending}
          className="w-fit"
        >
          {linkMutation.isPending ? "Linking..." : "Link task list"}
        </Button>
      </form>
    </Form>
  );
}
