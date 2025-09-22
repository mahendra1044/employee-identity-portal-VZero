import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    data: [
      { id: "grp-dev", name: "Developers", type: "security" },
      { id: "grp-eng", name: "Engineering", type: "distribution" },
      { id: "grp-nyc", name: "NYC Office", type: "security" },
    ],
  });
}