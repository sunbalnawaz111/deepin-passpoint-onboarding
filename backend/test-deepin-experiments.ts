import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRouter, accountRouter } from './src/routes/auth.js';
import { profileRouter } from './src/routes/profile.js';
import { initDatabase, db } from './src/db/index.js';
import { customers, devices, subscribers, radcheck, radacct, venueVisits, otps } from './src/db/schema.js';
import { eq } from 'drizzle-orm';
import { RadiusService } from './src/services/radius.service.js';

const app = new Hono();
app.use('*', cors());
app.route('/api/auth', authRouter);
app.route('/api/account', accountRouter);
app.route('/api/profile', profileRouter);

async function runValidationExperiments() {
  console.log('\n===============================================================');
  console.log('>>> RUNNING 10 DEEPIN EDGE-CASE VALIDATION EXPERIMENTS <<<');
  console.log('===============================================================\n');

  await initDatabase();

  const server = serve({
    fetch: app.fetch,
    port: 3997,
  });

  const baseUrl = 'http://localhost:3997';

  const customerPhone = `+1415${Math.floor(1000000 + Math.random() * 9000000)}`;
  const deviceId1 = 'device-deepin-iphone-1';
  const deviceId2 = 'device-deepin-pixel-2';
  console.log(`[Setup] Base Customer Phone: ${customerPhone}`);

  let tokenDevice1: string = '';
  let subUserDevice1: string = '';
  let tokenDevice2: string = '';
  let subUserDevice2: string = '';

  // --------------------------------------------------------------------------
  // EXPERIMENT 1: QR Scan & Profile Deduplication (x-device-id)
  // --------------------------------------------------------------------------
  console.log('\n--- [EXPERIMENT 1: QR Scan & Profile Deduplication] ---');
  // 1a. Request OTP
  const send1 = await (await fetch(`${baseUrl}/api/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: customerPhone }),
  })).json() as any;

  if (!send1.success || !send1.mockCode) throw new Error('Exp 1: Failed to send OTP');

  // 1b. Verify OTP on Device 1 with x-device-id header
  const verify1 = await (await fetch(`${baseUrl}/api/auth/verify-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-device-id': deviceId1,
    },
    body: JSON.stringify({
      phone: customerPhone,
      code: send1.mockCode,
      deviceInfo: {
        deviceId: deviceId1,
        deviceName: 'Phone A (iPhone 15)',
        platform: 'ios',
      },
    }),
  })).json() as any;

  if (!verify1.success || !verify1.subscriber) throw new Error('Exp 1: Failed to verify OTP');
  tokenDevice1 = verify1.downloadToken;
  subUserDevice1 = verify1.subscriber.username;
  console.log(`✓ Initial Device A Provisioned: Subscriber=${subUserDevice1}, Token=${tokenDevice1}`);

  // Count records in radcheck
  const radcheckInitial = await RadiusService.getRadcheckEntries(subUserDevice1);
  if (radcheckInitial.length !== 1) throw new Error('Exp 1: Exactly 1 radcheck entry expected');

  // 1c. Scan QR again from same device (simulate re-scan / re-auth)
  await db.update(otps).set({ createdAt: new Date(Date.now() - 70000) }).where(eq(otps.identifier, customerPhone));
  const send1Re = await (await fetch(`${baseUrl}/api/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: customerPhone }),
  })).json() as any;

  const verify1Re = await (await fetch(`${baseUrl}/api/auth/verify-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-device-id': deviceId1,
    },
    body: JSON.stringify({
      phone: customerPhone,
      code: send1Re.mockCode,
      deviceInfo: {
        deviceId: deviceId1,
        platform: 'ios',
      },
    }),
  })).json() as any;

  if (!verify1Re.success || !verify1Re.alreadyProvisioned || verify1Re.status !== 'CONFIGURED') {
    throw new Error('Exp 1: Expected alreadyProvisioned: true and status: CONFIGURED on re-authentication');
  }
  if (verify1Re.subscriber.username !== subUserDevice1) {
    throw new Error(`Exp 1: Username mismatch! Expected ${subUserDevice1}, got ${verify1Re.subscriber.username}`);
  }
  const radcheckAfter = await RadiusService.getRadcheckEntries(subUserDevice1);
  if (radcheckAfter.length !== 1) throw new Error('Exp 1: Duplicate radcheck rows created!');
  console.log('✓ PASS EXPERIMENT 1: Profile deduplicated, existing active profile returned with CONFIGURED status, zero extra rows.');

  // --------------------------------------------------------------------------
  // EXPERIMENT 2: Multi-Venue Recognition & Tracking
  // --------------------------------------------------------------------------
  console.log('\n--- [EXPERIMENT 2: Multi-Venue Recognition] ---');
  // Re-auth at Venue A
  await db.update(otps).set({ createdAt: new Date(Date.now() - 70000) }).where(eq(otps.identifier, customerPhone));
  const send2a = await (await fetch(`${baseUrl}/api/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: customerPhone }),
  })).json() as any;

  const verify2a = await (await fetch(`${baseUrl}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-device-id': deviceId1 },
    body: JSON.stringify({
      phone: customerPhone,
      code: send2a.mockCode,
      venueId: 'venue-deepin-sf-mall',
      deviceInfo: {
        deviceId: deviceId1,
        platform: 'ios',
      },
    }),
  })).json() as any;

  if (!verify2a.success || verify2a.venueVisited !== 'venue-deepin-sf-mall' || !verify2a.venueVisitRecorded) {
    throw new Error('Exp 2: Venue A visit not tracked');
  }

  // Rapid Repeat Scan at Venue A within 10 minutes (Accidental double-scan deduplication)
  await db.update(otps).set({ createdAt: new Date(Date.now() - 70000) }).where(eq(otps.identifier, customerPhone));
  const send2aRepeat = await (await fetch(`${baseUrl}/api/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: customerPhone }),
  })).json() as any;

  const verify2aRepeat = await (await fetch(`${baseUrl}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-device-id': deviceId1 },
    body: JSON.stringify({
      phone: customerPhone,
      code: send2aRepeat.mockCode,
      venueId: 'venue-deepin-sf-mall',
      deviceInfo: {
        deviceId: deviceId1,
        platform: 'ios',
      },
    }),
  })).json() as any;

  if (verify2aRepeat.venueVisitRecorded !== false || verify2aRepeat.venueVisitReason !== 'DUPLICATE_RECENT_SCAN') {
    throw new Error(`Exp 2: Rapid repeat scan at Venue A was not deduplicated! Result: ${JSON.stringify(verify2aRepeat)}`);
  }

  // Visit Venue B (Distinct Venue)
  await db.update(otps).set({ createdAt: new Date(Date.now() - 70000) }).where(eq(otps.identifier, customerPhone));
  const send2b = await (await fetch(`${baseUrl}/api/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: customerPhone }),
  })).json() as any;

  const verify2b = await (await fetch(`${baseUrl}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-device-id': deviceId1 },
    body: JSON.stringify({
      phone: customerPhone,
      code: send2b.mockCode,
      venueId: 'venue-deepin-ny-lounge',
      deviceInfo: {
        deviceId: deviceId1,
        platform: 'ios',
      },
    }),
  })).json() as any;

  if (!verify2b.success || verify2b.venueVisited !== 'venue-deepin-ny-lounge' || !verify2b.venueVisitRecorded) {
    throw new Error('Exp 2: Venue B visit not tracked');
  }
  if (!verify2b.alreadyProvisioned || verify2b.subscriber.username !== subUserDevice1) {
    throw new Error('Exp 2: Profile was incorrectly regenerated when scanning at new venue!');
  }

  const visits = await db.select().from(venueVisits).where(eq(venueVisits.customerPhone, customerPhone));
  if (visits.length !== 2) throw new Error(`Exp 2: Expected exactly 2 venue visits recorded (Venue A once, Venue B once), got ${visits.length}`);
  console.log(`✓ PASS EXPERIMENT 2: Recorded 2 distinct venue visits, deduplicated rapid repeat scan without re-issuing credentials.`);

  // --------------------------------------------------------------------------
  // EXPERIMENT 3: Profile State vs. Active Connection Detection
  // --------------------------------------------------------------------------
  console.log('\n--- [EXPERIMENT 3: Profile State vs. Active Connection Detection] ---');
  // State 3a: Profile installed in DB, but device is NOT connected to AP yet
  const statusPre = await (await fetch(`${baseUrl}/api/profile/connection-status?token=${tokenDevice1}`)).json() as any;
  if (statusPre.state !== 'CONFIGURED_NOT_CONNECTED') {
    throw new Error(`Exp 3: Expected CONFIGURED_NOT_CONNECTED, got ${statusPre.state}`);
  }
  console.log(`✓ Pre-connection state verified: ${statusPre.state} (${statusPre.message})`);

  // State 3b: Device associates with venue AP (RADIUS accounting session starts)
  await (await fetch(`${baseUrl}/api/profile/simulate-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: subUserDevice1,
      action: 'start',
      ipAddress: '10.200.5.88',
      macAddress: 'DC:A6:32:11:22:33',
    }),
  })).json();

  const statusConnected = await (await fetch(`${baseUrl}/api/profile/connection-status?token=${tokenDevice1}`)).json() as any;
  if (statusConnected.state !== 'CONNECTED') {
    throw new Error(`Exp 3: Expected CONNECTED during active session, got ${statusConnected.state}`);
  }
  console.log(`✓ Live connection state verified: ${statusConnected.state} (IP: ${statusConnected.session.framedipaddress})`);

  // State 3c: Session stops (device leaves venue)
  await (await fetch(`${baseUrl}/api/profile/simulate-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: subUserDevice1,
      action: 'stop',
    }),
  })).json();

  const statusPost = await (await fetch(`${baseUrl}/api/profile/connection-status?token=${tokenDevice1}`)).json() as any;
  if (statusPost.state !== 'CONFIGURED_NOT_CONNECTED') {
    throw new Error(`Exp 3: Expected return to CONFIGURED_NOT_CONNECTED, got ${statusPost.state}`);
  }
  console.log('✓ PASS EXPERIMENT 3: Accurately differentiated between CONFIGURED_NOT_CONNECTED and CONNECTED via FreeRADIUS radacct.');

  // --------------------------------------------------------------------------
  // EXPERIMENT 4: Multi-Device Registration (One-to-Many)
  // --------------------------------------------------------------------------
  console.log('\n--- [EXPERIMENT 4: Multi-Device Registration (One-to-Many)] ---');
  await db.update(otps).set({ createdAt: new Date(Date.now() - 70000) }).where(eq(otps.identifier, customerPhone));
  const send4 = await (await fetch(`${baseUrl}/api/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: customerPhone }),
  })).json() as any;

  const verify4 = await (await fetch(`${baseUrl}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-device-id': deviceId2 },
    body: JSON.stringify({
      phone: customerPhone,
      code: send4.mockCode,
      deviceInfo: {
        deviceId: deviceId2,
        deviceName: 'Phone B (Pixel 8)',
        platform: 'android',
      },
    }),
  })).json() as any;

  tokenDevice2 = verify4.downloadToken;
  subUserDevice2 = verify4.subscriber.username;
  console.log(`✓ Second Device B Provisioned: Subscriber=${subUserDevice2}`);

  if (subUserDevice2 === subUserDevice1) {
    throw new Error('Exp 4: Device 2 must have independent subscriber username');
  }

  // Verify single customer row, two devices, two radcheck rows
  const custCount = (await db.select().from(customers).where(eq(customers.phone, customerPhone))).length;
  const devCount = (await db.select().from(devices).where(eq(devices.customerPhone, customerPhone))).length;
  const rad1 = await RadiusService.getRadcheckEntries(subUserDevice1);
  const rad2 = await RadiusService.getRadcheckEntries(subUserDevice2);

  if (custCount !== 1 || devCount !== 2 || rad1.length !== 1 || rad2.length !== 1) {
    throw new Error('Exp 4: Multi-device customer relationship broken');
  }
  console.log('✓ PASS EXPERIMENT 4: Customer (1) -> Devices (2) -> FreeRADIUS Credentials (2) verified.');

  // --------------------------------------------------------------------------
  // EXPERIMENT 5: Recycled SIM / Identity Ownership Conflict Protection
  // --------------------------------------------------------------------------
  console.log('\n--- [EXPERIMENT 5: Recycled SIM / Identity Conflict Protection] ---');
  // Flag customer as high value requiring security recovery for unknown devices
  await RadiusService.setCustomerSecurityFlag(customerPhone, true, true);

  await db.update(otps).set({ createdAt: new Date(Date.now() - 70000) }).where(eq(otps.identifier, customerPhone));
  const send5 = await (await fetch(`${baseUrl}/api/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: customerPhone }),
  })).json() as any;

  // Unknown recycled SIM device attempts sign in
  const verify5Conflict = await (await fetch(`${baseUrl}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-device-id': 'unknown-recycled-device-99' },
    body: JSON.stringify({
      phone: customerPhone,
      code: send5.mockCode,
      deviceInfo: {
        deviceId: 'unknown-recycled-device-99',
        platform: 'android',
      },
    }),
  })).json() as any;

  if (verify5Conflict.status !== 'RECOVERY_REQUIRED' || !verify5Conflict.recoveryRequired) {
    throw new Error(`Exp 5: Expected RECOVERY_REQUIRED status, got ${verify5Conflict.status}`);
  }
  console.log(`✓ Recycled SIM conflict flagged: ${verify5Conflict.message}`);

  // Confirm recovery with explicit user authorization
  await db.update(otps).set({ createdAt: new Date(Date.now() - 70000) }).where(eq(otps.identifier, customerPhone));
  const send5Conf = await (await fetch(`${baseUrl}/api/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: customerPhone }),
  })).json() as any;

  const verify5Resolved = await (await fetch(`${baseUrl}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-device-id': 'unknown-recycled-device-99' },
    body: JSON.stringify({
      phone: customerPhone,
      code: send5Conf.mockCode,
      confirmRecovery: true,
      deviceInfo: {
        deviceId: 'unknown-recycled-device-99',
        platform: 'android',
      },
    }),
  })).json() as any;

  if (!verify5Resolved.success) throw new Error('Exp 5: Authorized recovery failed');
  console.log('✓ PASS EXPERIMENT 5: Recycled SIM flagged with RECOVERY_REQUIRED; safely authorized with confirmation.');

  // --------------------------------------------------------------------------
  // EXPERIMENT 6: Profile Recovery after Deletion / Manual Reissue
  // --------------------------------------------------------------------------
  console.log('\n--- [EXPERIMENT 6: Profile Recovery after Deletion / Manual Reissue] ---');
  // Reissue Device 1 profile (revoking previous subUserDevice1)
  const reissueRes = await (await fetch(`${baseUrl}/api/profile/reissue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: customerPhone,
      deviceId: deviceId1,
      platform: 'ios',
    }),
  })).json() as any;

  if (!reissueRes.success || !reissueRes.subscriber) {
    throw new Error('Exp 6: Re-issue request failed');
  }

  const subUserDevice1New = reissueRes.subscriber.username;
  console.log(`✓ Device 1 Re-issued: New Subscriber=${subUserDevice1New}`);

  // Old subscriber must be deleted from radcheck
  const radOld = await RadiusService.getRadcheckEntries(subUserDevice1);
  if (radOld.length !== 0) {
    throw new Error('Exp 6: Revoked subscriber must not exist in radcheck!');
  }

  // New subscriber must exist in radcheck
  const radNew = await RadiusService.getRadcheckEntries(subUserDevice1New);
  if (radNew.length !== 1) {
    throw new Error('Exp 6: New subscriber must be present in radcheck');
  }
  console.log('✓ PASS EXPERIMENT 6: Zombie credentials removed from radcheck; fresh credentials issued.');

  // --------------------------------------------------------------------------
  // EXPERIMENT 7: OTP Cooldown & Challenge Replacement
  // --------------------------------------------------------------------------
  console.log('\n--- [EXPERIMENT 7: OTP Cooldown & Challenge Replacement] ---');
  const tempPhone = `+1415${Math.floor(1000000 + Math.random() * 9000000)}`;

  const otpA = await (await fetch(`${baseUrl}/api/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: tempPhone }),
  })).json() as any;

  // Immediate second request
  const otpB = await (await fetch(`${baseUrl}/api/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: tempPhone }),
  })).json() as any;

  if (otpB.success || otpB.error !== 'RATE_LIMITED') {
    throw new Error('Exp 7: Expected RATE_LIMITED on immediate OTP re-request within 60s');
  }

  // Advance clock & issue replacement challenge
  await db.update(otps).set({ createdAt: new Date(Date.now() - 65000) }).where(eq(otps.identifier, tempPhone));
  const otpC = await (await fetch(`${baseUrl}/api/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: tempPhone }),
  })).json() as any;

  // Submitting old code must fail
  const verifyOld = await (await fetch(`${baseUrl}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: tempPhone, code: otpA.mockCode }),
  })).json() as any;

  if (verifyOld.success) throw new Error('Exp 7: Old OTP code was accepted!');

  // Submitting new code must succeed
  const verifyNew = await (await fetch(`${baseUrl}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: tempPhone, code: otpC.mockCode }),
  })).json() as any;

  if (!verifyNew.success) throw new Error('Exp 7: New OTP rejected');
  console.log('✓ PASS EXPERIMENT 7: 60s cooldown enforced; old challenge superseded and invalidated.');

  // --------------------------------------------------------------------------
  // EXPERIMENT 8: OTP Rate Limiting & 5-Attempt Lockout
  // --------------------------------------------------------------------------
  console.log('\n--- [EXPERIMENT 8: OTP Rate Limiting & 5-Attempt Lockout] ---');
  const lockoutPhone = `+1415${Math.floor(1000000 + Math.random() * 9000000)}`;
  const otpLockout = await (await fetch(`${baseUrl}/api/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: lockoutPhone }),
  })).json() as any;

  for (let attempt = 1; attempt <= 4; attempt++) {
    const wrongRes = await (await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: lockoutPhone, code: '000000' }),
    })).json() as any;

    if (wrongRes.remainingAttempts !== 5 - attempt) {
      throw new Error(`Exp 8: Incorrect remaining attempts reported: ${wrongRes.remainingAttempts}`);
    }
  }

  // 5th attempt -> CHALLENGE_LOCKED
  const fifthRes = await (await fetch(`${baseUrl}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: lockoutPhone, code: '000000' }),
  })).json() as any;

  if (fifthRes.success || fifthRes.error !== 'CHALLENGE_LOCKED') {
    throw new Error('Exp 8: 5th attempt did not trigger CHALLENGE_LOCKED');
  }

  // Subsequent attempt rejected
  const sixthRes = await (await fetch(`${baseUrl}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: lockoutPhone, code: otpLockout.mockCode }),
  })).json() as any;

  if (sixthRes.success || sixthRes.error !== 'CHALLENGE_LOCKED') {
    throw new Error('Exp 8: Locked challenge allowed subsequent verification');
  }
  console.log('✓ PASS EXPERIMENT 8: 5-attempt limit enforced; challenge locked and further attempts rejected.');

  // --------------------------------------------------------------------------
  // EXPERIMENT 9: Install & Provisioning Idempotency
  // --------------------------------------------------------------------------
  console.log('\n--- [EXPERIMENT 9: Install & Provisioning Idempotency] ---');
  const radBefore = (await RadiusService.getRadcheckEntries()).length;
  const subBefore = (await db.select().from(subscribers)).length;

  const parallelCalls = Array.from({ length: 8 }, (_, i) =>
    fetch(`${baseUrl}/api/profile/android-config?token=${tokenDevice2}`, {
      headers: { 'idempotency-key': `idem-key-${i}` },
    }).then(r => r.json())
  );

  const idemResults = await Promise.all(parallelCalls) as any[];
  for (const r of idemResults) {
    if (!r.success || r.data.credential.userCredential.username !== subUserDevice2) {
      throw new Error('Exp 9: Idempotent call returned unexpected payload');
    }
  }

  const radAfter = (await RadiusService.getRadcheckEntries()).length;
  const subAfter = (await db.select().from(subscribers)).length;

  if (radBefore !== radAfter || subBefore !== subAfter) {
    throw new Error('Exp 9: Parallel reads mutated database records!');
  }
  console.log('✓ PASS EXPERIMENT 9: Idempotency enforced across concurrent requests.');

  // --------------------------------------------------------------------------
  // EXPERIMENT 10: Phone Number Change with OTP Verification
  // --------------------------------------------------------------------------
  console.log('\n--- [EXPERIMENT 10: Phone Number Change with OTP] ---');
  const newPhone = `+1415${Math.floor(1000000 + Math.random() * 9000000)}`;

  // Step 1: /api/account/change-phone/request
  const changeReq = await (await fetch(`${baseUrl}/api/account/change-phone/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPhone: customerPhone, newPhone }),
  })).json() as any;

  if (!changeReq.success || !changeReq.mockCode) throw new Error('Exp 10: Change phone request failed');

  // Step 2: /api/account/change-phone/verify
  const changeVerify = await (await fetch(`${baseUrl}/api/account/change-phone/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPhone: customerPhone, newPhone, code: changeReq.mockCode }),
  })).json() as any;

  if (!changeVerify.success) throw new Error('Exp 10: Change phone verify failed');

  // Verify DB migration
  const updatedCust = await db.select().from(customers).where(eq(customers.phone, newPhone));
  if (updatedCust.length !== 1) throw new Error('Exp 10: Customer not found under new phone');

  const migratedDevices = await RadiusService.getCustomerDevices(newPhone);
  if (migratedDevices.length < 2) throw new Error('Exp 10: Devices not migrated to new phone');

  // Verify Device 2 still resolves active credentials
  const dev2Check = await (await fetch(`${baseUrl}/api/profile/android-config?token=${tokenDevice2}`)).json() as any;
  if (!dev2Check.success || dev2Check.data.credential.userCredential.username !== subUserDevice2) {
    throw new Error('Exp 10: Device 2 credentials broken after phone update');
  }
  console.log(`✓ PASS EXPERIMENT 10: Customer phone successfully updated via /api/account/change-phone; all devices and profiles preserved.`);

  console.log('\n===============================================================');
  console.log('>>> ALL 10 DEEPIN VALIDATION EXPERIMENTS PASSED WITH 100% SUCCESS <<<');
  console.log('===============================================================\n');

  process.exit(0);
}

runValidationExperiments().catch((err) => {
  console.error('\n❌ EXPERIMENT RUNNER FAILED:', err);
  process.exit(1);
});
