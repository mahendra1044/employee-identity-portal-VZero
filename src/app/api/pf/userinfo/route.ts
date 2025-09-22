export async function GET() {
  // Mocked Ping Federate UserInfo response
  const data = {
    sub: "u12345",
    name: "Alice Johnson",
    preferred_username: "alice.johnson",
    email: "employee@company.com",
    email_verified: true,
    department: "Engineering",
    last_login: new Date().toISOString(),
    issuer: "https://pingfederate.example.com"
  };

  return Response.json({ ok: true, data });
}