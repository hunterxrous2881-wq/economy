import { EmbedBuilder } from "discord.js";

export function buildEmbed(settings, title, description, color) {
  return new EmbedBuilder()
    .setTitle(`${settings.commandIcon} ${title}`)
    .setDescription(description)
    .setColor(color ?? parseColor(settings.bgColor))
    .setTimestamp();
}

function parseColor(hex) {
  const cleaned = hex.replace("#", "");
  const parsed = parseInt(cleaned, 16);
  return isNaN(parsed) ? 0x2f3136 : parsed;
}

export function formatMoney(amount, settings) {
  return `${settings.currencySymbol} **${Number(amount).toLocaleString()}** ${settings.currencyName}`;
}

export function applyFont(text, fontStyle) {
  switch (fontStyle) {
    case "bold": return `**${text}**`;
    case "italic": return `*${text}*`;
    case "mono": return `\`${text}\``;
    case "bold-italic": return `***${text}***`;
    default: return text;
  }
}
