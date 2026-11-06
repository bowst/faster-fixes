import z from "zod";

export const ListAccessibleTeamworkProjectsSchema = z.object({
  projectId: z.string(),
});

export type ListAccessibleTeamworkProjectsInput = z.infer<
  typeof ListAccessibleTeamworkProjectsSchema
>;
