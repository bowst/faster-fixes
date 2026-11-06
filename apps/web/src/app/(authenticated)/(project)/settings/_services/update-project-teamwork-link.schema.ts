import { z } from "zod";

// Changing the project or task list goes back through `linkTeamworkProject`,
// which re-checks that the task list belongs to the project.
export const UpdateProjectTeamworkLinkSchema = z.object({
  projectId: z.string(),
  autoCreateTasks: z.boolean(),
});

export type UpdateProjectTeamworkLinkInput = z.infer<
  typeof UpdateProjectTeamworkLinkSchema
>;
