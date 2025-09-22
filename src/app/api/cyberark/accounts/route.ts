import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    data: [
      { safe: "CORP-APP-PROD", account: "svc_corp_app", platform: "Windows", status: "checked-in" },
      { safe: "CORP-APP-PROD", account: "db_reader", platform: "PostgreSQL", status: "available" },
      { safe: "INFRA-SECRETS", account: "jenkins_admin", platform: "Linux", status: "in-use" },
    ],
  });
}