import { NextRequest, NextResponse } from "next/server";
import { getActor, validOrigin } from "@/lib/server/auth";
import { adminOverview, administer } from "@/lib/server/admin";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const actor = await getActor(request);
  if (!actor || actor.role !== "admin") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  try { return NextResponse.json(await adminOverview(actor.id)); }
  catch { return NextResponse.json({ error: "Administrator access required." }, { status: 403 }); }
}
export async function POST(request: NextRequest) {
  if (!validOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const actor = await getActor(request);
  if (!actor || actor.role !== "admin") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  try {
    const body = await request.json();
    await administer(actor.id, String(body.action || ""), String(body.targetId || ""), String(body.reason || ""));
    return NextResponse.json(await adminOverview(actor.id));
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Operation failed." }, { status: 400 }); }
}
