"use client";

import { useTRPC } from "@/lib/trpc/trpc-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  UpsertTeamworkInstallationSchema,
  type UpsertTeamworkInstallationInput,
} from "../../_services/upsert-teamwork-installation.schema";

export function TeamworkNotConnected() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<UpsertTeamworkInstallationInput>({
    resolver: zodResolver(UpsertTeamworkInstallationSchema),
    defaultValues: { siteUrl: "", apiKey: "" },
  });

  const connectMutation = useMutation(
    trpc.authenticated.integrations.teamwork.connect.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey:
            trpc.authenticated.integrations.teamwork.getInstallation.queryKey(),
        });
        toast.success("Teamwork connected.");
      },
      onError: (error) => {
        form.setError("root", { message: error.message });
      },
    }),
  );

  const onSubmit = (data: UpsertTeamworkInstallationInput) => {
    connectMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <p className="text-sm text-muted-foreground">
          No Teamwork site connected. Tasks are created as the person who owns
          the API key, so use a shared account rather than a personal one.
        </p>

        <FormField
          control={form.control}
          name="siteUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Site URL</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://yourcompany.teamwork.com"
                  autoComplete="off"
                  disabled={connectMutation.isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="apiKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel>API key</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="off"
                  disabled={connectMutation.isPending}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                In Teamwork, open your profile, then Edit details, then API and
                Mobile.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.formState.errors.root && (
          <p className="text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}

        <Button
          type="submit"
          disabled={connectMutation.isPending}
          className="w-fit"
        >
          {connectMutation.isPending ? "Connecting..." : "Connect Teamwork"}
        </Button>
      </form>
    </Form>
  );
}
