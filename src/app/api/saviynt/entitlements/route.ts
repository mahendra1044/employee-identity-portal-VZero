import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    data: [
      { id: "sav-ent-github", name: "GitHub Org Member", app: "GitHub" },
      { id: "sav-ent-snow", name: "ServiceNow ITIL", app: "ServiceNow" },
      { id: "sav-ent-vpn", name: "VPN Access", app: "GlobalProtect" },
    ],
  });
}