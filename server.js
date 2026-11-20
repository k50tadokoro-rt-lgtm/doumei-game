'use strict';

require('dotenv').config();

const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

app.disable('x-powered-by');
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"]
    }
  }
}));
app.use(express.json({ limit: '24kb' }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

const createLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false });
const joinLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false });
const actionLimiter = rateLimit({ windowMs: 60 * 1000, limit: 50, standardHeaders: 'draft-7', legacyHeaders: false });

function hashToken(token) {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

function newToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function cleanRoomCode(value) {
  return String(value || '').trim().toUpperCase();
}

function apiError(res, status, message) {
  return res.status(status).json({ error: message });
}

function databaseMessage(error) {
  const raw = String(error?.message || 'Database request failed.');
  // Supabase/Postgres can prefix useful validation errors with function context.
  return raw.replace(/^.*ERROR:\s*/i, '').split('\n')[0].slice(0, 220);
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'tank-turn-tactics' });
});

app.post('/api/games', createLimiter, async (req, res) => {
  try {
    const names = req.body?.names;
    const playerIndex = req.body?.playerIndex;

    if (!Array.isArray(names) || names.length !== 9) {
      return apiError(res, 400, 'Enter all nine player names.');
    }
    const normalizedNames = names.map(name => String(name ?? '').trim());
    if (normalizedNames.some(name => name.length < 1 || name.length > 32)) {
      return apiError(res, 400, 'Each player name must be between 1 and 32 characters.');
    }
    if (new Set(normalizedNames.map(name => name.toLocaleLowerCase('en'))).size !== 9) {
      return apiError(res, 400, 'Player names must be unique.');
    }
    if (playerIndex !== null && playerIndex !== undefined && (!Number.isInteger(playerIndex) || playerIndex < 0 || playerIndex > 8)) {
      return apiError(res, 400, 'Choose a valid player or select spectator mode.');
    }

    const token = playerIndex === null || playerIndex === undefined ? null : newToken();
    const { data, error } = await supabase.rpc('create_ttt_game', {
      p_names: normalizedNames,
      p_host_index: playerIndex ?? null,
      p_host_token_hash: token ? hashToken(token) : null
    });
    if (error) {
      console.error('create_ttt_game failed:', error.message);
      return apiError(res, 400, databaseMessage(error));
    }

    return res.status(201).json({
      roomCode: data.room_code,
      gameId: data.game_id,
      playerId: data.player_id,
      token
    });
  } catch (error) {
    console.error('Create game error:', error);
    return apiError(res, 500, 'Could not create the game. Please try again.');
  }
});

app.post('/api/join', joinLimiter, async (req, res) => {
  try {
    const roomCode = cleanRoomCode(req.body?.roomCode);
    const name = String(req.body?.name ?? '').trim();
    if (!/^[A-Z0-9]{6}$/.test(roomCode)) {
      return apiError(res, 400, 'Enter a valid six-character room code.');
    }
    if (name.length < 1 || name.length > 32) {
      return apiError(res, 400, 'Enter a valid player name.');
    }

    const token = newToken();
    const { data, error } = await supabase.rpc('join_ttt_game', {
      p_room_code: roomCode,
      p_name: name,
      p_token_hash: hashToken(token)
    });
    if (error) {
      console.error('join_ttt_game failed:', error.message);
      return apiError(res, 400, databaseMessage(error));
    }

    return res.status(200).json({
      roomCode,
      gameId: data.game_id,
      playerId: data.player_id,
      token
    });
  } catch (error) {
    console.error('Join game error:', error);
    return apiError(res, 500, 'Could not join the game. Please try again.');
  }
});

app.get('/api/game/:roomCode', async (req, res) => {
  try {
    const roomCode = cleanRoomCode(req.params.roomCode);
    if (!/^[A-Z0-9]{6}$/.test(roomCode)) {
      return apiError(res, 400, 'Invalid room code.');
    }

    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, room_code, status, day, winner_player_id, created_at')
      .eq('room_code', roomCode)
      .maybeSingle();

    if (gameError) throw gameError;
    if (!game) return apiError(res, 404, 'Room not found. Check the room code.');

    const [playersResult, eventsResult] = await Promise.all([
      supabase
        .from('players')
        .select('id, seat_number, name, x, y, lives, ap, attack_range, is_alive')
        .eq('game_id', game.id)
        .order('seat_number', { ascending: true }),
      supabase
        .from('game_events')
        .select('id, event_type, message, created_at')
        .eq('game_id', game.id)
        .order('id', { ascending: false })
        .limit(60)
    ]);

    if (playersResult.error) throw playersResult.error;
    if (eventsResult.error) throw eventsResult.error;

    res.set('Cache-Control', 'no-store');
    return res.json({
      game,
      players: playersResult.data || [],
      events: (eventsResult.data || []).reverse()
    });
  } catch (error) {
    console.error('Load game error:', error);
    return apiError(res, 500, 'Could not load the game. Please refresh.');
  }
});

app.post('/api/action', actionLimiter, async (req, res) => {
  try {
    const roomCode = cleanRoomCode(req.body?.roomCode);
    const playerId = String(req.body?.playerId || '');
    const token = String(req.body?.token || '');
    const action = req.body?.action;

    if (!/^[A-Z0-9]{6}$/.test(roomCode) || !/^[0-9a-f-]{36}$/i.test(playerId) || token.length < 24) {
      return apiError(res, 401, 'Your saved player session is invalid. Rejoin the match.');
    }
    if (!action || typeof action !== 'object' || Array.isArray(action)) {
      return apiError(res, 400, 'Invalid action.');
    }

    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id')
      .eq('room_code', roomCode)
      .maybeSingle();
    if (gameError) throw gameError;
    if (!game) return apiError(res, 404, 'Room not found.');

    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id, game_id, token_hash')
      .eq('id', playerId)
      .eq('game_id', game.id)
      .maybeSingle();
    if (playerError) throw playerError;
    if (!player || !crypto.timingSafeEqual(Buffer.from(player.token_hash, 'utf8'), Buffer.from(hashToken(token), 'utf8'))) {
      return apiError(res, 401, 'Your player session could not be verified. Use the same browser you joined with.');
    }

    const actionType = String(action.type || '');
    if (!['move', 'attack', 'transfer', 'extend'].includes(actionType)) {
      return apiError(res, 400, 'Unknown action.');
    }
    const x = actionType === 'move' ? Number(action.x) : null;
    const y = actionType === 'move' ? Number(action.y) : null;
    const targetId = ['attack', 'transfer'].includes(actionType) ? String(action.targetId || '') : null;
    if (actionType === 'move' && (!Number.isInteger(x) || !Number.isInteger(y))) {
      return apiError(res, 400, 'Choose a valid map square.');
    }
    if (targetId !== null && !/^[0-9a-f-]{36}$/i.test(targetId)) {
      return apiError(res, 400, 'Choose a valid target.');
    }

    const { data, error } = await supabase.rpc('apply_ttt_action', {
      p_game_id: game.id,
      p_player_id: player.id,
      p_action_type: actionType,
      p_x: x,
      p_y: y,
      p_target_id: targetId
    });
    if (error) {
      return apiError(res, 400, databaseMessage(error));
    }
    return res.json(data || { ok: true });
  } catch (error) {
    console.error('Action error:', error);
    return apiError(res, 500, 'Could not complete that action. Please try again.');
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Tank Turn Tactics listening on port ${PORT}`);
});
