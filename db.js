import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { eq, and } from "drizzle-orm";
import {
  balancesTable,
  guildSettingsTable,
  shopItemsTable,
  inventoryTable,
} from "./schema.js";

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool);

export async function getBalance(userId, guildId) {
  const [row] = await db
    .select()
    .from(balancesTable)
    .where(and(eq(balancesTable.userId, userId), eq(balancesTable.guildId, guildId)));
  return row?.balance ?? 0;
}

export async function setBalance(userId, guildId, amount) {
  const existing = await db
    .select()
    .from(balancesTable)
    .where(and(eq(balancesTable.userId, userId), eq(balancesTable.guildId, guildId)));

  if (existing.length > 0) {
    await db
      .update(balancesTable)
      .set({ balance: amount })
      .where(and(eq(balancesTable.userId, userId), eq(balancesTable.guildId, guildId)));
  } else {
    await db.insert(balancesTable).values({ userId, guildId, balance: amount });
  }
}

export async function addBalance(userId, guildId, amount) {
  const current = await getBalance(userId, guildId);
  const newBal = Math.max(0, current + amount);
  await setBalance(userId, guildId, newBal);
  return newBal;
}

export async function getGuildSettings(guildId) {
  const [row] = await db
    .select()
    .from(guildSettingsTable)
    .where(eq(guildSettingsTable.guildId, guildId));

  if (row) return row;

  const [created] = await db
    .insert(guildSettingsTable)
    .values({ guildId })
    .returning();
  return created;
}

export async function updateGuildSettings(guildId, updates) {
  await getGuildSettings(guildId);
  const [updated] = await db
    .update(guildSettingsTable)
    .set(updates)
    .where(eq(guildSettingsTable.guildId, guildId))
    .returning();
  return updated;
}

export async function getShopItems(guildId) {
  return db
    .select()
    .from(shopItemsTable)
    .where(and(eq(shopItemsTable.guildId, guildId), eq(shopItemsTable.active, true)));
}

export async function getShopItem(guildId, itemId) {
  const [row] = await db
    .select()
    .from(shopItemsTable)
    .where(and(eq(shopItemsTable.guildId, guildId), eq(shopItemsTable.id, itemId)));
  return row ?? null;
}

export async function addShopItem(guildId, name, description, price, roleId, stock) {
  const [item] = await db
    .insert(shopItemsTable)
    .values({ guildId, name, description, price, roleId: roleId ?? null, stock: stock ?? -1 })
    .returning();
  return item;
}

export async function removeShopItem(guildId, itemId) {
  const [row] = await db
    .update(shopItemsTable)
    .set({ active: false })
    .where(and(eq(shopItemsTable.guildId, guildId), eq(shopItemsTable.id, itemId)))
    .returning();
  return !!row;
}

export async function addInventoryItem(userId, guildId, itemId) {
  const [existing] = await db
    .select()
    .from(inventoryTable)
    .where(
      and(
        eq(inventoryTable.userId, userId),
        eq(inventoryTable.guildId, guildId),
        eq(inventoryTable.itemId, itemId)
      )
    );

  if (existing) {
    await db
      .update(inventoryTable)
      .set({ quantity: existing.quantity + 1 })
      .where(eq(inventoryTable.id, existing.id));
  } else {
    await db.insert(inventoryTable).values({ userId, guildId, itemId, quantity: 1 });
  }
}

export async function getInventory(userId, guildId) {
  return db
    .select()
    .from(inventoryTable)
    .where(and(eq(inventoryTable.userId, userId), eq(inventoryTable.guildId, guildId)));
}

export { balancesTable, guildSettingsTable, shopItemsTable, inventoryTable, eq, and };
