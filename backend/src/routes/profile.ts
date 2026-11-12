import { Hono } from 'hono';
import { RadiusService, DeviceInfo } from '../services/radius.service.js';
import { PasspointService } from '../services/passpoint.service.js';

export const profileRouter = new Hono();

/**
 * GET /api/profile/connection-status
 * Experiment 3: Profile State vs. Active Connection Detection
 * Returns:
 * - CONNECTED (Active 802.1X link in FreeRADIUS radacct with acctstoptime IS NULL)
 * - CONFIGURED_NOT_CONNECTED (Profile installed in DB, but no active RADIUS session)
 * - NOT_CONFIGURED (No active profile)
 */
profileRouter.get('/connection-status', async (c) => {
  const token = c.req.query('token');
  const deviceId = c.req.query('deviceId') || c.req.header('x-device-id');

  const queryTarget = token || deviceId;
  if (!queryTarget) {
    return c.json({
      state: 'NOT_CONFIGURED',
      message: 'Missing deviceId or token parameter.',
    }, 400);
  }

  const status = await RadiusService.getConnectionStatus(queryTarget);
  return c.json(status, 200);
});

/**
 * POST /api/profile/simulate-session
 * Testing & Simulation endpoint: Starts or stops a simulated FreeRADIUS accounting session
 * for physical device testing without needing an active live hardware AP.
 */
profileRouter.post('/simulate-session', async (c) => {
  try {
    const body = await c.req.json();
    const { username, action, ipAddress, macAddress } = body;
    if (!username || !action) {
      return c.json({ success: false, error: 'MISSING_PARAMS', message: 'username and action (start|stop) required' }, 400);
    }

    const result = await RadiusService.simulateRadiusSession(username, action, ipAddress, macAddress);
    return c.json({ success: true, ...result });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message }, 500);
  }
});

/**
 * GET /api/profile/ios-passpoint
 * Serves the Apple .mobileconfig Configuration Profile.
 * Strictly Idempotent: Does NOT regenerate or mutate FreeRADIUS credentials (Experiment 9).
 */
profileRouter.get('/ios-passpoint', async (c) => {
  const token = c.req.query('token');
  const idempotencyKey = c.req.header('idempotency-key');

  if (!token) {
    return c.text('Unauthorized: Missing profile download token.', 401);
  }

  const subscriber = await RadiusService.getSubscriberByToken(token, idempotencyKey);
  if (!subscriber) {
    return c.text(
      'Unauthorized or Expired: The download link is invalid or has expired. Please re-authenticate.',
      401
    );
  }

  const xmlContent = PasspointService.generateAppleMobileConfig(subscriber);

  // Set explicit Apple Configuration Profile headers
  c.header('Content-Type', 'application/x-apple-aspen-config; charset=utf-8');
  c.header('Content-Disposition', 'attachment; filename="venue-passpoint.mobileconfig"');
  c.header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  c.header('Pragma', 'no-cache');

  return c.body(xmlContent, 200);
});

/**
 * GET /api/profile/android-connect
 * Serves the Wi-Fi bundle with Content-Type: application/x-wifi-config
 * and Content-Transfer-Encoding: base64 containing the standard OMA-DM SyncML PPS-MO XML.
 * Strictly Idempotent (Experiment 9).
 */
profileRouter.get('/android-connect', async (c) => {
  const token = c.req.query('token');
  const idempotencyKey = c.req.header('idempotency-key');

  if (!token) {
    return c.text('Unauthorized: Missing profile download token.', 401);
  }

  const subscriber = await RadiusService.getSubscriberByToken(token, idempotencyKey);
  if (!subscriber) {
    return c.text(
      'Unauthorized or Expired: The download link is invalid or has expired. Please re-authenticate.',
      401
    );
  }

  const base64Payload = PasspointService.generateAndroidPasspointXml(subscriber);

  // Set explicit Android OS interception headers
  c.header('Content-Type', 'application/x-wifi-config');
  c.header('Content-Transfer-Encoding', 'base64');
  c.header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  c.header('Pragma', 'no-cache');

  return c.body(base64Payload, 200);
});

/**
 * GET /api/profile/android-config
 * Returns JSON payload for native Android PasspointConfiguration and WifiNetworkSuggestion builders.
 * Strictly Idempotent: Repeated/concurrent requests return identical active credentials (Experiment 9).
 */
profileRouter.get('/android-config', async (c) => {
  const token = c.req.query('token');
  const idempotencyKey = c.req.header('idempotency-key');

  if (!token) {
    return c.json({ success: false, error: 'UNAUTHORIZED', message: 'Missing profile download token.' }, 401);
  }

  const subscriber = await RadiusService.getSubscriberByToken(token, idempotencyKey);
  if (!subscriber) {
    return c.json(
      { success: false, error: 'EXPIRED_OR_INVALID', message: 'Download token is invalid or expired.' },
      401
    );
  }

  const androidConfig = PasspointService.generateAndroidPasspointConfig(subscriber);

  return c.json(
    {
      success: true,
      data: androidConfig,
    },
    200
  );
});

/**
 * POST /api/profile/revoke
 * Safely revokes credentials in DB and disables FreeRADIUS radcheck entry (Experiment 6).
 */
profileRouter.post('/revoke', async (c) => {
  const tokenQuery = c.req.query('token');
  let tokenBody: string | undefined;
  try {
    const body = await c.req.json();
    tokenBody = body?.token || body?.subscriberId || body?.downloadToken;
  } catch {}

  const target = tokenQuery || tokenBody;
  if (!target) {
    return c.json({ success: false, error: 'MISSING_PARAM', message: 'Token or subscriberId is required.' }, 400);
  }

  const success = await RadiusService.revokeSubscriber(target);
  if (!success) {
    return c.json({ success: false, error: 'NOT_FOUND', message: 'Subscriber profile not found or already revoked.' }, 404);
  }

  return c.json({ success: true, message: 'Subscriber credentials successfully revoked from FreeRADIUS.' });
});

/**
 * POST /api/profile/reissue
 * Re-issues a fresh profile for the customer device, safely expiring the prior profile (Experiment 6).
 */
profileRouter.post('/reissue', async (c) => {
  try {
    const body = await c.req.json();
    let identifier = (body.identifier || body.phone || body.email || '').trim();
    if (!identifier) {
      return c.json({ success: false, error: 'MISSING_IDENTIFIER', message: 'Identifier is required.' }, 400);
    }

    const type = identifier.includes('@') ? 'email' : 'phone';
    const clientDevice: DeviceInfo = {
      deviceId: body.deviceId || c.req.header('x-device-id'),
      deviceName: body.deviceName,
      platform: body.platform || 'generic_web',
      userAgent: body.userAgent || c.req.header('user-agent'),
      ipAddress: c.req.header('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1',
    };

    const result = await RadiusService.reissueSubscriber(identifier, type, clientDevice);

    return c.json({
      success: true,
      message: 'Fresh Passpoint profile issued. Prior credentials safely revoked from FreeRADIUS.',
      subscriber: result.subscriber ? {
        id: result.subscriber.id,
        username: result.subscriber.username,
        realm: result.subscriber.realm,
        expirationTime: result.subscriber.expirationTime,
      } : undefined,
      downloadToken: result.downloadToken,
      endpoints: result.endpoints,
    });
  } catch (error: any) {
    console.error('[Error in /api/profile/reissue]', error);
    return c.json({ success: false, error: 'INTERNAL_ERROR', message: error?.message }, 500);
  }
});

/**
 * GET /api/profile/status
 * Quick health and metadata check endpoint.
 */
profileRouter.get('/status', (c) => {
  return c.json({
    status: 'online',
    passpointSupported: true,
    release: 'Passpoint Release 2 (Hotspot 2.0)',
    eapType: 'EAP-TTLS (21) / MSCHAPv2',
  });
});
