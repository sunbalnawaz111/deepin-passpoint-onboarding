import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema.js';
import path from 'path';

const dbPath = process.env.DATABASE_URL || `file:${path.resolve(process.cwd(), 'passpoint.db')}`;

export const client = createClient({
  url: dbPath,
});

export const db = drizzle(client, { schema });

async function safeExecute(sql: string) {
  try {
    await client.execute(sql);
  } catch (err: any) {
    // Ignore harmless migration errors like column or index already exists
  }
}

/**
 * Initializes SQLite database tables and indexes if they do not already exist.
 * Supports hot updates and zero-friction developer setup.
 */
export async function initDatabase() {
  // 1. Customers Table (Phone PK)
  await client.execute(`
    CREATE TABLE IF NOT EXISTS customers (
      phone TEXT PRIMARY KEY,
      id TEXT NOT NULL UNIQUE,
      name TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      high_value_asset INTEGER NOT NULL DEFAULT 0,
      recovery_required INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // 2. Users Table (Identifier / Email backwards compatibility)
  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // 3. Devices Table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      customer_phone TEXT NOT NULL,
      device_id TEXT NOT NULL,
      device_name TEXT,
      platform TEXT NOT NULL,
      subscriber_id TEXT,
      user_agent TEXT,
      ip_address TEXT,
      last_seen_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  // 4. Passpoint Subscribers Table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS subscribers (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      customer_phone TEXT,
      device_id TEXT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      realm TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      expiration_time INTEGER NOT NULL,
      download_token TEXT NOT NULL UNIQUE,
      token_expires_at INTEGER NOT NULL,
      idempotency_key TEXT,
      last_idempotency_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // 5. FreeRADIUS radcheck Table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS radcheck (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subscriber_id TEXT,
      username TEXT NOT NULL,
      attribute TEXT NOT NULL DEFAULT 'Cleartext-Password',
      op TEXT NOT NULL DEFAULT ':=',
      value TEXT NOT NULL
    );
  `);

  // 6. FreeRADIUS radacct Table (Experiment 3: Accounting / Connection State)
  await client.execute(`
    CREATE TABLE IF NOT EXISTS radacct (
      radacctid INTEGER PRIMARY KEY AUTOINCREMENT,
      acctsessionid TEXT NOT NULL,
      acctuniqueid TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL,
      nasipaddress TEXT,
      nasportid TEXT,
      acctstarttime INTEGER,
      acctupdatetime INTEGER,
      acctstoptime INTEGER,
      acctsessiontime INTEGER DEFAULT 0,
      callingstationid TEXT,
      framedipaddress TEXT
    );
  `);

  // 7. Venue Visits Table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS venue_visits (
      id TEXT PRIMARY KEY,
      customer_phone TEXT NOT NULL,
      device_id TEXT,
      venue_id TEXT NOT NULL,
      visited_at INTEGER NOT NULL
    );
  `);

  // 8. OTPs Table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS otps (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      plain_code_demo TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      expires_at INTEGER NOT NULL,
      verified_at INTEGER,
      created_at INTEGER NOT NULL
    );
  `);

  // Check if devices table has old NOT NULL on subscriber_id and migrate if needed
  try {
    const tableInfo = await client.execute(`PRAGMA table_info(devices)`);
    const subCol = tableInfo.rows.find((r: any) => r.name === 'subscriber_id');
    if (subCol && Number(subCol.notnull) === 1) {
      await client.execute(`ALTER TABLE devices RENAME TO devices_old`);
      await client.execute(`
        CREATE TABLE devices (
          id TEXT PRIMARY KEY,
          customer_phone TEXT NOT NULL,
          device_id TEXT NOT NULL,
          device_name TEXT,
          platform TEXT NOT NULL,
          subscriber_id TEXT,
          user_agent TEXT,
          ip_address TEXT,
          last_seen_at INTEGER NOT NULL,
          created_at INTEGER NOT NULL
        );
      `);
      try {
        await client.execute(`
          INSERT INTO devices (id, customer_phone, device_id, device_name, platform, subscriber_id, user_agent, ip_address, last_seen_at, created_at)
          SELECT id, COALESCE(customer_phone, 'unknown'), COALESCE(device_id, id), device_name, platform, subscriber_id, user_agent, ip_address, last_seen_at, created_at FROM devices_old
        `);
      } catch {}
      await client.execute(`DROP TABLE IF EXISTS devices_old`);
    }
  } catch (err: any) {
    // Migration check complete
  }

  // Safe schema evolutions for existing databases
  await safeExecute(`ALTER TABLE customers ADD COLUMN high_value_asset INTEGER NOT NULL DEFAULT 0;`);
  await safeExecute(`ALTER TABLE customers ADD COLUMN recovery_required INTEGER NOT NULL DEFAULT 0;`);
  await safeExecute(`ALTER TABLE devices ADD COLUMN customer_phone TEXT;`);
  await safeExecute(`ALTER TABLE devices ADD COLUMN device_id TEXT;`);
  await safeExecute(`ALTER TABLE devices ADD COLUMN device_name TEXT;`);
  await safeExecute(`ALTER TABLE subscribers ADD COLUMN customer_phone TEXT;`);
  await safeExecute(`ALTER TABLE subscribers ADD COLUMN device_id TEXT;`);
  await safeExecute(`ALTER TABLE subscribers ADD COLUMN idempotency_key TEXT;`);
  await safeExecute(`ALTER TABLE subscribers ADD COLUMN last_idempotency_at INTEGER;`);
  await safeExecute(`ALTER TABLE subscribers ADD COLUMN updated_at INTEGER;`);
  await safeExecute(`ALTER TABLE otps ADD COLUMN status TEXT DEFAULT 'pending';`);
  await safeExecute(`ALTER TABLE radcheck ADD COLUMN subscriber_id TEXT;`);

  // Helpful indexes
  await safeExecute(`CREATE INDEX IF NOT EXISTS idx_devices_phone ON devices(customer_phone);`);
  await safeExecute(`CREATE INDEX IF NOT EXISTS idx_devices_devid ON devices(device_id);`);
  await safeExecute(`CREATE INDEX IF NOT EXISTS idx_subscribers_token ON subscribers(download_token);`);
  await safeExecute(`CREATE INDEX IF NOT EXISTS idx_subscribers_phone ON subscribers(customer_phone);`);
  await safeExecute(`CREATE INDEX IF NOT EXISTS idx_subscribers_device ON subscribers(device_id);`);
  await safeExecute(`CREATE INDEX IF NOT EXISTS idx_radcheck_user ON radcheck(username);`);
  await safeExecute(`CREATE INDEX IF NOT EXISTS idx_radacct_user ON radacct(username);`);
  await safeExecute(`CREATE INDEX IF NOT EXISTS idx_radacct_stop ON radacct(acctstoptime);`);
  await safeExecute(`CREATE INDEX IF NOT EXISTS idx_otps_identifier ON otps(identifier);`);
  await safeExecute(`CREATE INDEX IF NOT EXISTS idx_venue_visits_phone ON venue_visits(customer_phone);`);

  console.log('[Database] SQLite initialized with tables: customers, users, devices, subscribers, radcheck, radacct, venue_visits, otps');
}
