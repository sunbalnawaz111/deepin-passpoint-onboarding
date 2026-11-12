import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import { config } from './config.js';
import { initDatabase } from './db/index.js';
import { authRouter, accountRouter } from './routes/auth.js';
import { profileRouter } from './routes/profile.js';

const app = new Hono();

// Global Middlewares
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: (origin) => {
      // Explicitly allow Capacitor webview origins (https://localhost, http://localhost, capacitor://localhost)
      // and LAN requests from local mobile devices
      if (!origin || origin === 'null') return '*';
      return origin;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-device-id', 'x-venue-id', 'idempotency-key'],
    exposeHeaders: ['Content-Disposition', 'Content-Type'],
  })
);

// Fallback JSON Error Handler
app.onError((err, c) => {
  console.error('[Unhandled Server Error]', err);
  return c.json(
    {
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected internal error occurred on the server.',
    },
    500
  );
});

// Fallback JSON 404 Handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: 'NOT_FOUND',
      message: `API endpoint '${c.req.method} ${c.req.path}' does not exist.`,
    },
    404
  );
});

// Mount Sub-routers
app.route('/api/auth', authRouter);
app.route('/api/account', accountRouter);
app.route('/api/profile', profileRouter);

// Root / Health
app.get('/', (c) => {
  return c.json({
    service: 'Wi-Fi Passpoint (Hotspot 2.0) Provisioning Gateway',
    version: '1.0.0',
    status: 'healthy',
    documentation: {
      auth: {
        sendOtp: 'POST /api/auth/send-otp',
        verifyOtp: 'POST /api/auth/verify-otp',
      },
      profile: {
        iosPasspoint: 'GET /api/profile/ios-passpoint?token=:token',
        androidConfig: 'GET /api/profile/android-config?token=:token',
        status: 'GET /api/profile/status',
      },
    },
  });
});

// Bootstrap Database and Start Server
async function main() {
  await initDatabase();

  serve(
    {
      fetch: app.fetch,
      port: config.port,
      hostname: '0.0.0.0', // Must NOT be 'localhost' or '127.0.0.1' to allow external LAN devices
    },
    (info) => {
      console.log(`\n========================================================`);
      console.log(`  Wi-Fi Passpoint Provisioning Backend running on:`);
      console.log(`  http://0.0.0.0:${info.port} (LAN: http://192.168.18.193:${info.port})`);
      console.log(`  Environment: ${config.nodeEnv}`);
      console.log(`========================================================\n`);
    }
  );
}

main().catch((err) => {
  console.error('[Fatal Error starting server]', err);
  process.exit(1);
});

