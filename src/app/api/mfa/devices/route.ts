import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    data: [
      { id: "dev-ios-14", type: "iOS", model: "iPhone 14", addedAt: new Date(Date.now() - 10 * 24 * 3600_000).toISOString(), lastUsedAt: new Date(Date.now() - 60 * 1000).toISOString() },
      { id: "dev-mac-1", type: "MacOS", model: "MacBook Pro 14", addedAt: new Date(Date.now() - 120 * 24 * 3600_000).toISOString(), lastUsedAt: new Date(Date.now() - 3600_000).toISOString() },
    ],
  });
}