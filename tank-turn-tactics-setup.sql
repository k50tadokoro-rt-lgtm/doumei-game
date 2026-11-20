-- Tank Turn Tactics: Supabase database setup
-- Run this ONCE in Supabase Dashboard > SQL Editor > New query.
-- The game API will connect using a server-side key/connection, not from the browser.

create extension if not exists pgcrypto;
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique check (room_code ~ '^[A-Z0-9]{6}$'),
  status text not null default 'active'
    check (status in ('waiting', 'active', 'finished')),
  created_at timestamptz not null default now(),
  -- On game creation this defaults to now(). The daily job awards AP at 20:00 JST
  -- only if this timestamp is earlier than today's 20:00 JST cutoff.
  last_ap_grant_at timestamptz not null default now(),
  winner_player_id uuid
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  seat_number smallint not null check (seat_number between 1 and 9),
  name text not null check (char_length(trim(name)) between 1 and 32),
  x smallint not null check (x between 0 and 14),
  y smallint not null check (y between 0 and 14),
  lives smallint not null default 3 check (lives between 0 and 3),
  ap integer not null default 1 check (ap >= 0),
  attack_range smallint not null default 2 check (attack_range between 2 and 14),
  is_alive boolean not null default true,
  -- Store only a hash of the per-player join token here. Never send this column to browsers.
  token_hash text not null,
  created_at timestamptz not null default now(),
  unique (game_id, seat_number)
);

create unique index if not exists players_game_name_lower_idx
  on public.players (game_id, lower(name));

create table if not exists public.game_events (
  id bigint generated always as identity primary key,
  game_id uuid not null references public.games(id) on delete cascade,
  actor_player_id uuid references public.players(id) on delete set null,
  event_type text not null,
  message text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists players_game_id_idx on public.players(game_id);
create index if not exists game_events_game_id_id_idx on public.game_events(game_id, id desc);

-- The winner is a player in the same game. This is checked by the game API when setting it.
alter table public.games
  drop constraint if exists games_winner_player_id_fkey;
alter table public.games
  add constraint games_winner_player_id_fkey
  foreign key (winner_player_id) references public.players(id) on delete set null;

-- No direct browser access. The Render backend will be the only component using privileged access.
alter table public.games enable row level security;
alter table public.players enable row level security;
alter table public.game_events enable row level security;

revoke all on table public.games, public.players, public.game_events from anon, authenticated;
grant all on table public.games, public.players, public.game_events to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Award +1 AP to every living player in each active game, once per Japan calendar day,
-- at/after 20:00 Japan time. This function is called by pg_cron at 11:00 UTC.
create or replace function public.grant_daily_ap_jst()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now_jst timestamp without time zone;
  v_cutoff_jst timestamp without time zone;
  v_cutoff timestamptz;
  v_game record;
begin
  v_now_jst := now() at time zone 'Asia/Tokyo';

  -- A manual/early invocation must not distribute AP before 20:00 JST.
  if v_now_jst::time < time '20:00' then
    return;
  end if;

  v_cutoff_jst := date_trunc('day', v_now_jst) + time '20:00';
  v_cutoff := v_cutoff_jst at time zone 'Asia/Tokyo';

  for v_game in
    select id
    from public.games
    where status = 'active'
      and last_ap_grant_at < v_cutoff
    for update
  loop
    update public.players
      set ap = ap + 1
      where game_id = v_game.id and is_alive = true;

    insert into public.game_events (game_id, event_type, message, details)
      values (
        v_game.id,
        'daily_ap',
        'Daily AP granted: every living player received 1 AP.',
        jsonb_build_object('scheduled_for', v_cutoff, 'timezone', 'Asia/Tokyo')
      );

    update public.games
      set last_ap_grant_at = v_cutoff
      where id = v_game.id;
  end loop;
end;
$$;

revoke all on function public.grant_daily_ap_jst() from public, anon, authenticated;

-- Ensure there is exactly one scheduled job with this name, then create it.
do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id
  from cron.job
  where jobname = 'tank-turn-tactics-daily-ap'
  limit 1;

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'tank-turn-tactics-daily-ap',
    '0 11 * * *',
    'select public.grant_daily_ap_jst();'
  );
end;
$$;

-- Quick verification: this should show the scheduled job at 11:00 UTC every day.
select jobid, jobname, schedule, command
from cron.job
where jobname = 'tank-turn-tactics-daily-ap';
