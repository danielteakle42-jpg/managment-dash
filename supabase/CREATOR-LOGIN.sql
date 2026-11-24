create table public.creator_login_settings (
  singleton boolean primary key default true check (singleton),
  password_hash text not null
);
alter table public.creator_login_settings enable row level security;
revoke all on public.creator_login_settings from public, anon, authenticated;
create function public.verify_creator_login(login_username text, login_password text)
returns boolean language sql stable set search_path = '' as $$
  select exists (select 1 from public.creator_login_settings s
    where s.password_hash = extensions.crypt(lower(login_password), s.password_hash))
    and exists (select 1 from public.creator_metrics c where c.username = login_username);
$$;
revoke all on function public.verify_creator_login(text,text) from public, anon, authenticated;
grant execute on function public.verify_creator_login(text,text) to service_role;
grant select on public.creator_login_settings to service_role;
