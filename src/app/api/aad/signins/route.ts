import { NextResponse } from "next/server";

export async function GET() {
  const now = Date.now();
  return NextResponse.json({
    data: [
      { id: "si-1", appName: "Office 365", status: "success", ip: "203.0.113.10", timestamp: new Date(now - 5 * 60_000).toISOString() },
      { id: "si-2", appName: "VPN", status: "success", ip: "203.0.113.11", timestamp: new Date(now - 65 * 60_000).toISOString() },
      { id: "si-3", appName: "Corp SSO", status: "failure", ip: "203.0.113.12", reason: "invalid credentials", timestamp: new Date(now - 2 * 24 * 60 * 60_000).toISOString() },
    ],
  });
}