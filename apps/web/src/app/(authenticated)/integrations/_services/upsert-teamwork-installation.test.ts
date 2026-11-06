import { BadRequestError, ForbiddenError } from "@/server/errors/domain-errors";
import { TeamworkUnauthorizedError } from "@/app/_domains/integration/_services/teamwork/teamwork-errors";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getFullOrganization = vi.fn();
const getTeamworkPerson = vi.fn();

vi.mock("@/server/auth", () => ({
  auth: { api: { getFullOrganization } },
}));

vi.mock(
  "@/app/_domains/integration/_services/teamwork/teamwork-rest-client",
  async (importOriginal) => ({
    ...(await importOriginal<object>()),
    getTeamworkPerson,
  }),
);

vi.mock("@/app/_domains/integration/_services/teamwork/token-crypto", () => ({
  encryptToken: (plain: string) => `enc(${plain})`,
}));

const { upsertTeamworkInstallation } =
  await import("./upsert-teamwork-installation");

type FakeDb = NonNullable<Parameters<typeof upsertTeamworkInstallation>[1]>;

function fakeDb(membership: { id: string } | null) {
  return {
    member: { findFirst: vi.fn().mockResolvedValue(membership) },
    teamworkInstallation: { upsert: vi.fn().mockResolvedValue({}) },
  } as unknown as FakeDb;
}

const input = {
  siteUrl: "acme.teamwork.com/app/home",
  apiKey: "twp_key",
  headers: new Headers(),
  userId: "user_1",
};

describe("upsertTeamworkInstallation", () => {
  beforeEach(() => {
    getFullOrganization.mockReset().mockResolvedValue({ id: "org_1" });
    getTeamworkPerson.mockReset();
  });

  it("refuses a caller who is not an owner or admin", async () => {
    const db = fakeDb(null);

    await expect(upsertTeamworkInstallation(input, db)).rejects.toThrow(
      new ForbiddenError("Only owners and admins can connect Teamwork."),
    );
    expect(getTeamworkPerson).not.toHaveBeenCalled();
  });

  it("refuses a site that is not hosted by Teamwork, without sending the key", async () => {
    const db = fakeDb({ id: "member_1" });

    await expect(
      upsertTeamworkInstallation(
        { ...input, siteUrl: "https://internal.example" },
        db,
      ),
    ).rejects.toThrow(BadRequestError);
    expect(getTeamworkPerson).not.toHaveBeenCalled();
    expect(db.teamworkInstallation.upsert).not.toHaveBeenCalled();
  });

  it("refuses a key Teamwork rejects", async () => {
    getTeamworkPerson.mockRejectedValue(new TeamworkUnauthorizedError());
    const db = fakeDb({ id: "member_1" });

    await expect(upsertTeamworkInstallation(input, db)).rejects.toThrow(
      new BadRequestError(
        "Teamwork rejected this API key. Check the key and the site URL.",
      ),
    );
    expect(db.teamworkInstallation.upsert).not.toHaveBeenCalled();
  });

  it("stores the normalized site and the encrypted key", async () => {
    getTeamworkPerson.mockResolvedValue({ id: "7", name: "Ada Lovelace" });
    const db = fakeDb({ id: "member_1" });

    await expect(upsertTeamworkInstallation(input, db)).resolves.toEqual({
      success: true,
    });
    expect(getTeamworkPerson).toHaveBeenCalledWith({
      siteUrl: "https://acme.teamwork.com",
      apiKey: "twp_key",
    });

    const data = {
      siteUrl: "https://acme.teamwork.com",
      siteName: "acme.teamwork.com",
      apiKey: "enc(twp_key)",
      teamworkUserName: "Ada Lovelace",
      installedById: "member_1",
    };
    expect(db.teamworkInstallation.upsert).toHaveBeenCalledWith({
      where: { organizationId: "org_1" },
      update: data,
      create: { organizationId: "org_1", ...data },
    });
  });
});
