'use strict';

// Language support (English / Japanese). Loaded before app.js.
(() => {
  const D = {
    'doc.title': { en: 'Tank Turn Tactics — Alliance', ja: 'タンク・ターン・タクティクス — 同盟' },
    'lang.toggle': { en: '日本語', ja: 'English' },

    'hdr.eyebrow': { en: 'A daily strategy game', ja: '毎日遊ぶ戦略ゲーム' },
    'hdr.sub': { en: 'A persistent match for up to 9 players · 10, 12 or 15 squares wide', ja: '最大9人で遊ぶ常時進行型マッチ・盤面は10・12・15マス' },
    'hdr.pill': { en: 'Browser multiplayer · 9 seats', ja: 'ブラウザ対戦・9席' },

    'create.eyebrow': { en: 'Set up a match', ja: '対戦を作る' },
    'create.title': { en: 'Create a new game', ja: '新しいゲームを作成' },
    'create.desc': { en: 'Choose all nine countries / player names. Your friends can claim their seats with the room code and their exact names. Seats nobody claims never appear on the map. Once you press Start, no one else can join.', ja: '9つの国名・プレイヤー名を決めてください。友達はルームコードと正確な名前で席に参加できます。誰も参加しなかった席はマップに現れません。開始ボタンを押すと、他の人は参加できなくなります。' },
    'create.players': { en: 'Players (edit the names)', ja: 'プレイヤー(名前を編集)' },
    'create.size': { en: 'Board size', ja: '盤面サイズ' },
    'create.size10': { en: '10 × 10 (small)', ja: '10 × 10(小)' },
    'create.size12': { en: '12 × 12 (medium)', ja: '12 × 12(中)' },
    'create.size15': { en: '15 × 15 (large)', ja: '15 × 15(大)' },
    'create.seat': { en: 'Your seat', ja: 'あなたの席' },
    'create.spectate': { en: 'Spectate (do not play)', ja: '観戦のみ(参加しない)' },
    'create.passLabel': { en: 'Seat passcode (needed to play)', ja: '席のパスコード(プレイする場合は必須)' },
    'create.passPh': { en: '6+ characters. Lets you log back in on another device', ja: '6文字以上。別の端末から再ログインするときに使います' },
    'create.btn': { en: 'Create game', ja: 'ゲームを作成' },

    'join.eyebrow': { en: 'Join your friends', ja: '友達の対戦に参加' },
    'join.title': { en: 'Join an existing game', ja: '既存のゲームに参加' },
    'join.desc': { en: 'Enter the room code and the exact player name your group assigned to you. You appear on the map when you join. You can only join before the host starts the match.', ja: 'ルームコードと、グループで割り当てられた正確なプレイヤー名を入力してください。参加するとマップに現れます。参加できるのはホストが開始する前だけです。' },
    'join.code': { en: 'Room code', ja: 'ルームコード' },
    'join.codePh': { en: 'e.g. 7KQ4PD', ja: '例: 7KQ4PD' },
    'join.name': { en: 'Your country / player name', ja: 'あなたの国名・プレイヤー名' },
    'join.namePh': { en: 'e.g. Japan', ja: '例: Japan' },
    'join.pass': { en: 'Seat passcode', ja: '席のパスコード' },
    'join.passPh': { en: 'New seat: choose one (6+). Returning: enter yours', ja: '新しい席:6文字以上で決める/再ログイン:自分のパスコード' },
    'join.btn': { en: 'Join game (new seat)', ja: 'ゲームに参加(新しい席)' },
    'join.loginBtn': { en: 'Already joined? Log back in', ja: '参加済みの方はこちら:再ログイン' },
    'join.note': { en: 'Each seat can only be claimed once. Remember your passcode: it lets you log back in from another device or browser, and it cannot be recovered if you forget it.', ja: '各席は一度しか参加できません。パスコードは必ず覚えておいてください。別の端末やブラウザから再ログインするときに使い、忘れても復元できません。' },

    'rules.eyebrow': { en: 'Core rules', ja: '基本ルール' },
    'rules.title': { en: 'Action Points. Four choices. Last player standing.', ja: 'アクションポイント。行動は4つ。最後まで生き残った人の勝ち。' },
    'rules.move': { en: 'Move', ja: '移動' },
    'rules.moveDesc': { en: 'Spend 1 AP to move one square up, down, left or right.', ja: '1APで上下左右に1マス移動します。' },
    'rules.attack': { en: 'Attack', ja: '攻撃' },
    'rules.attackDesc': { en: 'Spend 1 AP to hit a player within your range. Three hits eliminate a player.', ja: '1APで射程内のプレイヤーを攻撃します。3回当たると脱落します。' },
    'rules.transfer': { en: 'Transfer', ja: '譲渡' },
    'rules.transferDesc': { en: 'Spend 1 AP to give 1 AP to another player within your range.', ja: '1APを使って、射程内の別のプレイヤーに1APを渡します。' },
    'rules.extend': { en: 'Extend range', ja: '射程を伸ばす' },
    'rules.extendDesc': { en: 'Spend 2 AP to permanently increase your range by one square.', ja: '2APで射程を恒久的に1マス伸ばします。' },
    'rules.foot': { en: 'Each player starts with 1 AP, 3 lives and range 2 when they claim their seat, and appears on the map as far as possible from the other players. Seats nobody claims never appear. Range includes horizontal, vertical and diagonal squares (square / Chebyshev distance). Movement is orthogonal only. Players cannot occupy the same square. Eliminated players join the jury: once per day each juror can give 1 AP to a living player, and votes show in the log. Living players receive 1 AP every day at 20:00 Japan time. The database applies this even when everyone is offline.', ja: '各プレイヤーは席に参加したとき、AP1・ライフ3・射程2で始まり、他のプレイヤーからできるだけ離れた場所に現れます。誰も参加しなかった席は現れません。射程は縦・横・斜めを含みます(正方形/チェビシェフ距離)。移動は上下左右のみです。同じマスに2人は入れません。脱落したプレイヤーは陪審員になり、1日1回、生存者の1人に1APを渡せます。投票はログに表示されます。生存者は毎日20:00(日本時間)に1APを受け取ります。全員がオフラインでも、データベースが自動で付与します。' },

    'game.eyebrow': { en: 'Persistent match', ja: '進行中の対戦' },
    'game.title': { en: 'Alliance battlefield', ja: '同盟の戦場' },
    'game.room': { en: 'ROOM', ja: 'ルーム' },
    'game.copy': { en: 'Copy code', ja: 'コードをコピー' },
    'game.back': { en: 'Back', ja: '戻る' },

    'lobby.eyebrow': { en: 'Lobby', ja: 'ロビー' },
    'lobby.title': { en: 'Waiting to start', ja: '開始待ち' },
    'lobby.start': { en: 'Start match', ja: '対戦を開始' },
    'lobby.joined': { en: '{n} of {total} players have joined. Share the room code so the rest can join.', ja: '{total}人中{n}人が参加済みです。ルームコードを共有して残りの人も参加してもらいましょう。' },
    'lobby.need2': { en: ' You need at least 2 players before you can start.', ja: ' 開始するには2人以上が必要です。' },
    'lobby.press': { en: ' When everyone is in, press Start. After that, no one else can join.', ja: ' 全員そろったら開始を押してください。その後は誰も新しく参加できません。' },
    'lobby.waitHost': { en: ' Waiting for the host to start the match.', ja: ' ホストが対戦を開始するのを待っています。' },
    'lobby.confirm': { en: 'Start the match with {n} players? Seats that have not joined will be locked out.', ja: '{n}人で対戦を開始しますか?参加していない席は参加できなくなります。' },
    'lobby.started': { en: 'The match has started.', ja: '対戦が始まりました。' },
    'lobby.startFail': { en: 'Could not start the match.', ja: '対戦を開始できませんでした。' },

    'stat.day': { en: 'Day', ja: '日数' },
    'stat.dailyAp': { en: 'Daily AP', ja: '毎日のAP' },
    'stat.alive': { en: 'Alive / joined', ja: '生存 / 参加' },
    'stat.seat': { en: 'Your seat', ja: 'あなたの席' },
    'stat.spectator': { en: 'Spectator', ja: '観戦者' },

    'board.title': { en: '{n} × {n} map', ja: '{n} × {n} マップ' },
    'board.titleDefault': { en: 'Map', ja: 'マップ' },
    'board.hint': { en: 'Choose an action, then select a square or player.', ja: '行動を選び、マスまたはプレイヤーを選択してください。' },
    'board.hintSelected': { en: 'Action selected: {action} — choose a valid square or target.', ja: '選択中の行動:{action} — 有効なマスか対象を選んでください。' },
    'board.foot': { en: 'Coordinates start at A1 in the top-left. Player markers show the first two letters of each name.', ja: '座標は左上のA1から始まります。プレイヤーのマークには名前の最初の2文字が表示されます。' },
    'board.aria': { en: '{n} by {n} game board', ja: '{n}×{n}のゲーム盤' },
    'board.empty': { en: 'Empty square {c}', ja: '空きマス {c}' },
    'board.at': { en: '{name} at {c}', ja: '{name}({c})' },

    'me.eyebrow': { en: 'Your country', ja: 'あなたの国' },
    'me.notConnected': { en: 'Not connected', ja: '未接続' },
    'me.waiting': { en: 'Waiting', ja: '待機中' },
    'me.spectating': { en: 'Spectating', ja: '観戦中' },
    'me.active': { en: 'Active', ja: '参戦中' },
    'me.eliminated': { en: 'Eliminated', ja: '脱落' },
    'me.observer': { en: 'Observer', ja: '観戦者' },
    'me.ap': { en: 'Action points', ja: 'アクションポイント' },
    'me.lives': { en: 'Lives', ja: 'ライフ' },
    'me.range': { en: 'Range', ja: '射程' },

    'act.eyebrow': { en: 'Choose an action · Extend costs 2 AP, others 1 AP', ja: '行動を選択 · 射程拡張は2AP、その他は1AP' },
    'act.move': { en: 'Move', ja: '移動' },
    'act.moveSub': { en: '1 AP · 1 square', ja: '1AP・1マス' },
    'act.attack': { en: 'Attack', ja: '攻撃' },
    'act.attackSub': { en: '1 AP · 1 hit', ja: '1AP・1ダメージ' },
    'act.transfer': { en: 'Transfer AP', ja: 'AP譲渡' },
    'act.transferSub': { en: '1 AP · give 1 AP', ja: '1AP・1AP渡す' },
    'act.extend': { en: 'Extend range', ja: '射程拡張' },
    'act.extendSub': { en: '2 AP · range +1', ja: '2AP・射程+1' },
    'act.cancel': { en: 'Cancel action', ja: '行動をキャンセル' },
    'act.hintDefault': { en: 'Select an action to begin. You need at least 1 AP.', ja: '行動を選んで始めましょう。1AP以上が必要です。' },
    'act.hintLobby': { en: 'The match has not started yet. Actions unlock when the host presses Start.', ja: '対戦はまだ始まっていません。ホストが開始を押すと行動できます。' },
    'act.hintSpectating': { en: 'You are spectating. Join an unclaimed player seat to take actions.', ja: '観戦中です。行動するには未参加の席に参加してください。' },
    'act.hintOut': { en: 'Your country has been eliminated. You are on the jury: vote below.', ja: 'あなたの国は脱落しました。陪審員として下で投票できます。' },
    'act.hintOver': { en: 'The match is over.', ja: '対戦は終了しました。' },
    'act.hintNoAp': { en: 'You have no AP. Living players receive 1 AP every day at 20:00 JST.', ja: 'APがありません。生存者は毎日20:00(日本時間)に1APを受け取ります。' },
    'act.hintMove': { en: 'Click an adjacent empty square (up, down, left or right).', ja: '隣り合う空きマス(上下左右)をクリックしてください。' },
    'act.hintAttack': { en: 'Click a living player within your range ({range}).', ja: '射程({range})内の生存プレイヤーをクリックしてください。' },
    'act.hintTransfer': { en: 'Click a living player within your range ({range}) to give them 1 AP.', ja: '射程({range})内の生存プレイヤーをクリックして、1APを渡します。' },
    'act.hintExtend1': { en: 'Select an action. Extending your range needs 2 AP.', ja: '行動を選んでください。射程拡張には2APが必要です。' },
    'act.hintExtend2': { en: 'Select an action. Extending your range costs 2 AP; everything else costs 1.', ja: '行動を選んでください。射程拡張は2AP、それ以外は1APです。' },
    'act.done': { en: 'Action completed.', ja: '行動が完了しました。' },
    'act.fail': { en: 'That action could not be completed.', ja: '行動を実行できませんでした。' },
    'act.selectToken': { en: 'Select a player token on the map.', ja: 'マップ上のプレイヤーを選択してください。' },
    'act.spectatingNotice': { en: 'You are spectating. Choose a player seat to take actions.', ja: '観戦中です。行動するにはプレイヤーの席を選んでください。' },

    'jury.eyebrow': { en: 'Eliminated players', ja: '脱落したプレイヤー' },
    'jury.title': { en: 'Jury vote', ja: '陪審員投票' },
    'jury.hint': { en: 'Give 1 AP to a living player. One vote per day, and votes are public.', ja: '生存プレイヤーに1APを渡せます。1日1票で、投票は公開されます。' },
    'jury.used': { en: "You have used today's jury vote. You can vote again after the next 20:00 JST reset.", ja: '今日の陪審員投票は使用済みです。次の20:00(日本時間)のリセット後にまた投票できます。' },
    'jury.give': { en: 'Give 1 AP', ja: '1AP渡す' },
    'jury.cast': { en: 'Jury vote cast.', ja: '陪審員投票をしました。' },
    'jury.fail': { en: 'That vote could not be cast.', ja: '投票できませんでした。' },

    'list.eyebrow': { en: 'The countries', ja: '参加国' },
    'list.title': { en: 'Players', ja: 'プレイヤー' },
    'list.waiting': { en: 'Not joined yet', ja: '未参加' },
    'list.jury': { en: 'JURY', ja: '陪審員' },
    'list.stats': { en: '{ap} AP · {lives} ♥ · R{range}', ja: 'AP{ap} · ♥{lives} · 射程{range}' },
    'log.eyebrow': { en: 'Recent activity', ja: '最近の動き' },
    'log.title': { en: 'Action log', ja: 'アクションログ' },

    'win.banner': { en: '{name} wins — last player standing!', ja: '{name}の勝利 — 最後の生き残りです!' },
    'win.aCountry': { en: 'A country', ja: 'ある国' },

    'poll.default': { en: 'Game data is saved to the server.', ja: 'ゲームデータはサーバーに保存されています。' },
    'poll.ok': { en: 'Saved online · Last refreshed {time} JST', ja: 'オンライン保存済み · 最終更新 {time}(日本時間)' },
    'poll.issue': { en: 'Connection issue: {msg}', ja: '接続の問題: {msg}' },
    'footer': { en: 'Tank Turn Tactics · Your match is stored online. No player needs to stay online for the daily AP update.', ja: 'タンク・ターン・タクティクス · 対戦はオンラインに保存されます。毎日のAP付与のためにオンラインでいる必要はありません。' },

    'copy.done': { en: 'Room code copied.', ja: 'ルームコードをコピーしました。' },
    'copy.show': { en: 'Room code: {code}', ja: 'ルームコード: {code}' },

    'st.chooseSize': { en: 'Choose a board size.', ja: '盤面サイズを選んでください。' },
    'st.passLen': { en: 'Choose a seat passcode of 6 to 64 characters.', ja: '席のパスコードは6〜64文字で決めてください。' },
    'st.nineNames': { en: 'Please enter all nine names (up to 32 characters each).', ja: '9人全員の名前を入力してください(各32文字まで)。' },
    'st.unique': { en: 'Each player name must be unique.', ja: 'プレイヤー名は重複しないようにしてください。' },
    'st.creating': { en: 'Creating your game…', ja: 'ゲームを作成中…' },
    'st.created': { en: 'Game created. Share the room code with your friends.', ja: 'ゲームを作成しました。ルームコードを友達に共有してください。' },
    'st.createFail': { en: 'Could not create the game.', ja: 'ゲームを作成できませんでした。' },
    'st.codeNeeded': { en: 'Enter the six-character room code.', ja: '6文字のルームコードを入力してください。' },
    'st.nameNeeded': { en: 'Enter your assigned player name.', ja: '割り当てられたプレイヤー名を入力してください。' },
    'st.joining': { en: 'Joining game…', ja: '参加中…' },
    'st.joined': { en: 'You joined the match. Remember your passcode to log back in elsewhere.', ja: '参加しました。別の端末で再ログインするため、パスコードを覚えておいてください。' },
    'st.joinFail': { en: 'Could not join the game.', ja: '参加できませんでした。' },
    'st.loginMissing': { en: 'Enter the room code, your player name and your seat passcode.', ja: 'ルームコード、プレイヤー名、席のパスコードを入力してください。' },
    'st.loggingIn': { en: 'Logging back in…', ja: '再ログイン中…' },
    'st.loginOk': { en: 'Welcome back.', ja: 'おかえりなさい。' },
    'st.loginFail': { en: 'Could not log back in.', ja: '再ログインできませんでした。' },
    'st.reconnecting': { en: 'Reconnecting to your saved game…', ja: '保存されたゲームに再接続中…' },
    'st.reconnected': { en: 'Reconnected to your saved game.', ja: '保存されたゲームに再接続しました。' },
    'st.reconnectFail': { en: 'Could not reconnect: {msg}. Check your connection and reload.', ja: '再接続できませんでした: {msg}。接続を確認してページを再読み込みしてください。' },
    'st.loadFail': { en: 'Could not load the game.', ja: 'ゲームを読み込めませんでした。' },
    'st.refreshFail': { en: 'Could not refresh game data.', ja: 'ゲームデータを更新できませんでした。' },
    'st.requestFailed': { en: 'Request failed ({code}).', ja: 'リクエストに失敗しました({code})。' }
  };

  // Server / database error messages -> Japanese. Unknown messages stay in English.
  const ERRORS = [
    [/^Room not found\.?( Check the room code\.)?$/, 'ルームが見つかりません。ルームコードを確認してください。'],
    [/^This match has already started, so no new players can join\.$/, 'この対戦はすでに始まっているため、新しく参加できません。'],
    [/^This match has already started\.$/, 'この対戦はすでに始まっています。'],
    [/^That player seat has already been claimed\.$/, 'その席はすでに参加済みです。'],
    [/^That name is not in this game\. Check the spelling\.$/, 'その名前はこのゲームにありません。つづりを確認してください。'],
    [/^Enter a valid six-character room code\.$/, '6文字のルームコードを正しく入力してください。'],
    [/^Enter a valid player name\.$/, 'プレイヤー名を正しく入力してください。'],
    [/^Choose a seat passcode of 6 to 64 characters\.$/, '席のパスコードは6〜64文字で決めてください。'],
    [/^Room code, name or passcode is wrong\.$/, 'ルームコード、名前、またはパスコードが違います。'],
    [/^Only the host can start the match\.$/, 'ホストだけが対戦を開始できます。'],
    [/^Only a joined player can start the match\.$/, '参加済みのプレイヤーだけが対戦を開始できます。'],
    [/^At least two players must join before the match can start\.$/, '開始するには2人以上の参加が必要です。'],
    [/^The match is not active\.$/, '対戦は進行中ではありません。'],
    [/^You can only move one square orthogonally\.$/, '上下左右に1マスだけ移動できます。'],
    [/^That square is occupied\.$/, 'そのマスにはすでに誰かがいます。'],
    [/^That square is outside the map\.$/, 'そのマスはマップの外です。'],
    [/^Choose another living player\.$/, '別の生存プレイヤーを選んでください。'],
    [/^Choose a living player\.$/, '生存プレイヤーを選んでください。'],
    [/^(.+) is outside your range \((\d+)\)\.$/, (m) => `${m[1]}は射程(${m[2]})の外です。`],
    [/^You need at least 1 AP to do that\.$/, 'その行動には1AP以上が必要です。'],
    [/^Extending your range costs 2 AP\.$/, '射程拡張には2APが必要です。'],
    [/^Your range is already at the map maximum\.$/, '射程はすでにマップの最大です。'],
    [/^You have already used your jury vote today\.$/, '今日の陪審員投票はすでに使用済みです。'],
    [/^Only eliminated players can vote on the jury\.$/, '陪審員投票ができるのは脱落したプレイヤーだけです。'],
    [/^Your player is no longer active in this match\.$/, 'あなたはこの対戦ですでに脱落しています。'],
    [/^Your saved player session is invalid\. Rejoin the match\.$/, '保存されたプレイヤー情報が無効です。もう一度参加してください。'],
    [/^Your player session could not be verified\./, 'プレイヤー情報を確認できませんでした。パスコードで再ログインしてください。'],
    [/^Unknown action\.$/, '不明な行動です。'],
    [/^Could not create the game\./, 'ゲームを作成できませんでした。もう一度お試しください。'],
    [/^Could not join the game\./, 'ゲームに参加できませんでした。もう一度お試しください。'],
    [/^Could not load the game\./, 'ゲームを読み込めませんでした。再読み込みしてください。'],
    [/^Could not complete that action\./, '行動を実行できませんでした。もう一度お試しください。'],
    [/^Could not cast that vote\./, '投票できませんでした。もう一度お試しください。'],
    [/^Could not start the match\./, '対戦を開始できませんでした。もう一度お試しください。'],
    [/^Could not log back in\./, '再ログインできませんでした。もう一度お試しください。'],
    [/^Too many requests/i, 'リクエストが多すぎます。しばらくしてからお試しください。']
  ];

  // Action-log messages (generated in English by the database) -> Japanese.
  const EVENTS = [
    [/^(.+) moved to ([A-Z]\d+)\.$/, (m) => `${m[1]}が${m[2]}に移動しました。`],
    [/^(.+) hit (.+)\. \2 was eliminated\.$/, (m) => `${m[1]}が${m[2]}を攻撃しました。${m[2]}は脱落しました。`],
    [/^(.+) hit (.+)\. \2 has (\d+) lives left\.$/, (m) => `${m[1]}が${m[2]}を攻撃しました。${m[2]}の残りライフは${m[3]}です。`],
    [/^(.+) transferred 1 AP to (.+)\.$/, (m) => `${m[1]}が${m[2]}に1APを渡しました。`],
    [/^(.+) extended range to (\d+)\.$/, (m) => `${m[1]}が射程を${m[2]}に伸ばしました。`],
    [/^(.+) is the last country standing and wins the match!$/, (m) => `${m[1]}が最後の生き残りとして勝利しました!`],
    [/^(.+) \(jury\) gave 1 AP to (.+)\.$/, (m) => `${m[1]}(陪審員)が${m[2]}に1APを渡しました。`],
    [/^(.+) joined the (?:lobby|match) and spawned at ([A-Z]\d+)\.$/, (m) => `${m[1]}が参加し、${m[2]}に出現しました。`],
    [/^(.+) joined the match\.$/, (m) => `${m[1]}が参加しました。`],
    [/^The match has started with (\d+) players\./, (m) => `${m[1]}人で対戦が始まりました。これ以降は誰も参加できません。`],
    [/^Daily AP granted: every living player received 1 AP\.$/, () => '毎日のAP付与:生存者全員が1APを受け取りました。'],
    [/^The lobby is open on a (\d+)x\d+ board\./, (m) => `${m[1]}×${m[1]}の盤面でロビーが開きました。参加するとライフ3・AP1・射程2で出現します。開始後は新しく参加できません。`],
    [/^The match began/, () => '対戦が始まりました。']
  ];

  let lang = 'en';
  try {
    const saved = localStorage.getItem('tttLang');
    lang = saved === 'ja' || saved === 'en' ? saved : (/^ja/i.test(navigator.language || '') ? 'ja' : 'en');
  } catch { /* storage unavailable */ }

  function fill(text, vars) {
    return String(text).replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] !== undefined ? vars[k] : `{${k}}`));
  }

  function t(key, vars) {
    const entry = D[key];
    if (!entry) return key;
    return fill(entry[lang] || entry.en, vars);
  }

  function tError(message) {
    const text = String(message ?? '');
    if (lang !== 'ja') return text;
    for (const [pattern, out] of ERRORS) {
      const m = text.match(pattern);
      if (m) return typeof out === 'function' ? out(m) : out;
    }
    return text;
  }

  function tEvent(message) {
    const text = String(message ?? '');
    if (lang !== 'ja') return text;
    for (const [pattern, out] of EVENTS) {
      const m = text.match(pattern);
      if (m) return out(m);
    }
    return text;
  }

  function apply() {
    document.documentElement.lang = lang;
    document.title = t('doc.title');
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
    const toggle = document.getElementById('langToggle');
    if (toggle) toggle.textContent = t('lang.toggle');
  }

  function setLang(next) {
    lang = next === 'ja' ? 'ja' : 'en';
    try { localStorage.setItem('tttLang', lang); } catch { /* ignore */ }
    apply();
    window.dispatchEvent(new Event('langchange'));
  }

  window.I18N = { t, tError, tEvent, apply, setLang, getLang: () => lang };
})();
