import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@/server/errors/domain-errors";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listTeamworkTasklists = vi.fn();

vi.mock(
  "@/app/_domains/integration/_services/teamwork/teamwork-rest-client",
  () => ({ listTeamworkTasklists }),
);

vi.mock("@/app/_domains/integration/_services/teamwork/token-crypto", () => ({
  decryptToken: (payload: string) => payload.replace(/^enc:/, ""),
}));

const { linkTeamworkProject } = await import("./link-teamwork-project");

type FakeDb = NonNullable<Parameters<typeof linkTeamworkProject>[1]>;

type FakeInstallation = { id: string; siteUrl: string; apiKey: string };

function fakeDb(
  project: { organizationId: string } | null,
  membership: { id: string } | null,
  installation: FakeInstallation | null = null,
) {
  return {
    project: { findUnique: vi.fn().mockResolvedValue(project) },
    member: { findFirst: vi.fn().mockResolvedValue(membership) },
    teamworkInstallation: {
      findUnique: vi.fn().mockResolvedValue(installation),
    },
    projectTeamworkLink: {
      upsert: vi.fn().mockResolvedValue({ id: "link_1" }),
    },
  } as unknown as FakeDb;
}

const project = { organizationId: "org_1" };
const member = { id: "member_1" };
const installation = {
  id: "install_1",
  siteUrl: "https://acme.teamwork.com",
  apiKey: "enc:twp_key",
};

const input = {
  projectId: "project_1",
  teamworkProjectId: "100",
  teamworkProjectName: "Client site",
  tasklistId: "200",
  tasklistName: "Client feedback",
  autoCreateTasks: false,
  userId: "user_1",
};

describe("linkTeamworkProject", () => {
  beforeEach(() => {
    listTeamworkTasklists.mockReset();
  });

  it("reports an unknown project as not found", async () => {
    await expect(
      linkTeamworkProject(input, fakeDb(null, null)),
    ).rejects.toThrow(new NotFoundError("Project not found."));
  });

  it("refuses a caller who is not an owner or an admin", async () => {
    await expect(
      linkTeamworkProject(input, fakeDb(project, null)),
    ).rejects.toThrow(
      new ForbiddenError("Only owners and admins can link Teamwork projects."),
    );
  });

  it("refuses an organization that has not connected Teamwork", async () => {
    await expect(
      linkTeamworkProject(input, fakeDb(project, member)),
    ).rejects.toThrow(
      new BadRequestError(
        "Teamwork is not connected. Connect a Teamwork site first.",
      ),
    );
  });

  it("refuses a task list that is not in the selected Teamwork project", async () => {
    listTeamworkTasklists.mockResolvedValue([{ id: "999", name: "Other" }]);
    const db = fakeDb(project, member, installation);

    await expect(linkTeamworkProject(input, db)).rejects.toThrow(
      new BadRequestError(
        "This task list is not in the selected Teamwork project.",
      ),
    );
    expect(db.projectTeamworkLink.upsert).not.toHaveBeenCalled();
  });

  it("links the task list with the decrypted key and clears any health issue", async () => {
    listTeamworkTasklists.mockResolvedValue([
      { id: "200", name: "Client feedback" },
    ]);
    const db = fakeDb(project, member, installation);

    await expect(linkTeamworkProject(input, db)).resolves.toEqual({
      id: "link_1",
    });
    expect(listTeamworkTasklists).toHaveBeenCalledWith(
      { siteUrl: "https://acme.teamwork.com", apiKey: "twp_key" },
      "100",
    );

    const fields = {
      teamworkInstallationId: "install_1",
      teamworkProjectId: "100",
      teamworkProjectName: "Client site",
      tasklistId: "200",
      tasklistName: "Client feedback",
      autoCreateTasks: false,
    };
    expect(db.projectTeamworkLink.upsert).toHaveBeenCalledWith({
      where: { projectId: "project_1" },
      update: { ...fields, linkHealthIssue: null },
      create: { projectId: "project_1", ...fields },
    });
  });
});
