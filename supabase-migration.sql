-- Tank Turn Tactics: persistent multiplayer backend migration
-- Run this AFTER tank-turn-tactics-setup.sql in Supabase SQL Editor.
-- The Render server calls these functions using the secret service_role key.

alter table public.games
  add column if not exists day integer not null default 1 check (day >= 1);

-- Create a game with nine reserved player seats. A player selected by the creator
-- is claimed immediately; the other seats can be claimed once by entering the
-- matching room code and exact player name.
create or replace function public.create_ttt_game(
  p_names text[],
  p_host_index integer,
  p_host_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_game_id uuid;
  v_room_code text;
  v_player_id uuid := null;
  v_sentinel text := encode(digest('TTT_UNCLAIMED_PLAYER_SEAT', 'sha256'), 'hex');
  v_x integer[] := array[1,7,13,1,7,13,1,7,13];
  v_y integer[] := array[1,1,1,7,7,7,13,13,13];
  v_i integer;
  v_name text;
begin
  if p_names is null or array_length(p_names, 1) <> 9 then
    raise exception 'Exactly nine player names are required.';
  end if;
  if p_host_index is not null and (p_host_index < 0 or p_host_index > 8) then
    raise exception 'Invalid host player selection.';
  end if;
  if p_host_index is not null and (p_host_token_hash is null or length(p_host_token_hash) < 32) then
    raise exception 'Host player token is missing.';
  end if;

  for v_i in 1..9 loop
    v_name := trim(p_names[v_i]);
    if v_name is null or char_length(v_name) < 1 or char_length(v_name) > 32 then
      raise exception 'Each player name must be between 1 and 32 characters.';
    end if;
  end loop;

  if (select count(distinct lower(trim(n))) from unnest(p_names) as u(n)) <> 9 then
    raise exception 'Player names must be unique.';
  end if;

  -- Use a 6-character code from an unambiguous alphabet.
  v_room_code := array_to_string(
    array(
      select substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
                    (get_byte(gen_random_bytes(1), 0) % 32) + 1, 1)
      from generate_series(1, 6)
    ),
    ''
  );

  insert into public.games (room_code, status, day)
  values (v_room_code, 'active', 1)
  returning id into v_game_id;

  for v_i in 1..9 loop
    insert into public.players (
      game_id, seat_number, name, x, y, lives, ap, attack_range,
      is_alive, token_hash
    ) values (
      v_game_id, v_i, trim(p_names[v_i]), v_x[v_i], v_y[v_i], 3, 1, 2,
      true,
      case when p_host_index = v_i - 1 then p_host_token_hash else v_sentinel end
    )
    returning id into v_player_id;

    if p_host_index = v_i - 1 then
      -- v_player_id is the creator's seat id.
      null;
    end if;
  end loop;

  if p_host_index is not null then
    select id into v_player_id
    from public.players
    where game_id = v_game_id and seat_number = p_host_index + 1;
  else
    v_player_id := null;
  end if;

  insert into public.game_events (game_id, actor_player_id, event_type, message, details)
  values (
    v_game_id,
    v_player_id,
    'game_created',
    'The match began. All nine countries start with 3 lives, 1 AP and range 2.',
    jsonb_build_object('timezone', 'Asia/Tokyo', 'daily_ap_time', '20:00')
  );

  return jsonb_build_object(
    'game_id', v_game_id,
    'room_code', v_room_code,
    'player_id', v_player_id
  );
end;
$$;

-- Claim a reserved seat. The game and player rows are locked so two friends
-- cannot claim the same seat simultaneously.
create or replace function public.join_ttt_game(
  p_room_code text,
  p_name text,
  p_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_game public.games%rowtype;
  v_player public.players%rowtype;
  v_sentinel text := encode(digest('TTT_UNCLAIMED_PLAYER_SEAT', 'sha256'), 'hex');
begin
  if p_room_code is null or p_room_code !~ '^[A-Z0-9]{6}$' then
    raise exception 'Enter a valid six-character room code.';
  end if;
  if p_name is null or char_length(trim(p_name)) < 1 or char_length(trim(p_name)) > 32 then
    raise exception 'Enter a valid player name.';
  end if;
  if p_token_hash is null or length(p_token_hash) < 32 then
    raise exception 'Player token is missing.';
  end if;

  select * into v_game
  from public.games
  where room_code = upper(trim(p_room_code))
  for update;

  if not found then
    raise exception 'Room not found. Check the room code.';
  end if;
  if v_game.status <> 'active' then
    raise exception 'This match is no longer accepting players.';
  end if;

  select * into v_player
  from public.players
  where game_id = v_game.id
    and lower(name) = lower(trim(p_name))
    and token_hash = v_sentinel
  for update;

  if not found then
    if exists (
      select 1 from public.players
      where game_id = v_game.id and lower(name) = lower(trim(p_name))
    ) then
      raise exception 'That player seat has already been claimed.';
    end if;
    raise exception 'That name is not in this game. Check the spelling.';
  end if;

  update public.players set token_hash = p_token_hash where id = v_player.id;
  insert into public.game_events (game_id, actor_player_id, event_type, message)
  values (v_game.id, v_player.id, 'player_joined', v_player.name || ' joined the match.');

  return jsonb_build_object('game_id', v_game.id, 'player_id', v_player.id);
end;
$$;

-- Validate and apply an action atomically. Distances use Chebyshev distance,
-- so range 2 includes horizontal, vertical and diagonal squares up to 2 away.
create or replace function public.apply_ttt_action(
  p_game_id uuid,
  p_player_id uuid,
  p_action_type text,
  p_x integer default null,
  p_y integer default null,
  p_target_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_game public.games%rowtype;
  v_player public.players%rowtype;
  v_target public.players%rowtype;
  v_survivors integer;
  v_winner_id uuid;
  v_winner_name text;
  v_message text;
begin
  select * into v_game
  from public.games
  where id = p_game_id
  for update;

  if not found or v_game.status <> 'active' then
    raise exception 'The match is not active.';
  end if;

  select * into v_player
  from public.players
  where id = p_player_id and game_id = p_game_id
  for update;

  if not found or not v_player.is_alive then
    raise exception 'Your player is no longer active in this match.';
  end if;
  if v_player.ap < 1 then
    raise exception 'You need at least 1 AP to do that.';
  end if;

  if p_action_type = 'move' then
    if p_x is null or p_y is null or p_x < 0 or p_x > 14 or p_y < 0 or p_y > 14 then
      raise exception 'That square is outside the map.';
    end if;
    if abs(v_player.x - p_x) + abs(v_player.y - p_y) <> 1 then
      raise exception 'You can only move one square orthogonally.';
    end if;
    if exists (
      select 1 from public.players
      where game_id = p_game_id and is_alive = true
        and id <> p_player_id and x = p_x and y = p_y
    ) then
      raise exception 'That square is occupied.';
    end if;

    update public.players set x = p_x, y = p_y, ap = ap - 1 where id = p_player_id;
    v_message := v_player.name || ' moved to ' || chr(65 + p_x) || (p_y + 1)::text || '.';
    insert into public.game_events (game_id, actor_player_id, event_type, message)
    values (p_game_id, p_player_id, 'move', v_message);

  elsif p_action_type in ('attack', 'transfer') then
    select * into v_target
    from public.players
    where id = p_target_id and game_id = p_game_id
    for update;

    if not found or not v_target.is_alive or v_target.id = p_player_id then
      raise exception 'Choose another living player.';
    end if;
    if greatest(abs(v_player.x - v_target.x), abs(v_player.y - v_target.y)) > v_player.attack_range then
      raise exception '% is outside your range (%).', v_target.name, v_player.attack_range;
    end if;

    update public.players set ap = ap - 1 where id = p_player_id;
    if p_action_type = 'attack' then
      update public.players
      set lives = greatest(lives - 1, 0),
          is_alive = case when lives - 1 <= 0 then false else true end
      where id = p_target_id
      returning * into v_target;

      if not v_target.is_alive then
        v_message := v_player.name || ' hit ' || v_target.name || '. ' || v_target.name || ' was eliminated.';
        insert into public.game_events (game_id, actor_player_id, event_type, message)
        values (p_game_id, p_player_id, 'eliminated', v_message);
      else
        v_message := v_player.name || ' hit ' || v_target.name || '. ' || v_target.name || ' has ' || v_target.lives || ' lives left.';
        insert into public.game_events (game_id, actor_player_id, event_type, message)
        values (p_game_id, p_player_id, 'attack', v_message);
      end if;
    else
      update public.players set ap = ap + 1 where id = p_target_id;
      v_message := v_player.name || ' transferred 1 AP to ' || v_target.name || '.';
      insert into public.game_events (game_id, actor_player_id, event_type, message)
      values (p_game_id, p_player_id, 'transfer', v_message);
    end if;

  elsif p_action_type = 'extend' then
    if v_player.attack_range >= 14 then
      raise exception 'Your range is already at the map maximum.';
    end if;
    update public.players
    set ap = ap - 1, attack_range = attack_range + 1
    where id = p_player_id;
    v_message := v_player.name || ' extended range to ' || (v_player.attack_range + 1) || '.';
    insert into public.game_events (game_id, actor_player_id, event_type, message)
    values (p_game_id, p_player_id, 'extend', v_message);

  else
    raise exception 'Unknown action.';
  end if;

  select count(*) into v_survivors
  from public.players
  where game_id = p_game_id and is_alive = true;

  if v_survivors = 1 then
    select id, name into v_winner_id, v_winner_name
    from public.players
    where game_id = p_game_id and is_alive = true
    limit 1;
    update public.games
    set winner_player_id = v_winner_id, status = 'finished'
    where id = p_game_id;
    insert into public.game_events (game_id, actor_player_id, event_type, message)
    values (p_game_id, v_winner_id, 'game_won', v_winner_name || ' is the last country standing and wins the match!');
  end if;

  return jsonb_build_object('ok', true, 'game_finished', v_survivors = 1);
end;
$$;

-- Award one AP at 20:00 Asia/Tokyo. This runs in Supabase, not the Render
-- website process, so it continues when every player is offline and Render sleeps.
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
  if v_now_jst::time < time '20:00' then
    return;
  end if;

  v_cutoff_jst := date_trunc('day', v_now_jst) + time '20:00';
  v_cutoff := v_cutoff_jst at time zone 'Asia/Tokyo';

  for v_game in
    select id
    from public.games
    where status = 'active' and last_ap_grant_at < v_cutoff
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
    set last_ap_grant_at = v_cutoff, day = day + 1
    where id = v_game.id;
  end loop;
end;
$$;

-- The existing cron job already points to public.grant_daily_ap_jst();
-- Replacing the function above updates its behavior without creating a second job.

-- Keep these functions server-only. Never put the service_role key in browser code.
revoke all on function public.create_ttt_game(text[], integer, text) from public, anon, authenticated;
revoke all on function public.join_ttt_game(text, text, text) from public, anon, authenticated;
revoke all on function public.apply_ttt_action(uuid, uuid, text, integer, integer, uuid) from public, anon, authenticated;
revoke all on function public.grant_daily_ap_jst() from public, anon, authenticated;

grant execute on function public.create_ttt_game(text[], integer, text) to service_role;
grant execute on function public.join_ttt_game(text, text, text) to service_role;
grant execute on function public.apply_ttt_action(uuid, uuid, text, integer, integer, uuid) to service_role;
grant execute on function public.grant_daily_ap_jst() to service_role;

-- Verification: should return the existing single job (your current jobid should remain 1)
-- with schedule 0 11 * * *.
select jobid, jobname, schedule, command
from cron.job
where jobname = 'tank-turn-tactics-daily-ap';
