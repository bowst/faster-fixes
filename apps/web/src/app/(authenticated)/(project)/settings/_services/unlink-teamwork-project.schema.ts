import z from "zod";

export const UnlinkTeamworkProjectSchema = z.object({
  projectId: z.string(),
});

export type UnlinkTeamworkProjectInput = z.infer<
  typeof UnlinkTeamworkProjectSchema
>;
