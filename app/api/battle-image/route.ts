import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url || !/^https?:\/\//i.test(url)) return new NextResponse("Invalid image URL", { status: 400 });
  try {
    const upstream = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" });
    if (!upstream.ok) return new NextResponse("Image unavailable", { status: 502 });
    const type = upstream.headers.get("content-type") || "image/jpeg";
    if (!type.startsWith("image/")) return new NextResponse("Not an image", { status: 415 });
    return new NextResponse(await upstream.arrayBuffer(), { headers: { "Content-Type": type, "Cache-Control": "public, max-age=3600" } });
  } catch { return new NextResponse("Image unavailable", { status: 502 }); }
}
