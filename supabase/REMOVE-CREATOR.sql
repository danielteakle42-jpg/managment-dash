create table public.removed_creator_usernames (username text primary key);
alter table public.removed_creator_usernames enable row level security;
revoke all on public.removed_creator_usernames from public, anon, authenticated;

create function public.skip_removed_creator() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.removed_creator_usernames where username = lower(ltrim(trim(new.username), '@'))) then
    return null;
  end if;
  return new;
end;
$$;
create trigger skip_removed_creator before insert or update on public.creator_metrics
for each row execute function public.skip_removed_creator();

create function public.remove_creator_account(target_username text) returns void
language plpgsql security definer set search_path = '' as $$
declare target text := lower(ltrim(trim(target_username), '@'));
begin
  if public.is_admin() is not true then raise exception 'Admin access required'; end if;
  lock table public.creator_metrics in share row exclusive mode;
  insert into public.removed_creator_usernames values (target) on conflict do nothing;
  delete from public.creator_metrics where username = target;
end;
$$;
revoke all on function public.remove_creator_account(text) from public, anon;
grant execute on function public.remove_creator_account(text) to authenticated;

insert into public.removed_creator_usernames select username from public.creator_metrics where leaderboard_hidden;
delete from public.creator_metrics where leaderboard_hidden;
