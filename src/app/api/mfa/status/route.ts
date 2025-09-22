import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    data: {
      userId: "u12345",
      status: "Enabled",
      lastEvent: "Push timeout",
      lastEventAt: new Date().toISOString(),
      enrolledFactorTypes: ["push", "otp"],
    },
  });
}