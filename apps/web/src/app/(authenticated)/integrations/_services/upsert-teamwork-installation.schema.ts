import { z } from "zod";

export const UpsertTeamworkInstallationSchema = z.object({
  siteUrl: z.string().trim().min(1, "Enter your Teamwork site URL."),
  apiKey: z.string().trim().min(1, "Enter a Teamwork API key."),
});

export type UpsertTeamworkInstallationInput = z.infer<
  typeof UpsertTeamworkInstallationSchema
>;
