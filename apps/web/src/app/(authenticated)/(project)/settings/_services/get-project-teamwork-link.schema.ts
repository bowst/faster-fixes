import z from "zod";

export const GetProjectTeamworkLinkSchema = z.object({
  projectId: z.string(),
});

export type GetProjectTeamworkLinkInput = z.infer<
  typeof GetProjectTeamworkLinkSchema
>;
