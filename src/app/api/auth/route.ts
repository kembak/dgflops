import { NextRequest, NextResponse } from "next/server";
import { createGuest, getActor, login, register, removeSession, sessionCookie, validOrigin } from "@/lib/server/auth";
import { progress } from "@/lib/server/economy";
import { read } from "@/lib/server/store";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getActor(request);
  return NextResponse.json({ user, progress: user && !user.guest ? await read((state) => progress(state, user.id)) : null });
}

export async function POST(request: NextRequest) {
  if (!validOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  try {
    const body = await request.json();
    const action = String(body.action || "");
    if (action === "logout") {
      await removeSession(request);
      const response = NextResponse.json({ user: null });
      response.cookies.set("dgflops_session", "", { maxAge: 0, path: "/" });
      return response;
    }
    let result;
    if (action === "register") result = await register(String(body.username || "").trim(), String(body.password || ""));
    else if (action === "login") result = await login(String(body.username || "").trim(), String(body.password || ""));
    else if (action === "guest") result = await createGuest();
    else return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    const response = NextResponse.json({ user: result.user, progress: result.user.guest ? null : await read((state) => progress(state, result.user.id)) });
    response.cookies.set(sessionCookie(result.session));
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Request failed." }, { status: 400 });
  }
}
