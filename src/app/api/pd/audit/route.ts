import { NextResponse } from "next/server";

export async function GET() {
  const now = Date.now();
  return NextResponse.json({
    data: [
      { action: "modify", attribute: "title", old: "Software Engineer", new: "Senior Software Engineer", actor: "hr-bot", timestamp: new Date(now - 3600_000).toISOString() },
      { action: "add", attribute: "group", new: "Developers", actor: "idm-sync", timestamp: new Date(now - 7200_000).toISOString() },
      { action: "modify", attribute: "location", old: "Remote", new: "NYC", actor: "self-service", timestamp: new Date(now - 86_400_000).toISOString() },
    ],
  });
}