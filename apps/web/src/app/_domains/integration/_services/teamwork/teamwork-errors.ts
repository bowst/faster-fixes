import { PreconditionFailedError } from "@/server/errors/domain-errors";

/**
 * The expected Teamwork failures, as second-level subclasses of the vocabulary
 * of ADR 0012. Every message is final user copy: tRPC surfaces it verbatim on
 * the Teamwork screens. They sit in their own module so a boundary or a test
 * can name them without pulling in the database client or the token cipher.
 * `TeamworkRequestError` is infrastructure and stays a plain `Error`.
 */

export class TeamworkNotConnectedError extends PreconditionFailedError {
  constructor() {
    super("Teamwork is not connected. Connect a Teamwork site first.");
    this.name = "TeamworkNotConnectedError";
  }
}

// Teamwork answered 401: the key was revoked or its owner lost access. Retrying
// with the same key can never succeed.
export class TeamworkUnauthorizedError extends PreconditionFailedError {
  constructor() {
    super(
      "Teamwork rejected the API key. Disconnect Teamwork and connect it again with a valid key.",
    );
    this.name = "TeamworkUnauthorizedError";
  }
}

export type TeamworkTaskConfigurationReason = "stale_tasklist";

/**
 * Teamwork refused the linked task list itself (deleted, archived, or no longer
 * visible to the key's owner). Callers store the reason on the link instead of
 * burning the retry budget.
 */
export class TeamworkTaskConfigurationError extends PreconditionFailedError {
  constructor(
    // Matches the ProjectTeamworkLink.linkHealthIssue vocabulary.
    readonly reason: TeamworkTaskConfigurationReason,
    // Raw Teamwork response body, kept off the message so user copy never
    // carries a provider payload.
    readonly detail: string,
  ) {
    super(
      "The linked Teamwork task list is no longer available. Update the Teamwork link in the Project settings.",
    );
    this.name = "TeamworkTaskConfigurationError";
  }
}
