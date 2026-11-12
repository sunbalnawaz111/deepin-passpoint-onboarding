import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * Customers Table (Phone PK)
 * Links Customer (phone PK) -> Devices[] -> Passpoint Profiles[] -> FreeRADIUS Credentials[]
 */
export const customers = sqliteTable('customers', {
  phone: text('phone').primaryKey(), // E.164 phone primary key e.g. +14155552671
  id: text('id').notNull().unique(), // Internal UUID
  name: text('name'),
  status: text('status', { enum: ['active', 'suspended', 'recovery_required'] }).notNull().default('active'),
  highValueAsset: integer('high_value_asset', { mode: 'boolean' }).notNull().default(false),
  recoveryRequired: integer('recovery_required', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Legacy/Alternative Users Table
 * Preserved for email authentication and backwards compatibility
 */
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull().unique(), // E.164 phone or lowercase email
  type: text('type', { enum: ['phone', 'email'] }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Devices Table
 * A customer can register multiple devices (e.g. Phone A, Phone B) under the same verified phone number
 */
export const devices = sqliteTable('devices', {
  id: text('id').primaryKey(),
  customerPhone: text('customer_phone').notNull().references(() => customers.phone, { onDelete: 'cascade', onUpdate: 'cascade' }),
  deviceId: text('device_id').notNull(), // Persistent Client Device UUID (x-device-id)
  deviceName: text('device_name'), // Friendly name e.g. "Phone A", "Pixel 7"
  platform: text('platform', { enum: ['ios', 'android', 'macos', 'windows', 'generic_web'] }).notNull(),
  subscriberId: text('subscriber_id'), // Backward-compatible foreign key
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  lastSeenAt: integer('last_seen_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Passpoint Subscribers Table (Network Profiles)
 * Each device receives its own independent subscriber username/password (sub_xxxx)
 */
export const subscribers = sqliteTable('subscribers', {
  id: text('id').primaryKey(),
  userId: text('user_id'), // Backward-compatible foreign key to users.id
  customerPhone: text('customer_phone').references(() => customers.phone, { onDelete: 'cascade', onUpdate: 'cascade' }),
  deviceId: text('device_id').references(() => devices.id, { onDelete: 'cascade' }),
  username: text('username').notNull().unique(), // RADIUS username, e.g. sub_a9f14...
  password: text('password').notNull(), // RADIUS cleartext or NT-Hash secret
  realm: text('realm').notNull(), // e.g. wifi.example.com
  status: text('status', { enum: ['active', 'revoked', 'expired'] }).notNull().default('active'),
  expirationTime: integer('expiration_time', { mode: 'timestamp' }).notNull(),
  downloadToken: text('download_token').notNull().unique(), // Short-lived token for profile download
  tokenExpiresAt: integer('token_expires_at', { mode: 'timestamp' }).notNull(),
  idempotencyKey: text('idempotency_key'),
  lastIdempotencyAt: integer('last_idempotency_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/**
 * FreeRADIUS radcheck Table
 * Production-standard FreeRADIUS SQL AAA check/credentials table
 */
export const radcheck = sqliteTable('radcheck', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  subscriberId: text('subscriber_id').references(() => subscribers.id, { onDelete: 'cascade' }),
  username: text('username').notNull(),
  attribute: text('attribute').notNull().default('Cleartext-Password'),
  op: text('op').notNull().default(':='),
  value: text('value').notNull(),
});

/**
 * FreeRADIUS radacct Table (Experiment 3: Live Connection Detection)
 * Production-standard FreeRADIUS SQL AAA accounting session table
 */
export const radacct = sqliteTable('radacct', {
  radacctid: integer('radacctid').primaryKey({ autoIncrement: true }),
  acctsessionid: text('acctsessionid').notNull(),
  acctuniqueid: text('acctuniqueid').notNull().unique(),
  username: text('username').notNull(),
  nasipaddress: text('nasipaddress'),
  nasportid: text('nasportid'),
  acctstarttime: integer('acctstarttime', { mode: 'timestamp' }),
  acctupdatetime: integer('acctupdatetime', { mode: 'timestamp' }),
  acctstoptime: integer('acctstoptime', { mode: 'timestamp' }), // NULL when session is active!
  acctsessiontime: integer('acctsessiontime').default(0),
  callingstationid: text('callingstationid'), // Client Wi-Fi MAC
  framedipaddress: text('framedipaddress'), // Assigned IP lease
});

/**
 * Venue Visits / Interactions Table (Experiment 2)
 * Records venue interactions without re-provisioning duplicate network profiles
 */
export const venueVisits = sqliteTable('venue_visits', {
  id: text('id').primaryKey(),
  customerPhone: text('customer_phone').notNull().references(() => customers.phone, { onDelete: 'cascade', onUpdate: 'cascade' }),
  deviceId: text('device_id').references(() => devices.id),
  venueId: text('venue_id').notNull(),
  visitedAt: integer('visited_at', { mode: 'timestamp' }).notNull(),
});

/**
 * OTP Verification Challenges Table (Experiments 7 & 8)
 * Enforces cooldown, challenge replacement, and rate-limiting lockout
 */
export const otps = sqliteTable('otps', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  codeHash: text('code_hash').notNull(),
  plainCodeDemo: text('plain_code_demo'), // Stored for mock/demo convenience during review
  attempts: integer('attempts').notNull().default(0),
  status: text('status', { enum: ['pending', 'verified', 'locked', 'invalidated'] }).notNull().default('pending'),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  verifiedAt: integer('verified_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type User = typeof users.$inferSelect;
export type Device = typeof devices.$inferSelect;
export type Subscriber = typeof subscribers.$inferSelect;
export type Radcheck = typeof radcheck.$inferSelect;
export type Radacct = typeof radacct.$inferSelect;
export type VenueVisit = typeof venueVisits.$inferSelect;
export type Otp = typeof otps.$inferSelect;
