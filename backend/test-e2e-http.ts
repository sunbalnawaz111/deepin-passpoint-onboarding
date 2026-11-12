import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRouter } from './src/routes/auth.js';
import { profileRouter } from './src/routes/profile.js';
import { initDatabase } from './src/db/index.js';

const app = new Hono();
app.use('*', cors());
app.route('/api/auth', authRouter);
app.route('/api/profile', profileRouter);

async function testHttp() {
  await initDatabase();

  const server = serve({
    fetch: app.fetch,
    port: 3999,
  });

  const baseUrl = 'http://localhost:3999';

  const testEmail = `vip-guest-${Date.now()}@example.com`;

  console.log('[E2E HTTP] 1. Requesting OTP via POST /api/auth/send-otp for ' + testEmail);
  const sendRes = await fetch(`${baseUrl}/api/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: testEmail,
      type: 'email',
    }),
  });

  const sendData = (await sendRes.json()) as any;
  console.log('Send OTP status:', sendRes.status, sendData);

  if (!sendData.success || !sendData.mockCode) {
    throw new Error('Failed /api/auth/send-otp');
  }

  console.log('\n[E2E HTTP] 2. Verifying OTP via POST /api/auth/verify-otp');
  const verifyRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: testEmail,
      code: sendData.mockCode,
      deviceInfo: {
        platform: 'ios',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)',
      },
    }),
  });

  const verifyData = (await verifyRes.json()) as any;
  console.log('Verify OTP status:', verifyRes.status, verifyData);
  if (!verifyData.success || !verifyData.downloadToken) {
    throw new Error('Failed /api/auth/verify-otp');
  }

  console.log('\n[E2E HTTP] 3. Fetching Apple .mobileconfig via GET /api/profile/ios-passpoint');
  const iosRes = await fetch(`${baseUrl}/api/profile/ios-passpoint?token=${verifyData.downloadToken}`);
  console.log('iOS Response status:', iosRes.status);
  console.log('iOS Content-Type header:', iosRes.headers.get('content-type'));
  console.log('iOS Content-Disposition header:', iosRes.headers.get('content-disposition'));
  const iosBody = await iosRes.text();
  console.log('iOS Body preview (first 200 chars):\n', iosBody.substring(0, 200));

  if (iosRes.headers.get('content-type') !== 'application/x-apple-aspen-config; charset=utf-8') {
    throw new Error('Incorrect iOS MIME type header!');
  }
  if (!iosRes.headers.get('content-disposition')?.includes('venue-passpoint.mobileconfig')) {
    throw new Error('Incorrect iOS Content-Disposition header filename!');
  }

  console.log('\n[E2E HTTP] 4. Fetching Android System Intercept Bundle via GET /api/profile/android-connect');
  const androidConnectRes = await fetch(`${baseUrl}/api/profile/android-connect?token=${verifyData.downloadToken}`);
  console.log('Android Connect Response status:', androidConnectRes.status);
  console.log('Android Connect Content-Type:', androidConnectRes.headers.get('content-type'));
  console.log('Android Connect Content-Transfer-Encoding:', androidConnectRes.headers.get('content-transfer-encoding'));
  console.log('Android Connect Content-Disposition:', androidConnectRes.headers.get('content-disposition'));

  if (androidConnectRes.headers.get('content-type') !== 'application/x-wifi-config') {
    throw new Error('Incorrect Android Content-Type header for system interception!');
  }
  if (androidConnectRes.headers.get('content-transfer-encoding') !== 'base64') {
    throw new Error('Missing or incorrect Content-Transfer-Encoding: base64 header!');
  }
  if (androidConnectRes.headers.get('content-disposition')) {
    throw new Error('Content-Disposition header should be omitted to prevent treating as a normal file download!');
  }

  const base64Body = await androidConnectRes.text();
  const decodedXml = Buffer.from(base64Body, 'base64').toString('utf-8');
  console.log('Decoded Android OMA-DM XML preview (first 250 chars):\n', decodedXml.substring(0, 250));

  if (!decodedXml.includes('<NodeName>PerProviderSubscription</NodeName>') || !decodedXml.includes('<NodeName>EAPType</NodeName>') || !decodedXml.includes('<Value>21</Value>')) {
    throw new Error('Invalid OMA-DM SyncML PPS-MO XML payload decoded from Android connect endpoint!');
  }

  console.log('\n[E2E HTTP] 5. Fetching Android config via GET /api/profile/android-config');
  const androidRes = await fetch(`${baseUrl}/api/profile/android-config?token=${verifyData.downloadToken}`);
  const androidData = (await androidRes.json()) as any;
  console.log('Android Response status:', androidRes.status, androidData);

  if (!androidData.success || !androidData.data.homeSp) {
    throw new Error('Failed /api/profile/android-config');
  }

  console.log('\n>>> FULL HTTP E2E CYCLE VERIFIED SUCCESSFULLY! <<<');
  server.closeAllConnections?.();
  server.close();
}

testHttp().catch((err) => {
  console.error('[E2E HTTP Error]', err);
  process.exit(1);
});
