import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    data: {
      id: "aad-9f8d7c",
      displayName: "Jane Doe",
      mail: "jane.doe@company.com",
      userPrincipalName: "jane.doe@company.com",
      jobTitle: "Senior Software Engineer",
      accountEnabled: true,
      createdDateTime: new Date(Date.now() - 400 * 24 * 3600_000).toISOString(),
    },
  });
}