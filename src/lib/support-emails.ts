export function getSupportEmail(system: string): string {
  const emails: Record<string, string> = {
    "ping-directory": "support-directory@company.com",
    "ping-federate": "support-federate@company.com",
    "cyberark": "support-cyberark@company.com",
    "saviynt": "support-saviynt@company.com",
    "azure-ad": "support-azure@company.com",
    "ping-mfa": "support-mfa@company.com",
  };
  return emails[system] || "support@company.com";
}