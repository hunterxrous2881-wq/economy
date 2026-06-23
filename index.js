import "dotenv/config";
import { Client, Events, GatewayIntentBits } from "discord.js";
import { getGuildSettings } from "./db.js";
import {
  balanceCommand,
  coinflipCommand,
  slotsCommand,
  blackjackCommand,
  shopCommand,
  buyCommand,
  sellCommand,
  addMoneyCommand,
  addItemCommand,
  removeItemCommand,
  setPrefixCommand,
  setIconCommand,
  setFontCommand,
  setBgCommand,
  helpCommand,
} from "./commands.js";

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("❌ DISCORD_TOKEN is not set. Please add it to your environment variables.");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set. Please add a PostgreSQL connection string.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
  console.log(`📡 Serving ${c.guilds.cache.size} guild(s)`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (!message.guildId) return;

  let settings;
  try {
    settings = await getGuildSettings(message.guildId);
  } catch (err) {
    console.error("DB error fetching settings:", err);
    return;
  }

  const prefix = settings?.prefix ?? "!";
  if (!message.content.startsWith(prefix)) return;

  const withoutPrefix = message.content.slice(prefix.length).trim();
  const parts = withoutPrefix.split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  try {
    switch (command) {
      case "balance": case "bal":    await balanceCommand(message, args); break;
      case "coinflip": case "cf":   await coinflipCommand(message, args); break;
      case "slots":                 await slotsCommand(message, args); break;
      case "blackjack": case "bj":  await blackjackCommand(message, args); break;
      case "shop":                  await shopCommand(message, args); break;
      case "buy":                   await buyCommand(message, args); break;
      case "sell":                  await sellCommand(message, args); break;
      case "addmoney": case "addbal": await addMoneyCommand(message, args); break;
      case "additem":               await addItemCommand(message, args); break;
      case "removeitem": case "delitem": await removeItemCommand(message, args); break;
      case "setprefix":             await setPrefixCommand(message, args); break;
      case "seticon":               await setIconCommand(message, args); break;
      case "setfont":               await setFontCommand(message, args); break;
      case "setbg":                 await setBgCommand(message, args); break;
      case "help":                  await helpCommand(message, args); break;
    }
  } catch (err) {
    console.error(`Error handling command "${command}":`, err);
    await message.reply({ content: "⚠️ An error occurred. Please try again." }).catch(() => {});
  }
});

client.on(Events.Error, (err) => {
  console.error("Discord client error:", err);
});

client.login(token);
