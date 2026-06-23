import { pgTable, text, serial, bigint, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const balancesTable = pgTable("balances", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  guildId: text("guild_id").notNull(),
  balance: bigint("balance", { mode: "number" }).notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const guildSettingsTable = pgTable("guild_settings", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull().unique(),
  prefix: text("prefix").notNull().default("!"),
  commandIcon: text("command_icon").notNull().default("💰"),
  fontStyle: text("font_style").notNull().default("normal"),
  bgColor: text("bg_color").notNull().default("#2f3136"),
  currencyName: text("currency_name").notNull().default("coins"),
  currencySymbol: text("currency_symbol").notNull().default("🪙"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const shopItemsTable = pgTable("shop_items", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  price: bigint("price", { mode: "number" }).notNull(),
  roleId: text("role_id"),
  stock: integer("stock").default(-1),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const inventoryTable = pgTable("inventory", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  guildId: text("guild_id").notNull(),
  itemId: integer("item_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull().defaultNow(),
});
