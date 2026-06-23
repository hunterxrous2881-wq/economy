/**
 * Run this once to create the database tables:
 *   node setup.js
 */
import "dotenv/config";
import pg from "pg";

const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

console.log("⏳ Creating tables...");

await client.query(`
  CREATE TABLE IF NOT EXISTS balances (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    balance BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS guild_settings (
    id SERIAL PRIMARY KEY,
    guild_id TEXT NOT NULL UNIQUE,
    prefix TEXT NOT NULL DEFAULT '!',
    command_icon TEXT NOT NULL DEFAULT '💰',
    font_style TEXT NOT NULL DEFAULT 'normal',
    bg_color TEXT NOT NULL DEFAULT '#2f3136',
    currency_name TEXT NOT NULL DEFAULT 'coins',
    currency_symbol TEXT NOT NULL DEFAULT '🪙',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS shop_items (
    id SERIAL PRIMARY KEY,
    guild_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price BIGINT NOT NULL,
    role_id TEXT,
    stock INTEGER DEFAULT -1,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`);

await client.end();
console.log("✅ Database tables created successfully!");
