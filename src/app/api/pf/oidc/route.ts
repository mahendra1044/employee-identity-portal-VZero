export async function GET() {
  // Mocked list of OIDC connections created by the employee in Ping Federate
  const data = [
    {
      connectionId: "oidc-salesforce",
      application: "Salesforce",
      clientId: "sf_123_client",
      redirectUris: ["https://app.salesforce.com/callback"],
      grantTypes: ["authorization_code", "refresh_token"],
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      status: "active",
    },
    {
      connectionId: "oidc-slack",
      application: "Slack",
      clientId: "slk_456_client",
      redirectUris: ["https://slack.com/callback"],
      grantTypes: ["authorization_code"],
      createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      status: "active",
    },
    {
      connectionId: "oidc-internal-portal",
      application: "Internal Portal",
      clientId: "int_789_client",
      redirectUris: ["https://portal.company.com/oidc/cb"],
      grantTypes: ["authorization_code", "client_credentials"],
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: "disabled",
    },
  ];

  // Only return the 5 most important values per connection in a flattened shape
  const summarized = data.map((c) => ({
    connectionId: c.connectionId,
    application: c.application,
    clientId: c.clientId,
    status: c.status,
    createdAt: c.createdAt,
  }));

  return Response.json({ ok: true, data: summarized });
}