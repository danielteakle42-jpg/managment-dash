import { createClient } from '@supabase/supabase-js';

export function serverClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL || "https://atweyeeuipolrgyzvwab.supabase.co")?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error('Server Supabase configuration is incomplete.');
  return createClient(url, key, { auth: { persistSession:false, autoRefreshToken:false, detectSessionInUrl:false } });
}
export async function staffFromRequest(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i,'').trim();
  if (!token) return null;
  const db = serverClient();
  const { data } = await db.auth.getUser(token);
  if (!data.user) return null;
  const { data: profile } = await db.from('profiles').select('*').eq('id', data.user.id).single();
  if (!profile || !['admin','manager'].includes(profile.role)) return null;
  return profile as { id:string; username:string; display_name?:string; role:'admin'|'manager' };
}
