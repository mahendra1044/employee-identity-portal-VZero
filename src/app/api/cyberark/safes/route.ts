import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    data: [
      { name: "CORP-APP-PROD", description: "Production app credentials" },
      { name: "CORP-APP-NONPROD", description: "Non-prod app credentials" },
      { name: "INFRA-SECRETS", description: "Infrastructure secrets" },
    ],
  });
}