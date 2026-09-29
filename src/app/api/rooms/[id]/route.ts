import { NextRequest, NextResponse } from "next/server";
import { getActor, validOrigin } from "@/lib/server/auth";
import { getRoom, sendMessage, updateRoom } from "@/lib/server/rooms";
import type { BaccaratSide } from "@/lib/games/house";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  const user = await getActor(request);
  if (!user) return NextResponse.json({ error: "Sign in or continue as a guest." }, { status: 401 });
  try { return NextResponse.json(await getRoom(user, (await context.params).id)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Request failed." }, { status: 404 }); }
}

export async function POST(request: NextRequest, context: Context) {
  if (!validOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const user = await getActor(request);
  if (!user) return NextResponse.json({ error: "Sign in or continue as a guest." }, { status: 401 });
  try {
    const body = await request.json();
    const id = (await context.params).id;
    const result = body.action === "chat" ? await sendMessage(user, id, String(body.body || ""))
      : await updateRoom(user, id, String(body.action || ""), Number(body.amount || 0), body.side as BaccaratSide,
        body.action === "tick" ? undefined : { id: String(body.actionId || ""), version: Number(body.version) });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Request failed." }, { status: 400 });
  }
}
