// Types and small helpers shared between the main dashboard (page.tsx) and
// the Arranged Battles feature (arranged-battles.tsx). Pulled into their own
// module so neither file has to import the other directly.

export type Role = "creator" | "manager" | "admin";

export type CreatorMetric = {
  id?: number;
  username: string;
  data_period: string;
  creator_id?: string;
  group_name?: string;
  manager?: string;
  diamonds: number;
  live_minutes: number;
  live_duration: string;
  valid_live_days: number;
  live_streams?: number;
  matches?: number;
  avatar_url?: string;
  updated_at?: string;
};

export type Profile = {
  id?: string;
  username: string;
  display_name?: string;
  role: Role;
  manager_group?: string;
};

export function cleanUsername(username: string) {
  return username.trim().replace(/^@/, "").toLowerCase();
}

export function avatarFor(record: Pick<CreatorMetric, "username" | "avatar_url">) {
  return record.avatar_url?.trim() || `https://unavatar.io/tiktok/${encodeURIComponent(cleanUsername(record.username))}`;
}
