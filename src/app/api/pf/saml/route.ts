export async function GET() {
  // Mocked list of SAML connections created by the employee in Ping Federate
  const data = [
    {
      connectionId: "saml-workday",
      application: "Workday",
      entityId: "urn:company:workday",
      acsUrl: "https://workday.company.com/saml/acs",
      createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      status: "active",
    },
    {
      connectionId: "saml-okta-bridge",
      application: "Okta Bridge",
      entityId: "urn:company:okta:bridge",
      acsUrl: "https://okta.company.com/sso/saml",
      createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
      status: "active",
    },
    {
      connectionId: "saml-legacy-erp",
      application: "Legacy ERP",
      entityId: "urn:company:legacy:erp",
      acsUrl: "https://erp-legacy.company.com/saml/consume",
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      status: "disabled",
    },
  ];

  // Return only 5 important values per connection
  const summarized = data.map((c) => ({
    connectionId: c.connectionId,
    application: c.application,
    entityId: c.entityId,
    status: c.status,
    createdAt: c.createdAt,
  }));

  return Response.json({ ok: true, data: summarized });
}