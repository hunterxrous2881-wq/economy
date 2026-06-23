import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from "discord.js";
import {
  getBalance, addBalance, setBalance,
  getGuildSettings, updateGuildSettings,
  getShopItems, getShopItem, addShopItem, removeShopItem,
  addInventoryItem, getInventory,
  db, shopItemsTable, inventoryTable, eq, and,
} from "./db.js";
import { buildEmbed, formatMoney, applyFont } from "./embed.js";

const OWNER_ID = process.env.BOT_OWNER_ID ?? "";

// ─── BALANCE ────────────────────────────────────────────────────────────────
export async function balanceCommand(message, args) {
  const guildId = message.guildId;
  const settings = await getGuildSettings(guildId);
  const target = message.mentions.users.first() ?? message.author;
  const balance = await getBalance(target.id, guildId);
  const title = applyFont("Balance", settings.fontStyle);
  await message.reply({
    embeds: [buildEmbed(settings, title, `${target.username}'s balance: ${formatMoney(balance, settings)}`, 0x5865f2)],
  });
}

// ─── COINFLIP ───────────────────────────────────────────────────────────────
export async function coinflipCommand(message, args) {
  const guildId = message.guildId;
  const settings = await getGuildSettings(guildId);
  const betStr = args[0];
  if (!betStr) {
    await message.reply({ embeds: [buildEmbed(settings, "Coinflip", "Usage: `coinflip <amount|all>`", 0xff0000)] });
    return;
  }
  const balance = await getBalance(message.author.id, guildId);
  const bet = betStr.toLowerCase() === "all" ? balance : parseInt(betStr, 10);
  if (isNaN(bet) || bet <= 0) {
    await message.reply({ embeds: [buildEmbed(settings, "Coinflip", "❌ Invalid bet amount.", 0xff0000)] });
    return;
  }
  if (bet > balance) {
    await message.reply({ embeds: [buildEmbed(settings, "Coinflip", `❌ Not enough ${settings.currencyName}! Balance: ${formatMoney(balance, settings)}`, 0xff0000)] });
    return;
  }
  const win = Math.random() < 0.5;
  const newBalance = await addBalance(message.author.id, guildId, win ? bet : -bet);
  const title = applyFont("Coinflip", settings.fontStyle);
  const desc = win
    ? `🟡 **Heads!** You won ${formatMoney(bet, settings)}!\nNew balance: ${formatMoney(newBalance, settings)}`
    : `⚫ **Tails!** You lost ${formatMoney(bet, settings)}.\nNew balance: ${formatMoney(newBalance, settings)}`;
  await message.reply({ embeds: [buildEmbed(settings, title, desc, win ? 0xffd700 : 0xff4444)] });
}

// ─── SLOTS ──────────────────────────────────────────────────────────────────
const SYMBOLS = ["🍒", "🍋", "🍊", "🍇", "⭐", "💎", "7️⃣"];
const PAYOUTS = { "💎": 10, "7️⃣": 7, "⭐": 5, "🍇": 3, "🍊": 2, "🍋": 1.5, "🍒": 1.2 };

export async function slotsCommand(message, args) {
  const guildId = message.guildId;
  const settings = await getGuildSettings(guildId);
  const betStr = args[0];
  if (!betStr) {
    await message.reply({ embeds: [buildEmbed(settings, "Slots", "Usage: `slots <amount|all>`", 0xff0000)] });
    return;
  }
  const balance = await getBalance(message.author.id, guildId);
  const bet = betStr.toLowerCase() === "all" ? balance : parseInt(betStr, 10);
  if (isNaN(bet) || bet <= 0) {
    await message.reply({ embeds: [buildEmbed(settings, "Slots", "❌ Invalid bet amount.", 0xff0000)] });
    return;
  }
  if (bet > balance) {
    await message.reply({ embeds: [buildEmbed(settings, "Slots", `❌ Not enough ${settings.currencyName}!`, 0xff0000)] });
    return;
  }
  const reels = [
    SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
    SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
    SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
  ];
  const [a, b, c] = reels;
  const slotDisplay = `[ ${a} | ${b} | ${c} ]`;
  let multiplier = 0;
  let outcome = "";
  if (a === b && b === c) {
    multiplier = PAYOUTS[a] ?? 2;
    outcome = `🎰 **JACKPOT!** All three match! ${multiplier}x multiplier!`;
  } else if (a === b || b === c || a === c) {
    multiplier = 0.5;
    outcome = `✨ Two matching symbols! 0.5x multiplier.`;
  } else {
    outcome = `😔 No match. Better luck next time!`;
  }
  const winAmount = Math.floor(bet * multiplier);
  const change = multiplier > 0 ? winAmount : -bet;
  const newBalance = await addBalance(message.author.id, guildId, change);
  const title = applyFont("Slots", settings.fontStyle);
  const desc = [
    `**${slotDisplay}**`, ``,
    outcome,
    multiplier > 0 ? `You won ${formatMoney(winAmount, settings)}!` : `You lost ${formatMoney(bet, settings)}.`,
    `New balance: ${formatMoney(newBalance, settings)}`,
  ].join("\n");
  await message.reply({ embeds: [buildEmbed(settings, title, desc, multiplier > 0 ? 0xffd700 : 0xff4444)] });
}

// ─── BLACKJACK ──────────────────────────────────────────────────────────────
function createDeck() {
  const suits = ["♠️", "♥️", "♦️", "♣️"];
  const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  return suits.flatMap(s => values.map(v => ({ suit: s, value: v }))).sort(() => Math.random() - 0.5);
}
function cardValue(card) {
  if (["J", "Q", "K"].includes(card.value)) return 10;
  if (card.value === "A") return 11;
  return parseInt(card.value, 10);
}
function handValue(hand) {
  let total = hand.reduce((s, c) => s + cardValue(c), 0);
  let aces = hand.filter(c => c.value === "A").length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}
function displayHand(hand, hideSecond = false) {
  if (hideSecond) return `${hand[0].value}${hand[0].suit} | ❓`;
  return hand.map(c => `${c.value}${c.suit}`).join(" | ");
}

export async function blackjackCommand(message, args) {
  const guildId = message.guildId;
  const settings = await getGuildSettings(guildId);
  const betStr = args[0];
  if (!betStr) {
    await message.reply({ embeds: [buildEmbed(settings, "Blackjack", "Usage: `blackjack <amount|all>`", 0xff0000)] });
    return;
  }
  const balance = await getBalance(message.author.id, guildId);
  let bet = betStr.toLowerCase() === "all" ? balance : parseInt(betStr, 10);
  if (isNaN(bet) || bet <= 0) {
    await message.reply({ embeds: [buildEmbed(settings, "Blackjack", "❌ Invalid bet.", 0xff0000)] });
    return;
  }
  if (bet > balance) {
    await message.reply({ embeds: [buildEmbed(settings, "Blackjack", `❌ Not enough ${settings.currencyName}!`, 0xff0000)] });
    return;
  }
  const deck = createDeck();
  const playerHand = [deck.pop(), deck.pop()];
  const dealerHand = [deck.pop(), deck.pop()];

  const buildDesc = (hideDealer, status) => {
    const lines = [
      `**Your hand:** ${displayHand(playerHand)} (${handValue(playerHand)})`,
      `**Dealer hand:** ${displayHand(dealerHand, hideDealer)}${hideDealer ? "" : ` (${handValue(dealerHand)})`}`,
    ];
    if (status) lines.push(`\n${status}`);
    return lines.join("\n");
  };

  const title = applyFont("Blackjack", settings.fontStyle);

  if (handValue(playerHand) === 21) {
    const winAmount = Math.floor(bet * 1.5);
    const newBalance = await addBalance(message.author.id, guildId, winAmount);
    await message.reply({
      embeds: [buildEmbed(settings, title, buildDesc(false, `🃏 **Blackjack!** You win ${formatMoney(winAmount, settings)}!\nNew balance: ${formatMoney(newBalance, settings)}`), 0xffd700)],
    });
    return;
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("bj_hit").setLabel("Hit").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("bj_stand").setLabel("Stand").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("bj_double").setLabel("Double Down").setStyle(ButtonStyle.Danger).setDisabled(balance < bet * 2),
  );

  const reply = await message.reply({
    embeds: [buildEmbed(settings, title, buildDesc(true), 0x5865f2)],
    components: [row],
  });

  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: i => i.user.id === message.author.id,
    time: 60000,
  });

  let finished = false;
  const endGame = async (reason, color) => {
    if (finished) return;
    finished = true;
    collector.stop();
    await reply.edit({ embeds: [buildEmbed(settings, title, buildDesc(false, reason), color)], components: [] });
  };

  collector.on("collect", async interaction => {
    await interaction.deferUpdate();
    if (interaction.customId === "bj_hit" || interaction.customId === "bj_double") {
      if (interaction.customId === "bj_double") bet *= 2;
      playerHand.push(deck.pop());
      const pv = handValue(playerHand);
      if (pv > 21) {
        const newBalance = await addBalance(message.author.id, guildId, -bet);
        await endGame(`💥 **Bust!** You went over 21.\nLost ${formatMoney(bet, settings)}.\nNew balance: ${formatMoney(newBalance, settings)}`, 0xff4444);
        return;
      }
      if (pv === 21 || interaction.customId === "bj_double") {
        interaction.customId = "bj_stand";
      } else {
        await reply.edit({ embeds: [buildEmbed(settings, title, buildDesc(true), 0x5865f2)], components: [row] });
        return;
      }
    }
    if (interaction.customId === "bj_stand") {
      while (handValue(dealerHand) < 17) dealerHand.push(deck.pop());
      const pv = handValue(playerHand);
      const dv = handValue(dealerHand);
      if (dv > 21 || pv > dv) {
        const newBalance = await addBalance(message.author.id, guildId, bet);
        await endGame(`🏆 **You win!** Dealer: ${dv}, You: ${pv}.\nWon ${formatMoney(bet, settings)}!\nNew balance: ${formatMoney(newBalance, settings)}`, 0x00ff88);
      } else if (pv === dv) {
        await endGame(`🤝 **Push!** Tie at ${pv}. Bet returned.\nBalance: ${formatMoney(balance, settings)}`, 0xffaa00);
      } else {
        const newBalance = await addBalance(message.author.id, guildId, -bet);
        await endGame(`😞 **Dealer wins!** Dealer: ${dv}, You: ${pv}.\nLost ${formatMoney(bet, settings)}.\nNew balance: ${formatMoney(newBalance, settings)}`, 0xff4444);
      }
    }
  });

  collector.on("end", async (_, reason) => {
    if (reason === "time" && !finished) { finished = true; await reply.edit({ components: [] }); }
  });
}

// ─── SHOP ───────────────────────────────────────────────────────────────────
export async function shopCommand(message, args) {
  const guildId = message.guildId;
  const settings = await getGuildSettings(guildId);
  const items = await getShopItems(guildId);
  const title = applyFont("Shop", settings.fontStyle);
  if (items.length === 0) {
    await message.reply({ embeds: [buildEmbed(settings, title, "🛒 The shop is empty. Owner can add items with `additem`.", 0x5865f2)] });
    return;
  }
  const desc = items.map(item => {
    const stockStr = item.stock === -1 || item.stock === null ? "∞" : `${item.stock} left`;
    return [
      `**[${item.id}] ${item.name}** — ${formatMoney(item.price, settings)}`,
      item.description ? `> ${item.description}` : null,
      `> Stock: ${stockStr}${item.roleId ? " | 🎭 Grants role" : ""}`,
    ].filter(Boolean).join("\n");
  }).join("\n\n");
  await message.reply({ embeds: [buildEmbed(settings, title, desc, 0x5865f2)] });
}

// ─── BUY ────────────────────────────────────────────────────────────────────
export async function buyCommand(message, args) {
  const guildId = message.guildId;
  const settings = await getGuildSettings(guildId);
  const itemId = parseInt(args[0], 10);
  if (isNaN(itemId)) {
    await message.reply({ embeds: [buildEmbed(settings, "Buy", "Usage: `buy <item_id>`", 0xff0000)] });
    return;
  }
  const item = await getShopItem(guildId, itemId);
  if (!item) {
    await message.reply({ embeds: [buildEmbed(settings, "Buy", "❌ Item not found.", 0xff0000)] });
    return;
  }
  if (item.stock === 0) {
    await message.reply({ embeds: [buildEmbed(settings, "Buy", "❌ Out of stock!", 0xff0000)] });
    return;
  }
  const balance = await getBalance(message.author.id, guildId);
  if (balance < item.price) {
    await message.reply({ embeds: [buildEmbed(settings, "Buy", `❌ Not enough ${settings.currencyName}!\nCost: ${formatMoney(item.price, settings)}\nBalance: ${formatMoney(balance, settings)}`, 0xff0000)] });
    return;
  }
  await addBalance(message.author.id, guildId, -item.price);
  if (item.stock !== null && item.stock !== -1) {
    await db.update(shopItemsTable).set({ stock: item.stock - 1 }).where(and(eq(shopItemsTable.guildId, guildId), eq(shopItemsTable.id, itemId)));
  }
  await addInventoryItem(message.author.id, guildId, itemId);
  if (item.roleId && message.guild) {
    try { await message.member.roles.add(item.roleId); } catch {}
  }
  const newBalance = await getBalance(message.author.id, guildId);
  const title = applyFont("Purchase Successful", settings.fontStyle);
  await message.reply({
    embeds: [buildEmbed(settings, title, `✅ Bought **${item.name}** for ${formatMoney(item.price, settings)}!${item.roleId ? "\n🎭 Role assigned!" : ""}\nNew balance: ${formatMoney(newBalance, settings)}`, 0x00ff88)],
  });
}

// ─── SELL ───────────────────────────────────────────────────────────────────
export async function sellCommand(message, args) {
  const guildId = message.guildId;
  const settings = await getGuildSettings(guildId);
  const itemId = parseInt(args[0], 10);
  if (isNaN(itemId)) {
    await message.reply({ embeds: [buildEmbed(settings, "Sell", "Usage: `sell <item_id>`", 0xff0000)] });
    return;
  }
  const [invEntry] = await db.select().from(inventoryTable).where(
    and(eq(inventoryTable.userId, message.author.id), eq(inventoryTable.guildId, guildId), eq(inventoryTable.itemId, itemId))
  );
  if (!invEntry || invEntry.quantity < 1) {
    await message.reply({ embeds: [buildEmbed(settings, "Sell", "❌ You don't own this item.", 0xff0000)] });
    return;
  }
  const item = await getShopItem(guildId, itemId);
  if (!item) {
    await message.reply({ embeds: [buildEmbed(settings, "Sell", "❌ Item not found.", 0xff0000)] });
    return;
  }
  const sellPrice = Math.floor(item.price * 0.5);
  if (invEntry.quantity <= 1) {
    await db.delete(inventoryTable).where(eq(inventoryTable.id, invEntry.id));
  } else {
    await db.update(inventoryTable).set({ quantity: invEntry.quantity - 1 }).where(eq(inventoryTable.id, invEntry.id));
  }
  const newBalance = await addBalance(message.author.id, guildId, sellPrice);
  if (item.roleId && invEntry.quantity <= 1 && message.guild) {
    try { await message.member.roles.remove(item.roleId); } catch {}
  }
  const title = applyFont("Sold!", settings.fontStyle);
  await message.reply({
    embeds: [buildEmbed(settings, title, `✅ Sold **${item.name}** for ${formatMoney(sellPrice, settings)} (50% of buy price).\nNew balance: ${formatMoney(newBalance, settings)}`, 0x00ff88)],
  });
}

// ─── ADD MONEY (owner) ──────────────────────────────────────────────────────
export async function addMoneyCommand(message, args) {
  if (message.author.id !== OWNER_ID) { await message.reply({ content: "❌ Owner-only command." }); return; }
  const guildId = message.guildId;
  const settings = await getGuildSettings(guildId);
  const target = message.mentions.users.first();
  if (!target) {
    await message.reply({ embeds: [buildEmbed(settings, "Add Money", "Usage: `addmoney @user <amount>`", 0xff0000)] });
    return;
  }
  const amount = parseInt(args.find(a => !a.startsWith("<")), 10);
  if (isNaN(amount)) {
    await message.reply({ embeds: [buildEmbed(settings, "Add Money", "❌ Invalid amount.", 0xff0000)] });
    return;
  }
  const newBalance = await addBalance(target.id, guildId, amount);
  const title = applyFont("Money Added", settings.fontStyle);
  await message.reply({
    embeds: [buildEmbed(settings, title, `${amount >= 0 ? "Added" : "Removed"} ${formatMoney(Math.abs(amount), settings)} ${amount >= 0 ? "to" : "from"} **${target.username}**.\nNew balance: ${formatMoney(newBalance, settings)}`, 0x00ff88)],
  });
}

// ─── ADD ITEM (owner) ───────────────────────────────────────────────────────
export async function addItemCommand(message, args) {
  if (message.author.id !== OWNER_ID) { await message.reply({ content: "❌ Owner-only command." }); return; }
  const guildId = message.guildId;
  const settings = await getGuildSettings(guildId);
  if (args.length < 2) {
    await message.reply({ embeds: [buildEmbed(settings, "Add Item", "Usage: `additem <price> <name> [desc] [--role @role] [--stock N]`", 0xff0000)] });
    return;
  }
  const price = parseInt(args[0], 10);
  if (isNaN(price) || price < 0) {
    await message.reply({ embeds: [buildEmbed(settings, "Add Item", "❌ Invalid price.", 0xff0000)] });
    return;
  }
  let roleId;
  let stock = -1;
  const filteredArgs = [...args.slice(1)];
  const roleIndex = filteredArgs.indexOf("--role");
  if (roleIndex !== -1) {
    const roleMention = message.mentions.roles.first();
    if (roleMention) roleId = roleMention.id;
    filteredArgs.splice(roleIndex, 2);
  }
  const stockIndex = filteredArgs.indexOf("--stock");
  if (stockIndex !== -1) {
    const sv = parseInt(filteredArgs[stockIndex + 1], 10);
    if (!isNaN(sv)) stock = sv;
    filteredArgs.splice(stockIndex, 2);
  }
  const name = filteredArgs[0];
  const description = filteredArgs.slice(1).join(" ");
  if (!name) {
    await message.reply({ embeds: [buildEmbed(settings, "Add Item", "❌ Item name required.", 0xff0000)] });
    return;
  }
  const item = await addShopItem(guildId, name, description, price, roleId, stock);
  const title = applyFont("Item Added", settings.fontStyle);
  await message.reply({
    embeds: [buildEmbed(settings, title, `✅ **${item.name}** added!\nID: \`${item.id}\`\nPrice: ${formatMoney(price, settings)}\n${description ? `Description: ${description}\n` : ""}${roleId ? `Role: <@&${roleId}>\n` : ""}Stock: ${stock === -1 ? "Unlimited" : stock}`, 0x00ff88)],
  });
}

// ─── REMOVE ITEM (owner) ────────────────────────────────────────────────────
export async function removeItemCommand(message, args) {
  if (message.author.id !== OWNER_ID) { await message.reply({ content: "❌ Owner-only command." }); return; }
  const guildId = message.guildId;
  const settings = await getGuildSettings(guildId);
  const itemId = parseInt(args[0], 10);
  if (isNaN(itemId)) {
    await message.reply({ embeds: [buildEmbed(settings, "Remove Item", "Usage: `removeitem <item_id>`", 0xff0000)] });
    return;
  }
  const success = await removeShopItem(guildId, itemId);
  const title = applyFont("Remove Item", settings.fontStyle);
  await message.reply({
    embeds: [buildEmbed(settings, title, success ? `✅ Item \`${itemId}\` removed.` : `❌ Item \`${itemId}\` not found.`, success ? 0x00ff88 : 0xff0000)],
  });
}

// ─── SET PREFIX (owner) ─────────────────────────────────────────────────────
export async function setPrefixCommand(message, args) {
  if (message.author.id !== OWNER_ID) { await message.reply({ content: "❌ Owner-only command." }); return; }
  const guildId = message.guildId;
  const settings = await getGuildSettings(guildId);
  const newPrefix = args[0];
  if (!newPrefix || newPrefix.length > 5) {
    await message.reply({ embeds: [buildEmbed(settings, "Set Prefix", "Usage: `setprefix <prefix>` (max 5 chars)", 0xff0000)] });
    return;
  }
  await updateGuildSettings(guildId, { prefix: newPrefix });
  await message.reply({ embeds: [buildEmbed(settings, applyFont("Prefix Updated", settings.fontStyle), `✅ Prefix changed to \`${newPrefix}\``, 0x00ff88)] });
}

// ─── SET ICON (owner) ───────────────────────────────────────────────────────
export async function setIconCommand(message, args) {
  if (message.author.id !== OWNER_ID) { await message.reply({ content: "❌ Owner-only command." }); return; }
  const guildId = message.guildId;
  const settings = await getGuildSettings(guildId);
  const icon = args[0];
  if (!icon) {
    await message.reply({ embeds: [buildEmbed(settings, "Set Icon", "Usage: `seticon <emoji>`", 0xff0000)] });
    return;
  }
  await updateGuildSettings(guildId, { commandIcon: icon });
  await message.reply({ embeds: [buildEmbed(settings, applyFont("Icon Updated", settings.fontStyle), `✅ Icon changed to ${icon}`, 0x00ff88)] });
}

// ─── SET FONT (owner) ───────────────────────────────────────────────────────
const VALID_FONTS = ["normal", "bold", "italic", "mono", "bold-italic"];
export async function setFontCommand(message, args) {
  if (message.author.id !== OWNER_ID) { await message.reply({ content: "❌ Owner-only command." }); return; }
  const guildId = message.guildId;
  const settings = await getGuildSettings(guildId);
  const font = args[0]?.toLowerCase();
  if (!font || !VALID_FONTS.includes(font)) {
    await message.reply({ embeds: [buildEmbed(settings, "Set Font", `Usage: \`setfont <style>\`\nStyles: \`${VALID_FONTS.join("`, `")}\``, 0xff0000)] });
    return;
  }
  await updateGuildSettings(guildId, { fontStyle: font });
  await message.reply({ embeds: [buildEmbed(settings, applyFont("Font Updated", font), `✅ Font style changed to \`${font}\`\nPreview: ${applyFont("This is how text looks!", font)}`, 0x00ff88)] });
}

// ─── SET BG (owner) ─────────────────────────────────────────────────────────
export async function setBgCommand(message, args) {
  if (message.author.id !== OWNER_ID) { await message.reply({ content: "❌ Owner-only command." }); return; }
  const guildId = message.guildId;
  const settings = await getGuildSettings(guildId);
  const color = args[0];
  if (!color || !/^#?([0-9a-fA-F]{6})$/.test(color)) {
    await message.reply({ embeds: [buildEmbed(settings, "Set Background", "Usage: `setbg <#hex>`\nExample: `setbg #ff6600`", 0xff0000)] });
    return;
  }
  const normalized = color.startsWith("#") ? color : `#${color}`;
  await updateGuildSettings(guildId, { bgColor: normalized });
  await message.reply({ embeds: [buildEmbed({ ...settings, bgColor: normalized }, applyFont("Background Updated", settings.fontStyle), `✅ Embed color changed to \`${normalized}\``, 0x00ff88)] });
}

// ─── HELP ───────────────────────────────────────────────────────────────────
export async function helpCommand(message, args) {
  const guildId = message.guildId;
  const settings = await getGuildSettings(guildId);
  const p = settings.prefix;
  const isOwner = message.author.id === OWNER_ID;
  const title = applyFont("Economy Bot — Help", settings.fontStyle);
  const economy = [
    `\`${p}balance [@user]\` — Check balance (alias: \`${p}bal\`)`,
    `\`${p}coinflip <amount|all>\` — Bet on a coin flip`,
    `\`${p}slots <amount|all>\` — Spin the slot machine`,
    `\`${p}blackjack <amount|all>\` — Play blackjack (alias: \`${p}bj\`)`,
    `\`${p}shop\` — Browse the shop`,
    `\`${p}buy <id>\` — Buy an item`,
    `\`${p}sell <id>\` — Sell an item for 50%`,
  ].join("\n");
  const ownerCmds = isOwner ? [
    ``, `**⚙️ Owner Commands**`,
    `\`${p}addmoney @user <amount>\` — Add or remove coins`,
    `\`${p}additem <price> <name> [desc] [--role @r] [--stock N]\` — Add shop item`,
    `\`${p}removeitem <id>\` — Remove a shop item`,
    `\`${p}setprefix <prefix>\` — Change bot prefix`,
    `\`${p}seticon <emoji>\` — Change embed icon`,
    `\`${p}setfont <style>\` — Change font style`,
    `\`${p}setbg <#hex>\` — Change embed color`,
  ].join("\n") : "";
  await message.reply({
    embeds: [buildEmbed(settings, title, `**🎮 Economy Commands**\n${economy}${ownerCmds}`, 0x5865f2)],
  });
}
