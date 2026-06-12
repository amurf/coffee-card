import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core"
import type { StoreProfileModel, LoyaltyCardModel, PendingRedemptionModel } from "../model"

// Helper types from Zod definitions in StoreProfile
type ThemeOptions = NonNullable<StoreProfileModel["themeOptions"]>
type RewardRules = NonNullable<StoreProfileModel["rewardRules"]>
type PosConfig = NonNullable<StoreProfileModel["posConfig"]>

export const stores = sqliteTable("stores", {
  id: text("id").primaryKey(), // UUID
  name: text("name").unique().notNull(), // storeName (acts as PK in DynamoDB)
  location: text("location").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  themeOptions: text("theme_options", { mode: "json" }).$type<ThemeOptions>(),
  rewardRules: text("reward_rules", { mode: "json" }).$type<RewardRules>(),
  posType: text("pos_type").$type<"SHOPIFY" | "SQUARE" | "LIGHTSPEED" | "NONE">().default("NONE").notNull(),
  posConfig: text("pos_config", { mode: "json" }).$type<PosConfig>(),
  merchantPasscode: text("merchant_passcode"),
})

export const loyaltyCards = sqliteTable("loyalty_cards", {
  id: text("id").primaryKey(), // cardId
  storeName: text("store_name")
    .notNull()
    .references(() => stores.name, { onDelete: "cascade" }),
  issueDate: text("issue_date").notNull(), // ISO Date string
  stampCount: integer("stamp_count").default(0).notNull(),
  totalStampsEarned: integer("total_stamps_earned").default(0).notNull(),
  redeemedMilestones: text("redeemed_milestones", { mode: "json" }).$type<string[]>().default([]).notNull(),
})

export const pendingRedemptions = sqliteTable("pending_redemptions", {
  token: text("token").primaryKey(),
  cardId: text("card_id")
    .notNull()
    .references(() => loyaltyCards.id, { onDelete: "cascade" }),
  milestoneId: text("milestone_id").notNull(),
  expiresAt: integer("expires_at").notNull(), // Unix timestamp (seconds or ms)
})

export const processedOrders = sqliteTable("processed_orders", {
  orderId: text("order_id").primaryKey(),
  storeName: text("store_name")
    .notNull()
    .references(() => stores.name, { onDelete: "cascade" }),
  cardId: text("card_id")
    .notNull()
    .references(() => loyaltyCards.id, { onDelete: "cascade" }),
  stampsAwarded: integer("stamps_awarded").notNull(),
  createdAt: text("created_at").notNull(), // ISO Date string
})
