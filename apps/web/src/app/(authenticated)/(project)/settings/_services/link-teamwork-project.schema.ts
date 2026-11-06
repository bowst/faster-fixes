import { z } from "zod";

export const LinkTeamworkProjectSchema = z.object({
  projectId: z.string(),
  teamworkProjectId: z.string().min(1, "Select a Teamwork project."),
  teamworkProjectName: z.string().min(1),
  tasklistId: z.string().min(1, "Select a task list."),
  tasklistName: z.string().min(1),
  autoCreateTasks: z.boolean(),
});

export type LinkTeamworkProjectInput = z.infer<
  typeof LinkTeamworkProjectSchema
>;
