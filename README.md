# Discord Economy Bot — Railway Deploy

## Files
- `index.js` — main bot entry point
- `commands.js` — all bot commands
- `db.js` — database helpers
- `embed.js` — embed/formatting helpers
- `schema.js` — Drizzle ORM schema (optional, for drizzle-kit)
- `setup.js` — run once to create DB tables
- `package.json` — dependencies

## Deploy on Railway

### 1. Create a new Railway project
Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
(or drag-and-drop these files)

### 2. Add a PostgreSQL database
In your Railway project → Add Service → Database → PostgreSQL
Railway will automatically set `DATABASE_URL` for you.

### 3. Set environment variables
In Railway → your service → Variables, add:

| Variable | Value |
|---|---|
| `DISCORD_TOKEN` | Your bot token |
| `DISCORD_CLIENT_ID` | Your app's client ID |
| `BOT_OWNER_ID` | Your Discord user ID |

`DATABASE_URL` is set automatically by Railway when you add Postgres.

### 4. Create the database tables
In Railway → your service → Shell (or run locally with DATABASE_URL set):
```
node setup.js
```

### 5. Set the start command
Railway will use `npm start` which runs `node index.js` automatically.

## Commands

| Command | Description |
|---|---|
| `!balance [@user]` | Check balance |
| `!coinflip <amount\|all>` | Flip a coin |
| `!slots <amount\|all>` | Spin the slots |
| `!blackjack <amount\|all>` | Play blackjack |
| `!shop` | Browse shop |
| `!buy <id>` | Buy item |
| `!sell <id>` | Sell item (50% back) |
| `!help` | Show all commands |

**Owner only:**

| Command | Description |
|---|---|
| `!addmoney @user <amount>` | Give/remove coins |
| `!additem <price> <name> [--role @r] [--stock N]` | Add shop item |
| `!removeitem <id>` | Remove shop item |
| `!setprefix <prefix>` | Change prefix |
| `!seticon <emoji>` | Change embed icon |
| `!setfont <style>` | Font: normal/bold/italic/mono/bold-italic |
| `!setbg <#hex>` | Change embed color |
