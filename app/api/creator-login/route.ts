import { NextResponse } from "next/server";
import { cleanUsername } from "../../shared";
import { serverClient } from "../_server";
import { cookieName, currentCreator, issueSession, lifetime } from "./session";

const denied = () => NextResponse.json({error: "Check your TikTok username and creator password."}, {status: 401});
export async function POST(request: Request) {
  const {username, password} = await request.json();
  if (typeof username !== "string" || typeof password !== "string" || !password || password.length > 64) return denied();
  const name = cleanUsername(username);
  const {data, error} = await serverClient().rpc("verify_creator_login", {login_username: name, login_password: password});
  if (error) return NextResponse.json({error: "Creator sign-in is temporarily unavailable."}, {status: 503});
  if (!data) return denied();
  const response = NextResponse.json({username: name});
  response.cookies.set(cookieName, issueSession(name), {httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: lifetime});
  return response;
}

export async function GET() {
  const username = await currentCreator();
  return username ? NextResponse.json({username}, {headers: {"Cache-Control": "no-store"}}) : denied();
}

export async function DELETE() {
  const response = NextResponse.json({ok: true});
  response.cookies.delete(cookieName);
  return response;
}
