'use strict';

(() => {
  const DEFAULT_NAMES = ['Japan', 'Canada', 'Brazil', 'France', 'Egypt', 'India', 'Australia', 'Mexico', 'Sweden'];
  const COLORS = ['#83c7d8', '#e8bf73', '#a4d18a', '#d99aa5', '#b3a0e6', '#e5a56f', '#8ec5ad', '#d5b4dd', '#c5c9d2'];
  const SESSION_KEY = 'tankTurnTacticsSessionV1';
  const ACTION_COST = { move: 1, attack: 1, transfer: 1, extend: 2 };
  const $ = id => document.getElementById(id);
  const I = window.I18N;
  const t = (key, vars) => I.t(key, vars);

  const home = $('home');
  const game = $('game');
  const rosterInputs = $('rosterInputs');
  let session = null;
  let gameData = null;
  let selectedAction = null;
  let pollHandle = null;
  let polling = false;
  let lastPollTime = null;

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
    if (!response.ok) {
      throw new Error(body.error ? I.tError(body.error) : t('st.requestFailed', { code: response.status }));
    }
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
      input.setAttribute('aria-label', `Player ${index + 1}`);
      input.addEventListener('input', refreshHostSelect);
      rosterInputs.appendChild(input);
    });
    refreshHostSelect();
  }

  function refreshHostSelect() {
    const select = $('hostPlayer');
    const previous = select.value;
    const names = [...document.querySelectorAll('.country-name')].map(input => input.value.trim() || 'Player');
    select.innerHTML = '';
    const spectate = document.createElement('option');
    spectate.value = '';
    spectate.textContent = t('create.spectate');
    select.appendChild(spectate);
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
    const boardSize = Number($('boardSize').value);
    const passcode = $('createPasscode').value;

    if (![10, 12, 15].includes(boardSize)) {
      setStatus('hostStatus', t('st.chooseSize'), true);
      return;
    }
    if (playerIndex !== null && (passcode.length < 6 || passcode.length > 64)) {
      setStatus('hostStatus', t('st.passLen'), true);
      return;
    }
    if (names.some(name => !name || name.length > 32)) {
      setStatus('hostStatus', t('st.nineNames'), true);
      return;
    }
    if (new Set(names.map(name => name.toLocaleLowerCase('en'))).size !== 9) {
      setStatus('hostStatus', t('st.unique'), true);
      return;
    }

    button.disabled = true;
    setStatus('hostStatus', t('st.creating'));
    try {
      const result = await requestJSON('/api/games', {
        method: 'POST',
        body: JSON.stringify({ names, playerIndex, boardSize, passcode: playerIndex === null ? undefined : passcode })
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
      setStatus('hostStatus', t('st.created'));
    } catch (error) {
      setStatus('hostStatus', error.message || t('st.createFail'), true);
    } finally {
      button.disabled = false;
    }
  }

  async function joinRoom() {
    const button = $('joinRoom');
    const roomCode = $('roomCodeInput').value.trim().toUpperCase();
    const name = $('joinName').value.trim();
    const passcode = $('joinPasscode').value;
    if (!/^[A-Z0-9]{6}$/.test(roomCode)) {
      setStatus('joinStatus', t('st.codeNeeded'), true);
      return;
    }
    if (!name) {
      setStatus('joinStatus', t('st.nameNeeded'), true);
      return;
    }
    if (passcode.length < 6 || passcode.length > 64) {
      setStatus('joinStatus', t('st.passLen'), true);
      return;
    }

    button.disabled = true;
    setStatus('joinStatus', t('st.joining'));
    try {
      const result = await requestJSON('/api/join', {
        method: 'POST',
        body: JSON.stringify({ roomCode, name, passcode })
      });
      saveSession({ roomCode: result.roomCode, playerId: result.playerId, token: result.token, name });
      selectedAction = null;
      await refreshGame(false, true);
      setStatus('joinStatus', t('st.joined'));
    } catch (error) {
      setStatus('joinStatus', error.message || t('st.joinFail'), true);
    } finally {
      button.disabled = false;
    }
  }

  async function loginRoom() {
    const button = $('loginRoom');
    const roomCode = $('roomCodeInput').value.trim().toUpperCase();
    const name = $('joinName').value.trim();
    const passcode = $('joinPasscode').value;
    if (!/^[A-Z0-9]{6}$/.test(roomCode) || !name || !passcode) {
      setStatus('joinStatus', t('st.loginMissing'), true);
      return;
    }

    button.disabled = true;
    setStatus('joinStatus', t('st.loggingIn'));
    try {
      const result = await requestJSON('/api/login', {
        method: 'POST',
        body: JSON.stringify({ roomCode, name, passcode })
      });
      saveSession({ roomCode: result.roomCode, playerId: result.playerId, token: result.token, name });
      selectedAction = null;
      await refreshGame(false, true);
      setStatus('joinStatus', t('st.loginOk'));
    } catch (error) {
      setStatus('joinStatus', error.message || t('st.loginFail'), true);
    } finally {
      button.disabled = false;
    }
  }

  async function reconnectSavedSession() {
    const saved = loadSavedSession();
    if (!saved) return;
    session = saved;
    setStatus('hostStatus', t('st.reconnecting'));
    try {
      await refreshGame(false, true);
      setStatus('hostStatus', t('st.reconnected'));
    } catch (error) {
      setStatus('hostStatus', t('st.reconnectFail', { msg: error.message }), true);
    }
  }

  function setPollStatus() {
    $('pollStatus').textContent = lastPollTime
      ? t('poll.ok', { time: lastPollTime })
      : t('poll.default');
  }

  async function refreshGame(silent = false, enterGame = false) {
    if (!session?.roomCode || polling) return;
    polling = true;
    try {
      const data = await requestJSON(`/api/game/${encodeURIComponent(session.roomCode)}`);
      gameData = data;
      renderGame();
      if (enterGame || !game.classList.contains('hidden')) showGameView();
      lastPollTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });
      setPollStatus();
      if (enterGame || !pollHandle) startPolling();
    } catch (error) {
      if (!silent) showNotice(error.message || t('st.loadFail'), true);
      $('pollStatus').textContent = t('poll.issue', { msg: error.message || t('st.refreshFail') });
      if (enterGame) throw error;
    } finally {
      polling = false;
    }
  }

  function boardSize() {
    return Number(gameData?.game?.board_size) || 15;
  }

  // A player is "on the map" only after their seat has been claimed.
  function onMap(player) {
    return player.spawned !== false && player.is_alive;
  }

  function myPlayer() {
    if (!gameData || !session?.playerId) return null;
    return gameData.players.find(player => player.id === session.playerId) || null;
  }

  function alivePlayers() {
    return (gameData?.players || []).filter(onMap);
  }

  function joinedPlayers() {
    return (gameData?.players || []).filter(player => player.spawned !== false);
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
    const size = boardSize();
    const board = $('board');
    board.innerHTML = '';
    board.style.gridTemplateColumns = `repeat(${size}, minmax(0, 1fr))`;
    board.setAttribute('aria-label', t('board.aria', { n: size }));

    const playersByPosition = new Map();
    for (const player of gameData.players) {
      if (onMap(player)) playersByPosition.set(`${player.x},${player.y}`, player);
    }

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const occupant = playersByPosition.get(`${x},${y}`) || null;
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'cell';
        cell.setAttribute('role', 'gridcell');
        const coord = `${String.fromCharCode(65 + x)}${y + 1}`;
        cell.setAttribute('aria-label', occupant ? t('board.at', { name: occupant.name, c: coord }) : t('board.empty', { c: coord }));
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
        showNotice(t('act.selectToken'), true);
        return;
      }
      await sendAction({ type: selectedAction, targetId: occupant.id });
    }
  }

  async function sendAction(action) {
    const player = myPlayer();
    if (!player || !session?.token || !session?.playerId) {
      showNotice(t('act.spectatingNotice'), true);
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
      showNotice(t('act.done'));
      await refreshGame(true);
    } catch (error) {
      showNotice(error.message || t('act.fail'), true);
      await refreshGame(true);
    }
  }

  async function sendJuryVote(targetId) {
    if (!session?.token || !session?.playerId) return;
    try {
      await requestJSON('/api/jury-vote', {
        method: 'POST',
        body: JSON.stringify({
          roomCode: session.roomCode,
          playerId: session.playerId,
          token: session.token,
          targetId
        })
      });
      showNotice(t('jury.cast'));
    } catch (error) {
      showNotice(error.message || t('jury.fail'), true);
    }
    await refreshGame(true);
  }

  function renderPlayers() {
    const list = $('playersList');
    list.innerHTML = '';
    for (const player of gameData.players) {
      const waiting = player.spawned === false;
      const row = document.createElement('div');
      row.className = `player-row${player.is_alive ? '' : ' eliminated'}${waiting ? ' waiting' : ''}`;
      const swatch = document.createElement('span');
      swatch.className = 'swatch';
      swatch.classList.add(`seat-${((player.seat_number - 1) % COLORS.length) + 1}`);
      swatch.textContent = initials(player.name);
      const name = document.createElement('span');
      name.className = 'pname';
      name.textContent = player.name;
      const meta = document.createElement('span');
      meta.className = 'pmeta';
      if (waiting) meta.textContent = t('list.waiting');
      else meta.textContent = player.is_alive
        ? t('list.stats', { ap: player.ap, lives: player.lives, range: player.attack_range })
        : t('list.jury');
      row.append(swatch, name, meta);
      list.appendChild(row);
    }
  }

  function renderJury() {
    const card = $('juryCard');
    const me = myPlayer();
    const finished = gameData.game.status === 'finished' || !!gameData.game.winner_player_id;
    const isJuror = !!me && me.spawned !== false && !me.is_alive;
    card.classList.toggle('hidden', !isJuror || finished);
    if (!isJuror || finished) return;

    const votedToday = (me.last_jury_vote_day || 0) >= gameData.game.day;
    $('juryHint').textContent = votedToday ? t('jury.used') : t('jury.hint');

    const list = $('juryList');
    list.innerHTML = '';
    for (const player of alivePlayers()) {
      const row = document.createElement('div');
      row.className = 'player-row';
      const name = document.createElement('span');
      name.className = 'pname';
      name.textContent = player.name;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn subtle';
      button.textContent = t('jury.give');
      button.disabled = votedToday;
      button.addEventListener('click', () => sendJuryVote(player.id));
      row.append(name, button);
      list.appendChild(row);
    }
  }

  async function startGame() {
    const joined = joinedPlayers().length;
    if (!window.confirm(t('lobby.confirm', { n: joined }))) return;
    const button = $('startGame');
    button.disabled = true;
    try {
      await requestJSON('/api/start', {
        method: 'POST',
        body: JSON.stringify({
          roomCode: session.roomCode,
          playerId: session.playerId,
          token: session.token
        })
      });
      showNotice(t('lobby.started'));
    } catch (error) {
      showNotice(error.message || t('lobby.startFail'), true);
    }
    await refreshGame(true);
  }

  function renderLobby() {
    const card = $('lobbyCard');
    const inLobby = gameData.game.status === 'waiting';
    card.classList.toggle('hidden', !inLobby);
    if (!inLobby) return;

    const me = myPlayer();
    const joined = joinedPlayers().length;
    const hostId = gameData.game.host_player_id;
    const mayStart = !!me && me.spawned !== false && (!hostId || hostId === me.id);

    let text = t('lobby.joined', { n: joined, total: gameData.players.length });
    if (mayStart) text += joined < 2 ? t('lobby.need2') : t('lobby.press');
    else text += t('lobby.waitHost');
    $('lobbyHint').textContent = text;

    const button = $('startGame');
    button.classList.toggle('hidden', !mayStart);
    button.disabled = joined < 2;
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
      message.textContent = I.tEvent(entry.message);
      row.append(time, message);
      log.appendChild(row);
    }
    log.scrollTop = log.scrollHeight;
  }

  function actionLabel(type) {
    return t(`act.${type}`).toUpperCase();
  }

  function renderGame() {
    if (!gameData) return;
    const currentPlayer = myPlayer();
    const size = boardSize();
    const roomCode = gameData.game.room_code;
    $('roomCodeDisplay').textContent = roomCode;
    $('boardTitle').textContent = t('board.title', { n: size });
    $('dayValue').textContent = String(gameData.game.day);
    $('aliveValue').textContent = `${alivePlayers().length} / ${joinedPlayers().length}`;
    $('connectionValue').textContent = currentPlayer ? currentPlayer.name : t('stat.spectator');
    $('activeName').textContent = currentPlayer ? currentPlayer.name : t('me.spectating');
    $('activeState').textContent = currentPlayer
      ? (currentPlayer.is_alive ? t('me.active') : t('me.eliminated'))
      : t('me.observer');
    $('activeAP').textContent = currentPlayer ? currentPlayer.ap : '—';
    $('activeLives').textContent = currentPlayer ? currentPlayer.lives : '—';
    $('activeRange').textContent = currentPlayer ? currentPlayer.attack_range : '—';

    const matchFinished = gameData.game.status === 'finished' || !!gameData.game.winner_player_id;
    const inLobby = gameData.game.status === 'waiting';
    const cannotAct = !currentPlayer || !currentPlayer.is_alive || matchFinished || inLobby;
    document.querySelectorAll('[data-action]').forEach(button => {
      const cost = ACTION_COST[button.dataset.action] || 1;
      button.disabled = cannotAct || currentPlayer.ap < cost;
      button.classList.toggle('selected', button.dataset.action === selectedAction);
    });
    $('cancelAction').disabled = !selectedAction;

    const hint = $('actionHint');
    if (inLobby) {
      hint.textContent = t('act.hintLobby');
    } else if (!currentPlayer) {
      hint.textContent = t('act.hintSpectating');
    } else if (!currentPlayer.is_alive) {
      hint.textContent = t('act.hintOut');
    } else if (matchFinished) {
      hint.textContent = t('act.hintOver');
    } else if (currentPlayer.ap < 1) {
      hint.textContent = t('act.hintNoAp');
    } else if (selectedAction === 'move') {
      hint.textContent = t('act.hintMove');
    } else if (selectedAction === 'attack') {
      hint.textContent = t('act.hintAttack', { range: currentPlayer.attack_range });
    } else if (selectedAction === 'transfer') {
      hint.textContent = t('act.hintTransfer', { range: currentPlayer.attack_range });
    } else if (currentPlayer.ap < 2) {
      hint.textContent = t('act.hintExtend1');
    } else {
      hint.textContent = t('act.hintExtend2');
    }

    $('boardHint').textContent = selectedAction
      ? t('board.hintSelected', { action: actionLabel(selectedAction) })
      : t('board.hint');

    const winnerBanner = $('winnerBanner');
    if (gameData.game.winner_player_id) {
      const winner = gameData.players.find(player => player.id === gameData.game.winner_player_id);
      winnerBanner.textContent = t('win.banner', { name: winner ? winner.name : t('win.aCountry') });
      winnerBanner.classList.remove('hidden');
    } else {
      winnerBanner.classList.add('hidden');
    }

    renderLobby();
    renderBoard();
    renderPlayers();
    renderJury();
    renderLog();
  }

  function chooseAction(type) {
    const player = myPlayer();
    const finished = gameData?.game?.status === 'finished';
    const inLobby = gameData?.game?.status === 'waiting';
    const cost = ACTION_COST[type] || 1;
    if (!player || !player.is_alive || player.ap < cost || finished || inLobby) return;
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
      showNotice(t('copy.done'));
    } catch {
      showNotice(t('copy.show', { code }));
    }
  }

  $('createRoom').addEventListener('click', createRoom);
  $('joinRoom').addEventListener('click', joinRoom);
  $('loginRoom').addEventListener('click', loginRoom);
  $('startGame').addEventListener('click', startGame);
  $('copyRoom').addEventListener('click', copyRoomCode);
  $('backHome').addEventListener('click', showHomeView);
  $('cancelAction').addEventListener('click', () => { selectedAction = null; if (gameData) renderGame(); });
  $('langToggle').addEventListener('click', () => I.setLang(I.getLang() === 'ja' ? 'en' : 'ja'));
  document.querySelectorAll('[data-action]').forEach(button => {
    button.addEventListener('click', () => chooseAction(button.dataset.action));
  });
  $('roomCodeInput').addEventListener('input', event => {
    event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  });

  // Re-draw everything that is built in JavaScript when the language changes.
  window.addEventListener('langchange', () => {
    refreshHostSelect();
    setPollStatus();
    if (gameData) renderGame();
  });

  I.apply();
  buildRosterInputs();
  reconnectSavedSession();
})();
