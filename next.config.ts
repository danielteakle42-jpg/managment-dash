import type { NextConfig } from "next";

// Accept either the V30 NEXT_PUBLIC names or the common Supabase/Vercel names.
// This prevents a configured project from showing as disconnected just because
// the variables were saved under SUPABASE_URL / SUPABASE_ANON_KEY.
const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL || "https://atweyeeuipolrgyzvwab.supabase.co";
const publicAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0d2V5ZWV1aXBvbHJneXp2d2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3NTYzNjIsImV4cCI6MjEwMzMzMjM2Mn0.Kx4U08T4z0Hn9-2PsYSbY9ant1GF226gECcCLS_c8OI";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: publicUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: publicAnon,
  },
};

export default nextConfig;
