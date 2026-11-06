import z from "zod";

export const CreateTeamworkTaskForFeedbackSchema = z.object({
  feedbackId: z.string(),
});

export type CreateTeamworkTaskForFeedbackInput = z.infer<
  typeof CreateTeamworkTaskForFeedbackSchema
>;
