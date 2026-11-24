import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { serverClient } from "../_server";

export const cookieName = "pp_creator_session";
export const lifetime = 60 * 60 * 24 * 7;

function signature(payload: string) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) throw new Error("Session configuration unavailable");
  return createHmac("sha256", key).update("creator-session:" + payload).digest("base64url");
}

export function issueSession(username: string) {
  const expiry = Math.floor(Date.now() / 1000) + lifetime;
  const payload = Buffer.from(JSON.stringify([username, expiry])).toString("base64url");
  return payload + "." + signature(payload);
}

export async function currentCreator() {
  const value = (await cookies()).get(cookieName)?.value;
  if (!value) return null;
  const [payload, mac, extra] = value.split(".");
  if (!payload || !mac || extra !== undefined) return null;
  const expected = Buffer.from(signature(payload));
  const actual = Buffer.from(mac);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  const [username, expiry] = JSON.parse(Buffer.from(payload, "base64url").toString());
  if (expiry <= Date.now() / 1000) return null;
  const {data, error} = await serverClient().from("creator_metrics").select("username").eq("username", username).maybeSingle();
  if (error) throw error;
  return data?.username ?? null;
}
