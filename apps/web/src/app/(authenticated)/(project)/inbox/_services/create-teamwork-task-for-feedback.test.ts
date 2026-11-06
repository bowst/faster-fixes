import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/server/errors/domain-errors";
import { describe, expect, it, vi } from "vitest";
import { createTeamworkTaskForFeedback } from "./create-teamwork-task-for-feedback";

const send = vi
  .fn<(payload: unknown) => Promise<void>>()
  .mockResolvedValue(undefined);

vi.mock("@/server/inngest", () => ({
  inngest: { send: (payload: unknown) => send(payload) },
}));

type FakeDb = NonNullable<Parameters<typeof createTeamworkTaskForFeedback>[1]>;

type FakeFeedback = {
  project: { organizationId: string; teamworkLink: { id: string } | null };
  teamworkTaskLink: { id: string } | null;
};

function fakeDb(
  feedback: FakeFeedback | null,
  membership: { id: string } | null,
) {
  return {
    feedback: { findUnique: vi.fn().mockResolvedValue(feedback) },
    member: { findFirst: vi.fn().mockResolvedValue(membership) },
  } as unknown as FakeDb;
}

const linked: FakeFeedback = {
  project: { organizationId: "org_1", teamworkLink: { id: "link_1" } },
  teamworkTaskLink: null,
};

const member = { id: "member_1" };
const input = { feedbackId: "feedback_1", userId: "user_1" };

describe("createTeamworkTaskForFeedback", () => {
  it("reports an unknown feedback as not found", async () => {
    await expect(
      createTeamworkTaskForFeedback(input, fakeDb(null, null)),
    ).rejects.toThrow(new NotFoundError("Feedback not found."));
  });

  it("refuses a caller who is not a member of the project's organization", async () => {
    await expect(
      createTeamworkTaskForFeedback(input, fakeDb(linked, null)),
    ).rejects.toThrow(new ForbiddenError("Access denied."));
  });

  it("refuses a feedback that already has a Teamwork task", async () => {
    const db = fakeDb(
      { ...linked, teamworkTaskLink: { id: "task_1" } },
      member,
    );

    await expect(createTeamworkTaskForFeedback(input, db)).rejects.toThrow(
      new ConflictError("A Teamwork task already exists for this feedback."),
    );
  });

  it("refuses a project with no linked task list", async () => {
    const db = fakeDb(
      { ...linked, project: { organizationId: "org_1", teamworkLink: null } },
      member,
    );

    await expect(createTeamworkTaskForFeedback(input, db)).rejects.toThrow(
      new BadRequestError("No Teamwork task list linked to this project."),
    );
  });

  it("queues the task creation for a member caller", async () => {
    send.mockClear();

    await expect(
      createTeamworkTaskForFeedback(input, fakeDb(linked, member)),
    ).resolves.toEqual({ queued: true });
    expect(send).toHaveBeenCalledWith({
      name: "feedback/integration-issue-requested",
      data: { feedbackId: "feedback_1", target: "teamwork" },
    });
  });
});
