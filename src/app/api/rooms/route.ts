import { NextRequest, NextResponse } from "next/server";
import { getActor, validOrigin } from "@/lib/server/auth";
import { createRoom, joinCode, listRooms } from "@/lib/server/rooms";

export const runtime = "nodejs";
export async function GET() { return NextResponse.json({ rooms: await listRooms() }); }

export async function POST(request: NextRequest) {
  if (!validOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const user = await getActor(request);
  if (!user) return NextResponse.json({ error: "Sign in or continue as a guest." }, { status: 401 });
  try {
    const body = await request.json();
    const result = body.action === "joinCode" ? await joinCode(user, String(body.code || ""))
      : await createRoom(user, String(body.game || ""), String(body.mode || "cash"), String(body.visibility || "public"));
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Request failed." }, { status: 400 });
  }
}
