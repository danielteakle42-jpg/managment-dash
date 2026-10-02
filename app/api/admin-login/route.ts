import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function cleanEnv(value: string | undefined, variableName?: string, isKey = false) {
  if (!value) return "";
  let cleaned = value.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  if (variableName) {
    const prefix = `${variableName}=`;
    if (cleaned.toUpperCase().startsWith(prefix.toUpperCase())) cleaned = cleaned.slice(prefix.length).trim();
  }
  if (isKey && /^Bearer\s+/i.test(cleaned)) cleaned = cleaned.replace(/^Bearer\s+/i, "").trim();
  return cleaned;
}

export async function POST(request: Request) {
  try {
    const { code } = (await request.json()) as { code?: string };
    const submittedCode = String(code || "").trim();
    const expectedCode = cleanEnv(process.env.ADMIN_LOGIN_CODE, "ADMIN_LOGIN_CODE");
    const supabaseUrl = cleanEnv((process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL || "https://atweyeeuipolrgyzvwab.supabase.co"), "NEXT_PUBLIC_SUPABASE_URL");
    const anonKey = cleanEnv((process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0d2V5ZWV1aXBvbHJneXp2d2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3NTYzNjIsImV4cCI6MjEwMzMzMjM2Mn0.Kx4U08T4z0Hn9-2PsYSbY9ant1GF226gECcCLS_c8OI"), "NEXT_PUBLIC_SUPABASE_ANON_KEY", true);
    const serviceKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY", true);
    const adminEmail = "admin@login.platinumpulse.app";

    if (!expectedCode || !supabaseUrl || !anonKey || !serviceKey) {
      return NextResponse.json(
        { error: "Owner login setup is incomplete. Add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, ADMIN_LOGIN_CODE and SUPABASE_SERVICE_ROLE_KEY in Vercel, then redeploy." },
        { status: 503 },
      );
    }

    if (!submittedCode || submittedCode !== expectedCode) {
      return NextResponse.json({ error: "That Owner access code is incorrect." }, { status: 401 });
    }

    // The service-role key is server-only. It lets the hub repair the Owner account
    // automatically instead of depending on a separately-maintained Supabase password.
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: userPage, error: listError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) return NextResponse.json({ error: `Could not inspect the Owner account: ${listError.message}` }, { status: 500 });

    let owner = userPage.users.find((user) => String(user.email || "").toLowerCase() === adminEmail);
    if (!owner) {
      const { data, error } = await adminClient.auth.admin.createUser({
        email: adminEmail,
        password: submittedCode,
        email_confirm: true,
        user_metadata: { username: "agency-controls", display_name: "Owner", role: "admin" },
      });
      if (error || !data.user) return NextResponse.json({ error: `Could not create the Owner account: ${error?.message || "No user returned"}` }, { status: 500 });
      owner = data.user;
    } else {
      const { data, error } = await adminClient.auth.admin.updateUserById(owner.id, {
        password: submittedCode,
        email_confirm: true,
        user_metadata: { ...(owner.user_metadata || {}), username: "agency-controls", display_name: "Owner", role: "admin" },
      });
      if (error || !data.user) return NextResponse.json({ error: `Could not refresh the Owner account: ${error?.message || "No user returned"}` }, { status: 500 });
      owner = data.user;
    }

    const { error: profileError } = await adminClient.from("profiles").upsert(
      { id: owner.id, username: "agency-controls", display_name: "Owner", role: "admin" },
      { onConflict: "id" },
    );
    if (profileError) return NextResponse.json({ error: `Owner account exists, but its admin profile could not be prepared: ${profileError.message}` }, { status: 500 });

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data: signIn, error: signInError } = await authClient.auth.signInWithPassword({
      email: adminEmail,
      password: submittedCode,
    });
    if (signInError || !signIn.session) {
      return NextResponse.json({ error: `Owner account was prepared, but Supabase did not return a session: ${signInError?.message || "No session returned"}` }, { status: 401 });
    }

    return NextResponse.json({
      user_id: owner.id,
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
    });
  } catch (error) {
    console.error("Owner login route failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? `Owner login failed: ${error.message}` : "Owner login could not be completed." },
      { status: 500 },
    );
  }
}
