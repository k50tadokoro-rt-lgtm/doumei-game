# Tank Turn Tactics — persistent multiplayer edition

A browser-based 15×15 daily strategy game for up to nine players. This version replaces the old host-browser/PeerJS prototype with a Node.js web service and Supabase-backed persistent game state.

## Implemented game rules

- Nine reserved seats on a 15×15 board.
- Three lives per player.
- One starting AP per player.
- Starting range 2, including horizontal, vertical and diagonal squares (Chebyshev distance).
- Move one square orthogonally; attack; transfer one AP; or extend range by one. Each action costs 1 AP.
- Three hits eliminate a player. Last living player wins.
- All living players in active games receive 1 AP daily at 20:00 Asia/Tokyo.
- The Supabase database cron job runs independently of the web service, so it still grants AP when all players are offline.
- The browser keeps a private player token in local storage so the same device can reconnect after closing the tab.

## Architecture

- Express serves the web page and API from one Render Web Service.
- Supabase Postgres stores games, player seats, tokens (hashes only), and the event log.
- Supabase SQL functions validate and apply actions transactionally.
- Supabase Cron updates AP at 11:00 UTC / 20:00 Japan time.
- The browser polls for game updates; no one is designated as a host.

The Supabase service key is only used by `server.js` on the server. It is not included in any browser JavaScript.

## Supabase setup

1. Create the Supabase project.
2. In **SQL Editor**, run the original `tank-turn-tactics-setup.sql` once if you have not already done so.
3. In **SQL Editor**, create a new query and run `supabase-migration.sql` from this project. This adds the transactional game functions and updates the cron function while keeping the existing daily job name.
4. Confirm the final query shows one `tank-turn-tactics-daily-ap` row with schedule `0 11 * * *`.
5. In Supabase **Project Settings → API** (or **API Keys**, depending on the dashboard layout), copy the **Project URL** and the server-side secret/service-role key. Never use the server key in frontend code or share it publicly.

## Deploy to Render

1. Upload this entire project folder to a new GitHub repository. Include `server.js`, `package.json`, `render.yaml`, `supabase-migration.sql`, and the `public` folder. Do not upload `.env` or any real key.
2. In Render, choose **New → Blueprint** and connect the GitHub repository, or create a **Web Service** from the repository.
3. For a manual Web Service, use:
   - Runtime: Node
   - Build command: `npm install`
   - Start command: `npm start`
   - Health check path: `/api/health`
4. In the Render service's **Environment** settings, add:
   - `SUPABASE_URL` = your Supabase Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = your Supabase server-side key
5. Deploy. Once the health check passes, open the `onrender.com` URL and create a room.
6. Share the website address and six-character room code with the group. Each friend enters their exact assigned player name once.

## Running locally

Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env
# Fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
npm start
```

Open `http://localhost:3000`.

## Important notes

- Save your browser's player session. The player token is stored in that browser's local storage. If site data is cleared or you switch devices, that seat cannot currently be recovered automatically; create a new match or keep the original browser profile.
- The six-character room code is intended to be shared only with your group. Anyone who has it can view the board; each player seat can only be claimed once.
- Render Free Web Services can sleep after inactivity and may take time to wake when someone opens the game. The database and daily AP job are separate, so game state and the scheduled AP award do not depend on Render staying awake.
- Supabase Free projects may pause after a period of low activity. Test the service regularly; uninterrupted always-on availability may require a paid Supabase plan.
- This project has not been deployed to your accounts. You must create/connect the Supabase and Render projects and enter your own server secrets in Render's dashboard.
