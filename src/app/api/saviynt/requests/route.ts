import { NextResponse } from "next/server";

export async function GET() {
  const now = Date.now();
  return NextResponse.json({
    data: [
      { id: "req-5001", type: "access", item: "ServiceNow ITIL", status: "approved", requestedAt: new Date(now - 3 * 24 * 60 * 60_000).toISOString() },
      { id: "req-5002", type: "role", item: "Security Analyst", status: "pending", requestedAt: new Date(now - 1 * 24 * 60 * 60_000).toISOString() },
      { id: "req-5003", type: "access", item: "VPN Access", status: "rejected", requestedAt: new Date(now - 7 * 24 * 60 * 60_000).toISOString() },
    ],
  });
}