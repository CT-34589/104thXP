# 104th XP Leaderboard Windows 11 Server Setup

This guide sets up your Windows 11 home server so the Discord bot can write XP locally and the public website can safely read leaderboard stats.

The target setup is:

```text
Discord bot on Windows 11
  -> writes scores locally
  -> Postgres on 127.0.0.1

Public website
  -> GET https://leaderboard.yourdomain.com/api/leaderboard
  -> Cloudflare Tunnel
  -> Windows server API on 127.0.0.1
  -> read-only database access
```

GitHub should be used for source control and deployments. Do not use GitHub as the live database.

## Recommended Architecture

| Component | Recommendation | Why |
|---|---|---|
| Database | Postgres for Windows | Reliable, structured, easy to back up |
| Public API | Small Node.js API | Fits this repo and is easy to run on Windows |
| Public access | Cloudflare Tunnel | Works without a static IP and avoids port forwarding |
| Frontend | GitHub Pages or static hosting | The frontend only fetches JSON |
| Bot writes | Local DB connection | No public write endpoint required |
| API reads | SELECT-only Postgres user | Public API cannot modify XP |
| Process manager | Windows Task Scheduler | Keeps the API running after reboot without third-party service wrappers |

Optional later:

| Component | When to add |
|---|---|
| Redis | Only if Postgres reads become a proven bottleneck |
| Caddy | If you host multiple local HTTP services |
| Tailscale | For private remote admin access |

## Security Rules

Follow these from the start:

1. Postgres must listen on `127.0.0.1` only.
2. Do not port forward Postgres.
3. Do not port forward the API if using Cloudflare Tunnel.
4. The public API should expose read routes only.
5. The Discord bot can write because it runs on the same server.
6. The public API should use a Postgres user with `SELECT` only.
7. Cloudflare Tunnel should expose only the local API port.
8. Back up the database automatically.

## Server Assumptions

This guide assumes:

- Windows 11
- 32 GB RAM and SSD storage
- Discord bot runs on the same Windows server
- You own a domain or can add one to Cloudflare
- You want a public read endpoint like:

```text
https://leaderboard.yourdomain.com/api/leaderboard
```

If you do not have a domain yet, you can still test locally first. For public use without a static IP, Cloudflare Tunnel is the cleanest option.

## 1. Create a Project Folder

Use a simple path without spaces:

```powershell
mkdir C:\104thXP
cd C:\104thXP
```

Clone your repo there:

```powershell
git clone https://github.com/YOUR-USERNAME/104thXP.git .
```

If the repo is already on the server, place it somewhere like:

```text
C:\104thXP
```

Avoid paths such as:

```text
C:\Users\Your Name\Desktop\104th XP Final
```

Spaces and desktop folders make service setup more annoying.

## 2. Install Required Software

Install these:

- Git for Windows: `https://git-scm.com/download/win`
- Node.js LTS: `https://nodejs.org/`
- Postgres for Windows: `https://www.postgresql.org/download/windows/`
- Cloudflare Tunnel `cloudflared`: `https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/`

After installing Git and Node.js, open a new PowerShell window and check:

```powershell
git --version
node --version
npm --version
```

Node 22 LTS is a good default.

## 3. Windows Firewall

With Cloudflare Tunnel, you do not need to open inbound ports for the public site.

Recommended:

- Do not port forward `80`
- Do not port forward `443`
- Do not port forward `5432`
- Do not expose Postgres publicly
- Let `cloudflared` make outbound connections to Cloudflare

Check active listening ports:

```powershell
netstat -ano | findstr LISTENING
```

Postgres should eventually listen on:

```text
127.0.0.1:5432
```

Your API should listen on:

```text
127.0.0.1:3000
```

If Windows asks whether Node.js or cloudflared should be allowed through the firewall, Cloudflare Tunnel only needs outbound access. You do not need to allow public inbound access for the API.

## 4. Install Postgres

Run the Postgres Windows installer.

Recommended installer choices:

| Option | Value |
|---|---|
| Installation Directory | Default is fine |
| Data Directory | Default is fine |
| Password | Use a long password and store it safely |
| Port | `5432` |
| Locale | Default |
| Stack Builder | Not required |

After installation, open **Services** and confirm a service like this exists and is running:

```text
postgresql-x64-16
```

The version number may differ.

You can also check in PowerShell:

```powershell
Get-Service *postgres*
```

## 5. Lock Postgres to Localhost

Find the Postgres data directory. Common paths:

```text
C:\Program Files\PostgreSQL\16\data
C:\Program Files\PostgreSQL\17\data
```

Open this file as Administrator:

```text
postgresql.conf
```

Set:

```conf
listen_addresses = 'localhost'
```

Then open:

```text
pg_hba.conf
```

Make sure local TCP connections use password auth:

```conf
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             ::1/128                 scram-sha-256
```

Restart Postgres from Services, or run PowerShell as Administrator:

```powershell
Restart-Service postgresql-x64-16
```

Change the service name if your installed version is different.

Confirm Postgres is not listening publicly:

```powershell
netstat -ano | findstr :5432
```

You want to see `127.0.0.1:5432` or `[::1]:5432`, not `0.0.0.0:5432`.

## 6. Create Database and Users

Open **SQL Shell (psql)** from the Start Menu, or run:

```powershell
psql -U postgres
```

If `psql` is not found, add the Postgres `bin` directory to your PATH. Common path:

```text
C:\Program Files\PostgreSQL\16\bin
```

Use two database users:

- `leaderboard_bot`: used by the Discord bot, can write scores
- `leaderboard_api`: used by the public API, can only read leaderboard data

In `psql`:

```sql
CREATE DATABASE leaderboard;

CREATE USER leaderboard_bot WITH PASSWORD 'replace_with_a_long_random_bot_password';
CREATE USER leaderboard_api WITH PASSWORD 'replace_with_a_long_random_api_password';

GRANT CONNECT ON DATABASE leaderboard TO leaderboard_bot;
GRANT CONNECT ON DATABASE leaderboard TO leaderboard_api;
```

Connect to the new database:

```sql
\c leaderboard
```

Create the table:

```sql
CREATE TABLE leaderboard (
  discord_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  designation TEXT,
  console TEXT NOT NULL CHECK (console IN ('PC', 'PS', 'Xbox')),
  xp INTEGER NOT NULL CHECK (xp >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX leaderboard_xp_idx ON leaderboard (xp DESC);
```

Grant permissions:

```sql
GRANT USAGE ON SCHEMA public TO leaderboard_bot;
GRANT SELECT, INSERT, UPDATE ON leaderboard TO leaderboard_bot;

GRANT USAGE ON SCHEMA public TO leaderboard_api;
GRANT SELECT ON leaderboard TO leaderboard_api;
```

Exit:

```sql
\q
```

## 7. Test Database Permissions

Test the API user can read:

```powershell
psql "postgres://leaderboard_api:replace_with_a_long_random_api_password@127.0.0.1:5432/leaderboard"
```

Then:

```sql
SELECT COUNT(*) FROM leaderboard;
```

Now try to insert:

```sql
INSERT INTO leaderboard (discord_id, name, console, xp) VALUES ('test', 'test', 'PC', 1);
```

That insert should fail. If it succeeds, the API user has too much permission.

Exit:

```sql
\q
```

Test the bot user can write:

```powershell
psql "postgres://leaderboard_bot:replace_with_a_long_random_bot_password@127.0.0.1:5432/leaderboard"
```

Then:

```sql
INSERT INTO leaderboard (discord_id, name, designation, console, xp)
VALUES ('123456789', 'Test User', 'CT-1001', 'PC', 100)
ON CONFLICT (discord_id)
DO UPDATE SET
  name = EXCLUDED.name,
  designation = EXCLUDED.designation,
  console = EXCLUDED.console,
  xp = EXCLUDED.xp,
  updated_at = now();

SELECT * FROM leaderboard WHERE discord_id = '123456789';
```

Exit the bot user session:

```sql
\q
```

Clean up the test row as the admin user:

```powershell
psql -U postgres -d leaderboard
```

Then:

```sql
DELETE FROM leaderboard WHERE discord_id = '123456789';
\q
```

The bot user is intentionally not allowed to delete rows. It only needs to insert and update leaderboard records.

## 8. Bot Write Query

The Discord bot should connect to Postgres using `leaderboard_bot`.

Connection string:

```text
postgres://leaderboard_bot:BOT_PASSWORD@127.0.0.1:5432/leaderboard
```

The database only needs the current leaderboard row for each player:

| Column | Meaning |
|---|---|
| `discord_id` | Discord user ID, primary key |
| `name` | Player display name |
| `designation` | Optional designation, for example `CT-1001` |
| `console` | One of `PC`, `PS`, `Xbox` |
| `xp` | Cumulative total XP |

Use this query when the bot awards an XP amount and the database should add it to the player's existing cumulative total:

```sql
INSERT INTO leaderboard (discord_id, name, designation, console, xp)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (discord_id)
DO UPDATE SET
  name = EXCLUDED.name,
  designation = EXCLUDED.designation,
  console = EXCLUDED.console,
  xp = leaderboard.xp + EXCLUDED.xp,
  updated_at = now();
```

Parameter meaning:

| Parameter | Meaning |
|---|---|
| `$1` | Discord ID |
| `$2` | Name |
| `$3` | Optional designation |
| `$4` | Console: `PC`, `PS`, or `Xbox` |
| `$5` | XP amount to add |

Example: if a player has `100` XP and the bot sends `$5 = 25`, the row becomes `125`.

If you ever need to correct a player's XP to an exact total, run an admin correction query instead of the normal bot award query:

```sql
UPDATE leaderboard
SET xp = $2,
    updated_at = now()
WHERE discord_id = $1;
```

## 9. Public API Response Shape

The frontend expects:

```json
{
  "lastUpdated": "2026-07-11T12:00:00.000Z",
  "season": "Season 1",
  "players": [
    {
      "id": "discord-user-id",
      "displayName": "CT-7567",
      "callsign": "CT-1001",
      "platform": "pc",
      "xp": 38200,
      "level": 48
    }
  ]
}
```

The API should:

- Allow `GET /api/leaderboard`
- Optionally allow `GET /api/health`
- Have no public write route
- Cache the DB result in memory for 2-5 seconds
- Return `Cache-Control: public, max-age=3`
- Connect using `leaderboard_api`

## 10. Example Minimal Node API

From the repo folder:

```powershell
cd C:\104thXP
npm install
npm install fastify pg dotenv @fastify/cors
```

If this API is in its own folder instead of the main Vite repo, make sure the folder has a `package.json` that enables ESM imports:

```powershell
npm init -y
npm pkg set type=module
npm install fastify pg dotenv @fastify/cors
```

The important line in `package.json` is:

```json
{
  "type": "module"
}
```

Create:

```text
C:\104thXP\server\index.js
```

Example API:

```js
import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import pg from 'pg'

const { Pool } = pg

const app = Fastify({
  logger: true,
})

await app.register(cors, {
  origin: [
    'https://104thbattalionmilsim.com',
    'https://www.104thbattalionmilsim.com',
  ],
  methods: ['GET'],
})

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
})

const CACHE_TTL_MS = Number(process.env.LEADERBOARD_CACHE_TTL_MS ?? 3000)
const PORT = Number(process.env.PORT ?? 3000)
const HOST = process.env.HOST ?? '127.0.0.1'

let cachedAt = 0
let cachedPayload = null

function levelFromXp(xp) {
  if (xp < 2250000) {
    return Math.floor((-1 + Math.sqrt(1 + xp / 625)) / 2)
  }

  return 30 + Math.floor((xp - 2250000) / 147500)
}

app.get('/api/health', async () => {
  return { ok: true }
})

app.get('/api/leaderboard', async (request, reply) => {
  const now = Date.now()

  if (cachedPayload && now - cachedAt < CACHE_TTL_MS) {
    reply.header('Cache-Control', 'public, max-age=3')
    return cachedPayload
  }

  const result = await pool.query(`
    SELECT discord_id, name, designation, console, xp, updated_at
    FROM leaderboard
    ORDER BY xp DESC
    LIMIT 100
  `)

  const payload = {
    lastUpdated: new Date().toISOString(),
    season: process.env.LEADERBOARD_SEASON ?? 'Season 1',
    players: result.rows.map((row) => ({
      id: row.discord_id,
      displayName: row.name,
      callsign: row.designation,
      platform: row.console.toLowerCase(),
      xp: row.xp,
      level: levelFromXp(row.xp),
    })),
  }

  cachedAt = now
  cachedPayload = payload

  reply.header('Cache-Control', 'public, max-age=3')
  return payload
})

app.setNotFoundHandler((request, reply) => {
  reply.code(404).send({ error: 'Not found' })
})

await app.listen({ host: HOST, port: PORT })
```

Create:

```text
C:\104thXP\.env
```

Example:

```env
HOST=127.0.0.1
PORT=3000
LEADERBOARD_SEASON=Season 1
LEADERBOARD_CACHE_TTL_MS=3000
DATABASE_URL=postgres://leaderboard_api:replace_with_a_long_random_api_password@127.0.0.1:5432/leaderboard
```

Important: the API uses `leaderboard_api`, not `leaderboard_bot`.

Test locally:

```powershell
node .\server\index.js
```

In another PowerShell window:

```powershell
curl.exe http://127.0.0.1:3000/api/health
curl.exe http://127.0.0.1:3000/api/leaderboard
```

## 11. Run the API with Task Scheduler

Use Task Scheduler to start the API at boot. This avoids third-party service wrappers.

First create folders for scripts and logs:

```powershell
mkdir C:\104thXP\scripts
mkdir C:\104thXP\logs
```

Create:

```text
C:\104thXP\scripts\run-api.ps1
```

Script:

```powershell
$ErrorActionPreference = "Stop"

Set-Location "C:\104thXP"

$env:HOST = "127.0.0.1"
$env:PORT = "3000"
$env:LEADERBOARD_SEASON = "Season 1"
$env:LEADERBOARD_CACHE_TTL_MS = "3000"
$env:DATABASE_URL = "postgres://leaderboard_api:replace_with_a_long_random_api_password@127.0.0.1:5432/leaderboard"

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content "C:\104thXP\logs\api-out.log" "[$timestamp] Starting LeaderboardAPI"

node "C:\104thXP\server\index.js" `
  1>> "C:\104thXP\logs\api-out.log" `
  2>> "C:\104thXP\logs\api-err.log"
```

Test the runner manually:

```powershell
powershell.exe -ExecutionPolicy Bypass -File C:\104thXP\scripts\run-api.ps1
```

In another PowerShell window:

```powershell
curl.exe http://127.0.0.1:3000/api/health
```

If it works, stop the manual process with `Ctrl+C`.

Now create the scheduled task:

1. Open **Task Scheduler**.
2. Choose **Create Task**, not Basic Task.
3. Name it `LeaderboardAPI`.
4. Select **Run whether user is logged on or not**.
5. Select **Run with highest privileges**.
6. Configure for **Windows 10** or **Windows 11** if available.
7. Trigger: **At startup**.
8. Add a second trigger: **At log on** for your server user. This is optional but useful while testing.
9. Action: **Start a program**.
10. Program:

```text
powershell.exe
```

11. Arguments:

```text
-ExecutionPolicy Bypass -File C:\104thXP\scripts\run-api.ps1
```

12. Start in:

```text
C:\104thXP
```

In **Settings**:

- Enable **Allow task to be run on demand**.
- Enable **Run task as soon as possible after a scheduled start is missed**.
- If the task fails, restart every `1 minute`.
- Attempt restart `3` times.
- Do not enable **Stop the task if it runs longer than...**.

Start it manually:

```powershell
Start-ScheduledTask -TaskName "LeaderboardAPI"
```

Check task state:

```powershell
Get-ScheduledTask -TaskName "LeaderboardAPI"
Get-ScheduledTaskInfo -TaskName "LeaderboardAPI"
```

Stop it:

```powershell
Stop-ScheduledTask -TaskName "LeaderboardAPI"
```

Restart it:

```powershell
Stop-ScheduledTask -TaskName "LeaderboardAPI"
Start-ScheduledTask -TaskName "LeaderboardAPI"
```

Check logs:

```powershell
Get-Content C:\104thXP\logs\api-err.log -Tail 100
Get-Content C:\104thXP\logs\api-out.log -Tail 100
```

## 12. Optional Alternative: PM2

If you later want a Node-specific process manager, PM2 can run the API and restart it after crashes. This is optional.

Install:

```powershell
npm install -g pm2
```

Start the API:

```powershell
cd C:\104thXP
pm2 start C:\104thXP\server\index.js --name LeaderboardAPI
pm2 save
```

PM2 startup on Windows usually requires an extra helper package or a scheduled task. For this project, plain Task Scheduler is simpler and has fewer moving parts.

## 13. Install Cloudflare Tunnel on Windows

Download `cloudflared.exe` and place it here:

```text
C:\cloudflared\cloudflared.exe
```

Open PowerShell as Administrator:

```powershell
cd C:\cloudflared
.\cloudflared.exe tunnel login
```

This opens a browser. Log in to Cloudflare and choose your domain.

Create a tunnel:

```powershell
.\cloudflared.exe tunnel create 104th-leaderboard
```

Cloudflare will create a credentials file under your user profile, usually:

```text
C:\Users\YOURUSER\.cloudflared\<tunnel-id>.json
```

Create the config folder:

```powershell
mkdir C:\Windows\System32\config\systemprofile\.cloudflared
```

Create:

```text
C:\Windows\System32\config\systemprofile\.cloudflared\config.yml
```

Copy the tunnel credentials JSON into the same service profile folder:

```powershell
Copy-Item "C:\Users\YOURUSER\.cloudflared\<tunnel-id>.json" "C:\Windows\System32\config\systemprofile\.cloudflared\<tunnel-id>.json"
```

Example:

```yaml
tunnel: 104th-leaderboard
credentials-file: C:/Windows/System32/config/systemprofile/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: leaderboard.yourdomain.com
    service: http://127.0.0.1:3000
  - service: http_status:404
```

Route DNS:

```powershell
.\cloudflared.exe tunnel route dns 104th-leaderboard leaderboard.yourdomain.com
```

Install the Windows service:

```powershell
.\cloudflared.exe service install
```

Start it:

```powershell
Start-Service cloudflared
Get-Service cloudflared
```

If it fails to start, run the tunnel manually with the same config so the real error prints in PowerShell:

```powershell
.\cloudflared.exe --config "C:\Windows\System32\config\systemprofile\.cloudflared\config.yml" tunnel run 104th-leaderboard
```

If the manual command works but `Start-Service cloudflared` fails, reinstall the service after the config and credentials file are in place:

```powershell
Stop-Service cloudflared -ErrorAction SilentlyContinue
.\cloudflared.exe service uninstall
.\cloudflared.exe service install
Start-Service cloudflared
Get-Service cloudflared
```

Then inspect the installed service command:

```powershell
sc.exe qc cloudflared
```

The service runs as `LocalSystem`, so it must be able to read:

```text
C:\Windows\System32\config\systemprofile\.cloudflared\config.yml
C:\Windows\System32\config\systemprofile\.cloudflared\<tunnel-id>.json
```

Also check the Windows service configuration and recent application log entries:

```powershell
sc.exe qc cloudflared
Get-WinEvent -LogName Application -MaxEvents 50 | Where-Object { $_.ProviderName -like "*cloudflared*" } | Format-List TimeCreated,ProviderName,Message
```

Test:

```powershell
curl.exe https://leaderboard.yourdomain.com/api/health
curl.exe https://leaderboard.yourdomain.com/api/leaderboard
```

If the service cannot find the credentials file, copy the credentials JSON into the system profile `.cloudflared` folder and update `credentials-file`:

```text
C:\Windows\System32\config\systemprofile\.cloudflared\<tunnel-id>.json
```

Then restart:

```powershell
Restart-Service cloudflared
```

## 14. Cloudflare Settings

In Cloudflare:

1. Set SSL/TLS mode to `Full`.
2. Keep the DNS record proxied.
3. Add a cache rule for:

```text
https://leaderboard.yourdomain.com/api/leaderboard*
```

Use:

```text
Eligible for cache: yes
Edge TTL: 2-5 seconds
Browser TTL: 0-5 seconds
```

Do not cache anything user-specific.

Optional security rules:

- Rate limit `/api/leaderboard`.
- Challenge suspicious traffic.
- Block countries you do not expect traffic from if appropriate.
- Do not expose admin tools through this tunnel.

## 15. Point the Frontend at the API

The frontend reads from `VITE_LEADERBOARD_URL`.

For local dev in PowerShell:

```powershell
$env:VITE_LEADERBOARD_URL="http://127.0.0.1:3000/api/leaderboard"
npm run dev
```

For a production build in PowerShell:

```powershell
$env:VITE_LEADERBOARD_URL="https://leaderboard.yourdomain.com/api/leaderboard"
npm run build
```

If deploying with GitHub Actions, set:

```text
VITE_LEADERBOARD_URL=https://leaderboard.yourdomain.com/api/leaderboard
```

The current hook appends a cache-busting query parameter. That is okay while testing, but Cloudflare caching works better if the frontend stops adding `?t=${Date.now()}` after the API is live and returning cache headers.

Recommended live settings:

```text
Frontend poll interval: 5-10 seconds
API memory cache: 2-5 seconds
Cloudflare cache: 2-5 seconds
```

The current frontend polls every 60 seconds. That is very light. Reduce it only after the API cache is working.

## 16. Manual Deployment on Windows

From PowerShell:

```powershell
cd C:\104thXP
git pull
npm ci
npm run build
Stop-ScheduledTask -TaskName "LeaderboardAPI"
Start-ScheduledTask -TaskName "LeaderboardAPI"
```

If the frontend is hosted on GitHub Pages, the Windows server only needs to run:

```text
Postgres
Discord bot
LeaderboardAPI
cloudflared
```

Recommended split:

```text
www.yourdomain.com
  -> GitHub Pages frontend

leaderboard.yourdomain.com
  -> Cloudflare Tunnel
  -> Windows API
```

## 17. Backups on Windows

Backups matter. The server can be rebuilt, but XP history cannot.

Create a backup folder:

```powershell
mkdir C:\104thXP\backups
```

Create:

```text
C:\104thXP\scripts\backup-db.ps1
```

Script:

```powershell
$ErrorActionPreference = "Stop"

$pgDump = "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe"
$backupDir = "C:\104thXP\backups"
$date = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$plainFile = "$backupDir\leaderboard_$date.sql"
$zipFile = "$plainFile.zip"

New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

& $pgDump -U postgres -d leaderboard -f $plainFile
Compress-Archive -Path $plainFile -DestinationPath $zipFile
Remove-Item $plainFile

Get-ChildItem $backupDir -Filter "leaderboard_*.sql.zip" |
  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-14) } |
  Remove-Item
```

If your Postgres version is not 16, update the `$pgDump` path.

Test it:

```powershell
powershell.exe -ExecutionPolicy Bypass -File C:\104thXP\scripts\backup-db.ps1
dir C:\104thXP\backups
```

If `pg_dump` asks for a password, create a password file for the Windows user running the backup:

```text
%APPDATA%\postgresql\pgpass.conf
```

Example line:

```text
127.0.0.1:5432:leaderboard:postgres:your_postgres_password
```

Lock down the file permissions so only that Windows user can read it.

## 18. Schedule Nightly Backups

Use Task Scheduler:

1. Open **Task Scheduler**.
2. Choose **Create Task**.
3. Name it `LeaderboardDatabaseBackup`.
4. Select **Run whether user is logged on or not**.
5. Select **Run with highest privileges**.
6. Trigger: daily at `03:15`.
7. Action: start a program.
8. Program:

```text
powershell.exe
```

9. Arguments:

```text
-ExecutionPolicy Bypass -File C:\104thXP\scripts\backup-db.ps1
```

Also keep at least one off-machine backup:

- External USB drive
- Another computer on your network
- Encrypted cloud storage
- Private storage bucket

## 19. Restore a Backup

Unzip the backup first. Then restore into an empty database.

PowerShell:

```powershell
Expand-Archive C:\104thXP\backups\leaderboard_YYYY-MM-DD_HH-mm-ss.sql.zip C:\104thXP\restore
```

Restore:

```powershell
psql -U postgres -d leaderboard -f C:\104thXP\restore\leaderboard_YYYY-MM-DD_HH-mm-ss.sql
```

To test restore safely, create a test database:

```powershell
createdb -U postgres leaderboard_restore_test
psql -U postgres -d leaderboard_restore_test -f C:\104thXP\restore\leaderboard_YYYY-MM-DD_HH-mm-ss.sql
dropdb -U postgres leaderboard_restore_test
```

Test restores occasionally. A backup you have never restored is only a guess.

## 20. Monitoring Commands

Scheduled task and services:

```powershell
Get-ScheduledTask -TaskName "LeaderboardAPI"
Get-ScheduledTaskInfo -TaskName "LeaderboardAPI"
Get-Service cloudflared
Get-Service *postgres*
```

Ports:

```powershell
netstat -ano | findstr :3000
netstat -ano | findstr :5432
```

API:

```powershell
curl.exe http://127.0.0.1:3000/api/health
curl.exe http://127.0.0.1:3000/api/leaderboard
curl.exe https://leaderboard.yourdomain.com/api/leaderboard
```

Logs:

```powershell
Get-Content C:\104thXP\logs\api-err.log -Tail 100
Get-Content C:\104thXP\logs\api-out.log -Tail 100
```

Database size:

```powershell
psql -U postgres -d leaderboard -c "SELECT pg_size_pretty(pg_database_size('leaderboard'));"
```

Top rows:

```powershell
psql -U postgres -d leaderboard -c "SELECT name, designation, console, xp FROM leaderboard ORDER BY xp DESC LIMIT 10;"
```

System:

```powershell
Get-PSDrive C
Get-Process node
Get-Process cloudflared
```

## 21. Performance Notes

Your Windows server specs are enough for this if the API is cached.

The likely bottlenecks are:

1. Home upload bandwidth
2. Too many uncached requests
3. Large JSON responses
4. Missing database index

Keep the public response small:

```json
{
  "lastUpdated": "2026-07-11T12:00:00.000Z",
  "season": "Season 1",
  "players": [
    {
      "id": "123",
      "displayName": "CT-7567",
      "callsign": "CT-1001",
      "platform": "pc",
      "xp": 38200,
      "level": 48
    }
  ]
}
```

Avoid sending:

- Full score history
- Discord profile blobs
- Large avatars
- Unneeded metadata
- Thousands of players on the first page

Recommended limits:

```text
Top leaderboard: 100 players
API cache: 3 seconds
Cloudflare cache: 3 seconds
Frontend polling: 5-10 seconds
```

## 22. Common Failure Cases

### Website cannot reach the API

Check:

```powershell
Get-ScheduledTaskInfo -TaskName "LeaderboardAPI"
Get-Service cloudflared
curl.exe http://127.0.0.1:3000/api/health
curl.exe https://leaderboard.yourdomain.com/api/health
```

### Cloudflare route gives 502

Usually the tunnel is up but the local API is down or listening on the wrong host/port.

Check:

```powershell
netstat -ano | findstr :3000
Get-Content C:\104thXP\logs\api-err.log -Tail 100
```

The API should listen on:

```text
127.0.0.1:3000
```

### Database login fails

Check:

- `.env` `DATABASE_URL`
- Password
- Postgres service status
- `pg_hba.conf`
- Whether Postgres is listening on `127.0.0.1:5432`

Manual test:

```powershell
psql "postgres://leaderboard_api:password@127.0.0.1:5432/leaderboard"
```

### API user can write

This is a security problem.

Connect as `postgres`:

```powershell
psql -U postgres -d leaderboard
```

Revoke write permissions:

```sql
REVOKE INSERT, UPDATE, DELETE ON leaderboard FROM leaderboard_api;
GRANT SELECT ON leaderboard TO leaderboard_api;
```

### Leaderboard is stale

Check:

- Is the bot writing to Postgres?
- Is the bot using total XP or XP increments?
- Is the API memory cache too long?
- Is Cloudflare cache too long?
- Is the frontend still pointing at GitHub raw JSON?
- Is `VITE_LEADERBOARD_URL` set during the frontend build?

## 23. Production Checklist

Before announcing the site:

- [ ] Postgres listens only on localhost.
- [ ] No router port forwarding is required.
- [ ] Cloudflare Tunnel is running as a Windows service.
- [ ] Public API exposes only read endpoints.
- [ ] Public API uses the `leaderboard_api` read-only database user.
- [ ] Discord bot uses the `leaderboard_bot` database user.
- [ ] `/api/leaderboard` returns the expected JSON shape.
- [ ] Frontend uses `VITE_LEADERBOARD_URL` pointing to the API.
- [ ] API response has `Cache-Control`.
- [ ] Cloudflare cache rule is active.
- [ ] API starts after reboot.
- [ ] Discord bot starts after reboot.
- [ ] Nightly backups are running.
- [ ] At least one backup is stored off the server.
- [ ] You have tested restoring a backup.
- [ ] Logs are checked after deployment.

## 24. Recommended Final Setup

Use this layout:

```text
GitHub repo
  -> frontend source
  -> API source
  -> setup docs

GitHub Pages
  -> hosts the React frontend
  -> fetches VITE_LEADERBOARD_URL

Cloudflare
  -> DNS
  -> Tunnel
  -> small cache on /api/leaderboard

Windows 11 server
  -> Discord bot
  -> Postgres
  -> LeaderboardAPI on 127.0.0.1:3000
  -> cloudflared Windows service
  -> scheduled database backups
```

This avoids the need for a VPS, avoids the need for a static IP, keeps writes private, and lets many visitors read a small cached leaderboard with very little load on the server.
