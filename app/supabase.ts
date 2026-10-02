import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Public Supabase project settings. The anon key is safe to use in the browser;
// database security is enforced by Supabase RLS and server-side service-role routes.
export const supabaseUrl = "https://atweyeeuipolrgyzvwab.supabase.co";
export const supabasePublicKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0d2V5ZWV1aXBvbHJneXp2d2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3NTYzNjIsImV4cCI6MjEwMzMzMjM2Mn0.Kx4U08T4z0Hn9-2PsYSbY9ant1GF226gECcCLS_c8OI";

export const supabaseConfigured = true;
export const supabase: SupabaseClient = createClient(supabaseUrl, supabasePublicKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});
