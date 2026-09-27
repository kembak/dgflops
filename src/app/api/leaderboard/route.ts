import { NextRequest, NextResponse } from "next/server";
import { leaderboard } from "@/lib/server/economy";
import { read } from "@/lib/server/store";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const period = request.nextUrl.searchParams.get("period") === "weekly" ? "weekly" : "all";
  return NextResponse.json({ period, leaders: await read((state) => leaderboard(state, period)) });
}
