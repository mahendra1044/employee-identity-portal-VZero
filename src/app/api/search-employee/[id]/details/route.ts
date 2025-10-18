import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const system = searchParams.get("system");

    if (!system) {
      return NextResponse.json({ error: "System parameter required" }, { status: 400 });
    }

    // Load mock data from backend/mocks/{system}-details.json
    const mockFile = join(process.cwd(), "backend", "mocks", `${system}-details.json`);
    const mockData = await readFile(mockFile, "utf-8");
    const allData = JSON.parse(mockData);

    // FIXED: Handle new structure where data is keyed by userId
    // Try to find data for the specific user ID
    const userData = allData[id] || allData[id.toLowerCase()] || allData[id.toUpperCase()];

    if (!userData) {
      return NextResponse.json(
        { error: `No data found for user ${id} in ${system}` },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: userData });
  } catch (error: any) {
    console.error("Error loading mock data:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load data" },
      { status: 500 }
    );
  }
}