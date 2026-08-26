-- Safe removal of the retired Agency Chat feature.
-- This does not touch creator metrics, daily data, arranged battles, profiles, or snapshots.

begin;

do $$
begin
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'agency_chat_messages'
  ) then
    alter publication supabase_realtime drop table public.agency_chat_messages;
  end if;
end $$;

drop table if exists public.agency_chat_messages cascade;

commit;
