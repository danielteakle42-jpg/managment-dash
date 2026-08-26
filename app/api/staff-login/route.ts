import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const runtime='nodejs';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const entered=String(password||'');
    if (!entered) return NextResponse.json({error:'Enter your manager access password.'},{status:400});
    const url=(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL || "https://atweyeeuipolrgyzvwab.supabase.co")!;
    const anon=(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0d2V5ZWV1aXBvbHJneXp2d2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3NTYzNjIsImV4cCI6MjEwMzMzMjM2Mn0.Kx4U08T4z0Hn9-2PsYSbY9ant1GF226gECcCLS_c8OI")!;
    const service=process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if(!url||!anon||!service) return NextResponse.json({error:'Supabase staff login is not configured.'},{status:503});

    // Manager passwords remain in Supabase Auth. We never copy them into creator_metrics or profiles.
    const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    const {data:profiles,error:profileError}=await admin.from('profiles').select('*').eq('role','manager');
    if(profileError) throw profileError;
    const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});

    // Each manager has a private Supabase Auth account. Try the entered password only against manager accounts.
    for(const profile of profiles||[]){
      const username=String(profile.username||'').trim().toLowerCase().replace(/^@/,'');
      if(!username) continue;
      const {data,error}=await auth.auth.signInWithPassword({email:`${username}@manager.platinumpulse.app`,password:entered});
      if(!error&&data.session&&data.user){
        return NextResponse.json({access_token:data.session.access_token,refresh_token:data.session.refresh_token,profile});
      }
    }
    return NextResponse.json({error:'No manager account matched that access password.'},{status:401});
  } catch(e) {
    return NextResponse.json({error:e instanceof Error?e.message:'Manager login failed.'},{status:500});
  }
}
