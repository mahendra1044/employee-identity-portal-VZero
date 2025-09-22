import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    data: [
      { id: "aad-grp-owners", displayName: "App Owners", description: "Owners of Corp App" },
      { id: "aad-grp-dev", displayName: "Developers", description: "Engineering developers" },
      { id: "aad-grp-sec", displayName: "Security", description: "Security team" },
    ],
  });
}