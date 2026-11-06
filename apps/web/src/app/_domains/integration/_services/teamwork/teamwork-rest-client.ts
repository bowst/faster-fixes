// Authenticated Teamwork.com REST calls (API v3). Teamwork accepts an API key
// as the user half of HTTP Basic auth, with any password; the site origin is
// per account, so every call takes it alongside the key.

import { PreconditionFailedError } from "@/server/errors/domain-errors";
import { normalizeTeamworkSiteUrl } from "../../_helpers/teamwork/normalize-teamwork-site-url";
import {
  TeamworkTaskConfigurationError,
  TeamworkUnauthorizedError,
} from "./teamwork-errors";

const API_PREFIX = "/projects/api/v3";

// Teamwork's v3 list endpoints page with `page` and `pageSize`, and report
// `meta.page.hasMore`. Loop rather than truncate so large accounts still show
// every project in the picker.
const PAGE_SIZE = 250;
const MAX_PAGES = 20;

export type TeamworkCredentials = {
  siteUrl: string;
  apiKey: string;
};

export type TeamworkPerson = {
  id: string;
  name: string;
};

export type TeamworkProjectSummary = {
  id: string;
  name: string;
};

export type TeamworkTasklistSummary = {
  id: string;
  name: string;
};

type PageMeta = { meta?: { page?: { hasMore?: boolean } } };

type MeResponse = {
  person: { id: number; firstName?: string; lastName?: string };
};

type ProjectsResponse = PageMeta & {
  projects: { id: number; name: string }[];
};

type TasklistsResponse = PageMeta & {
  tasklists: { id: number; name: string }[];
};

type CreateTaskResponse = {
  task: { id: number };
};

export class TeamworkRequestError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
    path: string,
  ) {
    super(`Teamwork request failed (${status}) for ${path}: ${body}`);
    this.name = "TeamworkRequestError";
  }
}

function authorizationHeader(apiKey: string): string {
  return `Basic ${Buffer.from(`${apiKey}:x`).toString("base64")}`;
}

async function teamworkRequest<T>(
  { siteUrl, apiKey }: TeamworkCredentials,
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<T> {
  // Re-checked on every call, not only when saved, so a stored value that did
  // not pass through the connect flow can never send the key elsewhere.
  const origin = normalizeTeamworkSiteUrl(siteUrl);
  if (origin !== siteUrl) {
    throw new PreconditionFailedError(
      "The saved Teamwork site URL is not a Teamwork site. Reconnect Teamwork in Integrations.",
    );
  }

  const response = await fetch(`${origin}${API_PREFIX}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: authorizationHeader(apiKey),
      Accept: "application/json",
      ...(init.body !== undefined && { "Content-Type": "application/json" }),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    // The key must never follow a redirect to another host.
    redirect: "error",
  });

  if (response.status === 401) {
    throw new TeamworkUnauthorizedError();
  }

  if (!response.ok) {
    throw new TeamworkRequestError(
      response.status,
      await response.text(),
      path,
    );
  }

  return (await response.json()) as T;
}

async function listAllPages<TItem, TResponse extends PageMeta>(
  credentials: TeamworkCredentials,
  path: string,
  pick: (response: TResponse) => TItem[],
): Promise<TItem[]> {
  const items: TItem[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const separator = path.includes("?") ? "&" : "?";
    const response = await teamworkRequest<TResponse>(
      credentials,
      `${path}${separator}page=${page}&pageSize=${PAGE_SIZE}`,
    );
    items.push(...pick(response));
    if (!response.meta?.page?.hasMore) break;
  }
  return items;
}

/** Validates the key and names its owner. A bad key throws `TeamworkUnauthorizedError`. */
export async function getTeamworkPerson(
  credentials: TeamworkCredentials,
): Promise<TeamworkPerson> {
  const { person } = await teamworkRequest<MeResponse>(credentials, "/me.json");
  const name = [person.firstName, person.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return { id: String(person.id), name: name || "Unknown user" };
}

export async function listTeamworkProjects(
  credentials: TeamworkCredentials,
): Promise<TeamworkProjectSummary[]> {
  const projects = await listAllPages<
    ProjectsResponse["projects"][number],
    ProjectsResponse
  >(credentials, "/projects.json", (response) => response.projects);

  return projects
    .map((project) => ({ id: String(project.id), name: project.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listTeamworkTasklists(
  credentials: TeamworkCredentials,
  teamworkProjectId: string,
): Promise<TeamworkTasklistSummary[]> {
  const tasklists = await listAllPages<
    TasklistsResponse["tasklists"][number],
    TasklistsResponse
  >(
    credentials,
    `/projects/${encodeURIComponent(teamworkProjectId)}/tasklists.json`,
    (response) => response.tasklists,
  );

  return tasklists.map((tasklist) => ({
    id: String(tasklist.id),
    name: tasklist.name,
  }));
}

export async function createTeamworkTask(
  credentials: TeamworkCredentials,
  input: { tasklistId: string; name: string; description: string },
): Promise<{ id: string; url: string }> {
  let response: CreateTaskResponse;
  try {
    response = await teamworkRequest<CreateTaskResponse>(
      credentials,
      `/tasklists/${encodeURIComponent(input.tasklistId)}/tasks.json`,
      {
        method: "POST",
        body: {
          task: {
            name: input.name,
            // No `descriptionContentType`: Teamwork rejects "HTML" as no longer
            // supported and "MARKDOWN" as unknown, and the spec lists no values.
            description: input.description,
          },
        },
      },
    );
  } catch (error) {
    // A missing or forbidden task list is drift in the user's Teamwork, not a
    // transient failure: the same request will keep failing.
    if (
      error instanceof TeamworkRequestError &&
      (error.status === 403 || error.status === 404)
    ) {
      throw new TeamworkTaskConfigurationError("stale_tasklist", error.body);
    }
    throw error;
  }

  const id = String(response.task.id);
  return { id, url: `${credentials.siteUrl}/app/tasks/${id}` };
}
