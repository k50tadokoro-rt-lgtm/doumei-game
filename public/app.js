'use strict';

(() => {
  const DEFAULT_NAMES = ['Japan', 'Canada', 'Brazil', 'France', 'Egypt', 'India', 'Australia', 'Mexico', 'Sweden'];
  const COLORS = ['#83c7d8', '#e8bf73', '#a4d18a', '#d99aa5', '#b3a0e6', '#e5a56f', '#8ec5ad', '#d5b4dd', '#c5c9d2'];
  const SESSION_KEY = 'tankTurnTacticsSessionV1';
  const $ = id => document.getElementById(id);

  const home = $('home');
  const game = $('game');
  const rosterInputs = $('rosterInputs');
  let session = null;
  let gameData = null;
  let selectedAction = null;
  let pollHandle = null;
  let polling = false;

  function escapeText(value) {
    return String(value ?? '');
  }

  function initials(name) {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    return (parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] || '?').slice(0, 2)).toUpperCase();
  }

  function setStatus(id, message, isError = false) {
    const element = $(id);
    element.textContent = message;
    element.classList.toggle('error', isError);
  }

  function showNotice(message, isError = false) {
    setStatus('gameNotice', message, isError);
    window.clearTimeout(showNotice.timer);
    showNotice.timer = window.setTimeout(() => setStatus('gameNotice', ''), 5500);
  }

  async function requestJSON(url, options = {}) {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    let body;
    try { body = await response.json(); }
    catch { body = {}; }
    if (!response.ok) throw new Error(body.error || `Request failed (${response.status}).`);
    return body;
  }

  function showGameView() {
    home.classList.add('hidden');
    game.classList.remove('hidden');
  }

  function showHomeView() {
    stopPolling();
    game.classList.add('hidden');
    home.classList.remove('hidden');
  }

  function saveSession(value) {
    session = value;
    localStorage.setItem(SESSION_KEY, JSON.stringify(value));
  }

  function loadSavedSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !/^[A-Z0-9]{6}$/.test(parsed.roomCode || '')) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function stopPolling() {
    if (pollHandle) window.clearInterval(pollHandle);
    pollHandle = null;
    polling = false;
  }

  function startPolling() {
    stopPolling();
    pollHandle = window.setInterval(() => refreshGame(true), 7000);
  }

  function buildRosterInputs() {
    rosterInputs.innerHTML = '';
    DEFAULT_NAMES.forEach((name, index) => {
      const input = document.createElement('input');
      input.value = name;
      input.maxLength = 32;
      input.className = 'country-name';
      input.setAttribute('aria-label', `Player ${index + 1} name`);
      input.addEventListener('input', refreshHostSelect);
      rosterInputs.appendChild(input);
    });
    refreshHostSelect();
  }

  function refreshHostSelect() {
    const select = $('hostPlayer');
    const previous = select.value;
    const names = [...document.querySelectorAll('.country-name')].map(input => input.value.trim() || 'Player');
    select.innerHTML = '<option value="">Spectate (do not play)</option>';
    names.forEach((name, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = name;
      select.appendChild(option);
    });
    if ([...select.options].some(option => option.value === previous)) select.value = previous;
  }

  async function createRoom() {
    const button = $('createRoom');
    const names = [...document.querySelectorAll('.country-name')].map(input => input.value.trim());
    const playerIndex = $('hostPlayer').value === '' ? null : Number($('hostPlayer').value);

    if (names.some(name => !name || name.length > 32)) {
      setStatus('hostStatus', 'Please enter all nine names (up to 32 characters each).', true);
      return;
    }
    if (new Set(names.map(name => name.toLocaleLowerCase('en'))).size !== 9) {
      setStatus('hostStatus', 'Each player name must be unique.', true);
      return;
    }

    button.disabled = true;
    setStatus('hostStatus', 'Creating your game…');
    try {
      const result = await requestJSON('/api/games', {
        method: 'POST',
        body: JSON.stringify({ names, playerIndex })
      });
      const newSession = {
        roomCode: result.roomCode,
        playerId: result.playerId,
        token: result.token,
        name: playerIndex === null ? null : names[playerIndex]
      };
      saveSession(newSession);
      selectedAction = null;
      await refreshGame(false, true);
      setStatus('hostStatus', 'Game created. Share the room code with your friends.');
    } catch (error) {
      setStatus('hostStatus', error.message || 'Could not create the game.', true);
    } finally {
      button.disabled = false;
    }
  }

  async function joinRoom() {
    const button = $('joinRoom');
    const roomCode = $('roomCodeInput').value.trim().toUpperCase();
    const name = $('joinName').value.trim();
    if (!/^[A-Z0-9]{6}$/.test(roomCode)) {
      setStatus('joinStatus', 'Enter the six-character room code.', true);
      return;
    }
    if (!name) {
      setStatus('joinStatus', 'Enter your assigned player name.', true);
      return;
    }

    button.disabled = true;
    setStatus('joinStatus', 'Joining game…');
    try {
      const result = await requestJSON('/api/join', {
        method: 'POST',
        body: JSON.stringify({ roomCode, name })
      });
      saveSession({ roomCode: result.roomCode, playerId: result.playerId, token: result.token, name });
      selectedAction = null;
      await refreshGame(false, true);
      setStatus('joinStatus', 'You joined the match.');
    } catch (error) {
      setStatus('joinStatus', error.message || 'Could not join the game.', true);
    } finally {
      button.disabled = false;
    }
  }

  async function reconnectSavedSession() {
    const saved = loadSavedSession();
    if (!saved) return;
    session = saved;
    setStatus('hostStatus', 'Reconnecting to your saved game…');
    try {
      await refreshGame(false, true);
      setStatus('hostStatus', 'Reconnected to your saved game.');
    } catch (error) {
      setStatus('hostStatus', `Could not reconnect: ${error.message}. Check your connection and reload.`, true);
    }
  }

  async function refreshGame(silent = false, enterGame = false) {
    if (!session?.roomCode || polling) return;
    polling = true;
    try {
      const data = await requestJSON(`/api/game/${encodeURIComponent(session.roomCode)}`);
      gameData = data;
      renderGame();
      if (enterGame || !game.classList.contains('hidden')) showGameView();
      $('pollStatus').textContent = `Saved online · Last refreshed ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' })} JST`;
      if (enterGame || !pollHandle) startPolling();
    } catch (error) {
      if (!silent) showNotice(error.message || 'Could not load the game.', true);
      $('pollStatus').textContent = `Connection issue: ${error.message || 'Could not refresh game data.'}`;
      if (enterGame) throw error;
    } finally {
      polling = false;
    }
  }

  function myPlayer() {
    if (!gameData || !session?.playerId) return null;
    return gameData.players.find(player => player.id === session.playerId) || null;
  }

  function alivePlayers() {
    return (gameData?.players || []).filter(player => player.is_alive);
  }

  function rangeDistance(a, b) {
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  }

  function boardCellIsTarget(x, y, occupant) {
    const player = myPlayer();
    if (!player || !player.is_alive || player.ap < 1) return false;
    if (selectedAction === 'move') {
      return !occupant && Math.abs(player.x - x) + Math.abs(player.y - y) === 1;
    }
    if (selectedAction === 'attack' || selectedAction === 'transfer') {
      return !!occupant && occupant.is_alive && occupant.id !== player.id && rangeDistance(player, occupant) <= player.attack_range;
    }
    return false;
  }

  function renderBoard() {
    const board = $('board');
    board.innerHTML = '';
    const playersByPosition = new Map();
    for (const player of gameData.players) {
      if (player.is_alive) playersByPosition.set(`${player.x},${player.y}`, player);
    }

    for (let y = 0; y < 15; y++) {
      for (let x = 0; x < 15; x++) {
        const occupant = playersByPosition.get(`${x},${y}`) || null;
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'cell';
        cell.setAttribute('role', 'gridcell');
        const coord = `${String.fromCharCode(65 + x)}${y + 1}`;
        cell.setAttribute('aria-label', occupant ? `${occupant.name} at ${coord}` : `Empty square ${coord}`);
        if (boardCellIsTarget(x, y, occupant)) cell.classList.add('target');

        if (occupant) {
          const token = document.createElement('span');
          token.className = 'token';
          token.classList.add(`seat-${((occupant.seat_number - 1) % COLORS.length) + 1}`);
          token.textContent = initials(occupant.name);
          cell.appendChild(token);
        } else {
          const label = document.createElement('span');
          label.className = 'coord';
          if (x === 0 || y === 0) label.textContent = coord;
          cell.appendChild(label);
        }
        cell.addEventListener('click', () => handleBoardClick(x, y, occupant));
        board.appendChild(cell);
      }
    }
  }

  async function handleBoardClick(x, y, occupant) {
    if (!selectedAction) return;
    if (selectedAction === 'move') {
      await sendAction({ type: 'move', x, y });
      return;
    }
    if (selectedAction === 'attack' || selectedAction === 'transfer') {
      if (!occupant) {
        showNotice('Select a player token on the map.', true);
        return;
      }
      await sendAction({ type: selectedAction, targetId: occupant.id });
    }
  }

  async function sendAction(action) {
    const player = myPlayer();
    if (!player || !session?.token || !session?.playerId) {
      showNotice('You are spectating. Choose a player seat to take actions.', true);
      return;
    }
    try {
      await requestJSON('/api/action', {
        method: 'POST',
        body: JSON.stringify({
          roomCode: session.roomCode,
          playerId: session.playerId,
          token: session.token,
          action
        })
      });
      selectedAction = null;
      showNotice('Action completed.');
      await refreshGame(true);
    } catch (error) {
      showNotice(error.message || 'That action could not be completed.', true);
      await refreshGame(true);
    }
  }

  function renderPlayers() {
    const list = $('playersList');
    list.innerHTML = '';
    for (const player of gameData.players) {
      const row = document.createElement('div');
      row.className = `player-row${player.is_alive ? '' : ' eliminated'}`;
      const swatch = document.createElement('span');
      swatch.className = 'swatch';
      swatch.classList.add(`seat-${((player.seat_number - 1) % COLORS.length) + 1}`);
      swatch.textContent = initials(player.name);
      const name = document.createElement('span');
      name.className = 'pname';
      name.textContent = player.name;
      const meta = document.createElement('span');
      meta.className = 'pmeta';
      meta.textContent = player.is_alive ? `${player.ap} AP · ${player.lives} ♥ · R${player.attack_range}` : 'OUT';
      row.append(swatch, name, meta);
      list.appendChild(row);
    }
  }

  function formatJST(timestamp) {
    return new Date(timestamp).toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo'
    });
  }

  function renderLog() {
    const log = $('eventLog');
    log.innerHTML = '';
    for (const entry of gameData.events) {
      const row = document.createElement('div');
      row.className = 'log-entry';
      const time = document.createElement('time');
      time.textContent = formatJST(entry.created_at);
      const message = document.createElement('span');
      message.textContent = entry.message;
      row.append(time, message);
      log.appendChild(row);
    }
    log.scrollTop = log.scrollHeight;
  }

  function renderGame() {
    if (!gameData) return;
    const currentPlayer = myPlayer();
    const roomCode = gameData.game.room_code;
    $('roomCodeDisplay').textContent = roomCode;
    $('dayValue').textContent = String(gameData.game.day);
    $('aliveValue').textContent = `${alivePlayers().length} / 9`;
    $('connectionValue').textContent = currentPlayer ? currentPlayer.name : 'Spectator';
    $('activeName').textContent = currentPlayer ? currentPlayer.name : 'Spectating';
    $('activeState').textContent = currentPlayer ? (currentPlayer.is_alive ? 'Active' : 'Eliminated') : 'Observer';
    $('activeAP').textContent = currentPlayer ? currentPlayer.ap : '—';
    $('activeLives').textContent = currentPlayer ? currentPlayer.lives : '—';
    $('activeRange').textContent = currentPlayer ? currentPlayer.attack_range : '—';

    const matchFinished = gameData.game.status === 'finished' || !!gameData.game.winner_player_id;
    const disabled = !currentPlayer || !currentPlayer.is_alive || currentPlayer.ap < 1 || matchFinished;
    document.querySelectorAll('[data-action]').forEach(button => {
      button.disabled = disabled;
      button.classList.toggle('selected', button.dataset.action === selectedAction);
    });
    $('cancelAction').disabled = !selectedAction;

    if (!currentPlayer) {
      $('actionHint').textContent = 'You are spectating. Join an unclaimed player seat to take actions.';
    } else if (!currentPlayer.is_alive) {
      $('actionHint').textContent = 'Your country has been eliminated. You can still watch the match.';
    } else if (matchFinished) {
      $('actionHint').textContent = 'The match is over.';
    } else if (currentPlayer.ap < 1) {
      $('actionHint').textContent = 'You have no AP. Living players receive 1 AP every day at 20:00 JST.';
    } else if (selectedAction === 'move') {
      $('actionHint').textContent = 'Click an adjacent empty square (up, down, left or right).';
    } else if (selectedAction === 'attack') {
      $('actionHint').textContent = `Click a living player within your range (${currentPlayer.attack_range}).`;
    } else if (selectedAction === 'transfer') {
      $('actionHint').textContent = `Click a living player within your range (${currentPlayer.attack_range}) to give them 1 AP.`;
    } else {
      $('actionHint').textContent = 'Select an action. Each action costs 1 AP.';
    }

    $('boardHint').textContent = selectedAction
      ? `Action selected: ${selectedAction.toUpperCase()} — choose a valid square or target.`
      : 'Choose an action, then select a square or player.';

    const winnerBanner = $('winnerBanner');
    if (gameData.game.winner_player_id) {
      const winner = gameData.players.find(player => player.id === gameData.game.winner_player_id);
      winnerBanner.textContent = `${winner ? winner.name : 'A country'} wins — last player standing!`;
      winnerBanner.classList.remove('hidden');
    } else {
      winnerBanner.classList.add('hidden');
    }

    renderBoard();
    renderPlayers();
    renderLog();
  }

  function chooseAction(type) {
    const player = myPlayer();
    const finished = gameData?.game?.status === 'finished';
    if (!player || !player.is_alive || player.ap < 1 || finished) return;
    if (type === 'extend') {
      selectedAction = null;
      sendAction({ type: 'extend' });
      return;
    }
    selectedAction = selectedAction === type ? null : type;
    renderGame();
  }

  async function copyRoomCode() {
    const code = gameData?.game?.room_code || session?.roomCode;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      showNotice('Room code copied.');
    } catch {
      showNotice(`Room code: ${code}`);
    }
  }

  $('createRoom').addEventListener('click', createRoom);
  $('joinRoom').addEventListener('click', joinRoom);
  $('copyRoom').addEventListener('click', copyRoomCode);
  $('backHome').addEventListener('click', showHomeView);
  $('cancelAction').addEventListener('click', () => { selectedAction = null; if (gameData) renderGame(); });
  document.querySelectorAll('[data-action]').forEach(button => {
    button.addEventListener('click', () => chooseAction(button.dataset.action));
  });
  $('roomCodeInput').addEventListener('input', event => {
    event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  });

  buildRosterInputs();
  reconnectSavedSession();
})();
