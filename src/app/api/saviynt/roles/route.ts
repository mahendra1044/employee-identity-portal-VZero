import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    data: [
      { id: "sav-role-dev", name: "Developer", risk: "medium" },
      { id: "sav-role-sec", name: "Security Analyst", risk: "high" },
    ],
  });
}