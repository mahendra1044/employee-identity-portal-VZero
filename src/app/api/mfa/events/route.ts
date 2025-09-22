import { NextResponse } from "next/server";

export async function GET() {
  const now = Date.now();
  return NextResponse.json({
    data: [
      { id: "evt-1001", type: "push", result: "timeout", app: "Corp SSO", timestamp: new Date(now - 3 * 60_000).toISOString() },
      { id: "evt-1000", type: "push", result: "approved", app: "Email", timestamp: new Date(now - 60 * 60_000).toISOString() },
      { id: "evt-0999", type: "otp", result: "approved", app: "VPN", timestamp: new Date(now - 24 * 60 * 60_000).toISOString() },
    ],
  });
}