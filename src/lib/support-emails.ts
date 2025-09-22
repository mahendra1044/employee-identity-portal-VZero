export type SystemKey =
  | "ping-directory"
  | "ping-federate"
  | "cyberark"
  | "saviynt"
  | "azure-ad"
  | "ping-mfa";

export const SUPPORT_EMAILS: Record<SystemKey, string> = {
  "ping-directory": "ops@pingdirectoryteam.com",
  "ping-federate": "ops@pingfedteam.com",
  cyberark: "ops@cyberarkteam.com",
  saviynt: "ops@saviyntteam.com",
  "azure-ad": "ops@azureadteam.com",
  "ping-mfa": "ops@pingmfa.team.com",
};

export const getSupportEmail = (system: SystemKey) => SUPPORT_EMAILS[system];