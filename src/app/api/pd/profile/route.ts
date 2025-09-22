import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    data: {
      userId: "u12345",
      name: "Jane Doe",
      email: "jane.doe@company.com",
      department: "Engineering",
      title: "Senior Software Engineer",
      status: "active",
      manager: "john.smith@company.com",
      location: "NYC",
      createdAt: new Date(Date.now() - 86400_000 * 365).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });
}