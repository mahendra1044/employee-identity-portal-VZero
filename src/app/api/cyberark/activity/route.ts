import { NextResponse } from "next/server";

export async function GET() {
  const now = Date.now();
  return NextResponse.json({
    data: [
      { id: "act-301", action: "checkout", account: "svc_corp_app", actor: "jane.doe@company.com", timestamp: new Date(now - 20 * 60_000).toISOString() },
      { id: "act-300", action: "checkin", account: "svc_corp_app", actor: "jane.doe@company.com", timestamp: new Date(now - 10 * 60_000).toISOString() },
      { id: "act-299", action: "rotate", account: "db_reader", actor: "rotate-bot", timestamp: new Date(now - 24 * 60 * 60_000).toISOString() },
    ],
  });
}