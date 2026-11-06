import z from "zod";

export const ListTeamworkTasklistsForProjectSchema = z.object({
  projectId: z.string(),
  teamworkProjectId: z.string().min(1),
});

export type ListTeamworkTasklistsForProjectInput = z.infer<
  typeof ListTeamworkTasklistsForProjectSchema
>;
