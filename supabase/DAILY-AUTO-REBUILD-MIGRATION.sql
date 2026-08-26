-- Platinum Pulse x VOID Creator Hub
-- ONE-TIME, NON-DESTRUCTIVE migration for automatic daily breakdowns.
-- Safe to run on an existing database. It does not delete creator totals,
-- snapshots, arranged battles, profiles, or any other app data.
--
-- After this is installed, every admin import can call this function and the
-- database rebuilds daily metrics from ALL saved cumulative snapshots.
-- It is date-agnostic: no August 2026, month, or year is hard-coded.

begin;

create or replace function public.rebuild_creator_daily_metrics()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rebuilt_rows integer := 0;
begin
  -- Browser/app calls must come from the agency admin. Running this manually as
  -- the database owner from the SQL editor is also allowed (auth.uid() is null).
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Only an agency admin can rebuild creator daily metrics';
  end if;

  create temporary table _rebuilt_creator_daily (
    username text not null,
    metric_date date not null,
    diamonds bigint not null,
    live_minutes integer not null,
    live_duration text not null,
    valid_live_days integer not null,
    primary key (username, metric_date)
  ) on commit drop;

  -- Rebuild each creator independently for each cumulative period start.
  -- A daily value is only calculated when:
  --   1) the snapshot itself is a one-day period, OR
  --   2) yesterday's cumulative snapshot exists for the SAME period_start.
  -- Therefore a missing export is never incorrectly dumped into one day.
  insert into _rebuilt_creator_daily (username, metric_date, diamonds, live_minutes, live_duration, valid_live_days)
  with ordered as (
    select
      lower(trim(leading '@' from trim(s.username))) as username,
      s.period_start,
      s.period_end,
      greatest(0, coalesce(s.diamonds, 0))::bigint as diamonds,
      greatest(0, coalesce(s.live_minutes, 0))::integer as live_minutes,
      greatest(0, coalesce(s.valid_live_days, 0))::integer as valid_live_days,
      lag(s.period_end) over (
        partition by lower(trim(leading '@' from trim(s.username))), s.period_start
        order by s.period_end
      ) as previous_end,
      lag(greatest(0, coalesce(s.diamonds, 0))) over (
        partition by lower(trim(leading '@' from trim(s.username))), s.period_start
        order by s.period_end
      ) as previous_diamonds,
      lag(greatest(0, coalesce(s.live_minutes, 0))) over (
        partition by lower(trim(leading '@' from trim(s.username))), s.period_start
        order by s.period_end
      ) as previous_live_minutes,
      lag(greatest(0, coalesce(s.valid_live_days, 0))) over (
        partition by lower(trim(leading '@' from trim(s.username))), s.period_start
        order by s.period_end
      ) as previous_valid_live_days
    from public.creator_metric_snapshots s
  ),
  calculated as (
    select
      username,
      period_start,
      period_end as metric_date,
      case
        when period_start = period_end then diamonds
        when previous_end = (period_end - 1) then greatest(0, diamonds - coalesce(previous_diamonds, 0))
        else null
      end::bigint as daily_diamonds,
      case
        when period_start = period_end then live_minutes
        when previous_end = (period_end - 1) then greatest(0, live_minutes - coalesce(previous_live_minutes, 0))
        else null
      end::integer as daily_live_minutes,
      case
        when period_start = period_end then valid_live_days
        when previous_end = (period_end - 1) then greatest(0, valid_live_days - coalesce(previous_valid_live_days, 0))
        else null
      end::integer as daily_valid_live_days
    from ordered
  ),
  deduped as (
    select distinct on (username, metric_date)
      username,
      metric_date,
      daily_diamonds,
      daily_live_minutes,
      daily_valid_live_days
    from calculated
    where daily_diamonds is not null and daily_live_minutes is not null and daily_valid_live_days is not null
    order by username, metric_date, period_start desc
  )
  select
    username,
    metric_date,
    daily_diamonds,
    daily_live_minutes,
    case
      when daily_live_minutes >= 60 then
        (daily_live_minutes / 60)::text || 'h ' || (daily_live_minutes % 60)::text || 'm'
      else daily_live_minutes::text || 'm'
    end,
    daily_valid_live_days
  from deduped;

  -- Remove only daily rows covered by saved snapshot ranges. This clears stale
  -- calculations from previous importer versions while leaving unrelated data alone.
  delete from public.creator_daily_metrics d
  using (
    select
      lower(trim(leading '@' from trim(username))) as username,
      period_start,
      max(period_end) as period_end
    from public.creator_metric_snapshots
    group by lower(trim(leading '@' from trim(username))), period_start
  ) r
  where lower(trim(leading '@' from trim(d.username))) = r.username
    and d.metric_date between r.period_start and r.period_end;

  insert into public.creator_daily_metrics (username, metric_date, diamonds, live_minutes, live_duration, valid_live_days)
  select username, metric_date, diamonds, live_minutes, live_duration, valid_live_days
  from _rebuilt_creator_daily
  on conflict (username, metric_date) do update set
    diamonds = excluded.diamonds,
    live_minutes = excluded.live_minutes,
    live_duration = excluded.live_duration,
    valid_live_days = excluded.valid_live_days,
    updated_at = now();

  get diagnostics rebuilt_rows = row_count;
  return rebuilt_rows;
end;
$$;

revoke all on function public.rebuild_creator_daily_metrics() from public;
grant execute on function public.rebuild_creator_daily_metrics() to authenticated;

commit;

-- Optional check after running:
-- select public.rebuild_creator_daily_metrics();
