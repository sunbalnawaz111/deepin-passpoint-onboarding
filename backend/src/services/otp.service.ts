import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, desc, gt } from 'drizzle-orm';
import { db } from '../db/index.js';
import { otps } from '../db/schema.js';
import { config } from '../config.js';

export interface SendOtpResult {
  success: boolean;
  message: string;
  expiresInSeconds: number;
  cooldownSeconds: number;
  mockCode?: string; // Included in non-production for testing
  error?: string;
}

export interface VerifyOtpResult {
  success: boolean;
  message: string;
  identifier?: string;
  type?: 'phone' | 'email';
  error?: string;
  remainingAttempts?: number;
}

function hashOtp(code: string, salt: string): string {
  return crypto.createHmac('sha256', salt).update(code).digest('hex');
}

export class OtpService {
  /**
   * Generates a 6-digit cryptographically secure OTP and persists it with TTL.
   * Enforces 60-second cooldown and challenge replacement on repeated requests (Experiment 7).
   */
  static async sendOtp(identifier: string, type: 'phone' | 'email'): Promise<SendOtpResult> {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const now = new Date();

    // 1. Check for cooldown violation (prevent SMS spamming / repeated requests within 60s)
    const recentOtps = await db
      .select()
      .from(otps)
      .where(eq(otps.identifier, normalizedIdentifier))
      .orderBy(desc(otps.createdAt))
      .limit(1);

    if (recentOtps.length > 0) {
      const lastCreated = new Date(recentOtps[0].createdAt);
      const elapsedSeconds = Math.floor((now.getTime() - lastCreated.getTime()) / 1000);
      if (elapsedSeconds < config.otp.cooldownSeconds) {
        const remainingCooldown = config.otp.cooldownSeconds - elapsedSeconds;
        return {
          success: false,
          error: 'RATE_LIMITED',
          message: `Please wait ${remainingCooldown}s before requesting a new verification code.`,
          expiresInSeconds: 0,
          cooldownSeconds: remainingCooldown,
        };
      }
    }

    // 2. Challenge Replacement (Experiment 7):
    // Invalidate any previously pending OTP challenges for this identifier so old codes cannot be re-used
    await db
      .update(otps)
      .set({ status: 'invalidated' })
      .where(and(eq(otps.identifier, normalizedIdentifier), eq(otps.status, 'pending')));

    // 3. Generate secure 6-digit random code
    const secureRandomInt = crypto.randomInt(100000, 1000000); // 100000 to 999999 inclusive
    const code = secureRandomInt.toString();
    const codeHash = hashOtp(code, config.jwtSecret);

    const expiresAt = new Date(now.getTime() + config.otp.ttlSeconds * 1000);

    // 4. Store record in database with status 'pending'
    await db.insert(otps).values({
      id: uuidv4(),
      identifier: normalizedIdentifier,
      codeHash,
      plainCodeDemo: code, // For prototype demo visibility
      attempts: 0,
      status: 'pending',
      expiresAt,
      verifiedAt: null,
      createdAt: now,
    });

    // 5. Dispatch notification
    await this.dispatchNotification(normalizedIdentifier, type, code);

    return {
      success: true,
      message: `Verification code sent to ${normalizedIdentifier}`,
      expiresInSeconds: config.otp.ttlSeconds,
      cooldownSeconds: config.otp.cooldownSeconds,
      mockCode: config.nodeEnv !== 'production' ? code : undefined,
    };
  }

  /**
   * Validates OTP submission against the latest active pending record.
   * Enforces 5 failed attempts lockout and structured error reporting (Experiment 8).
   */
  static async verifyOtp(identifier: string, submittedCode: string): Promise<VerifyOtpResult> {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const now = new Date();

    // 1. Retrieve the latest pending unexpired OTP for this identifier
    const existing = await db
      .select()
      .from(otps)
      .where(
        and(
          eq(otps.identifier, normalizedIdentifier),
          eq(otps.status, 'pending'),
          gt(otps.expiresAt, now)
        )
      )
      .orderBy(desc(otps.createdAt))
      .limit(1);

    if (existing.length === 0) {
      // Check if the most recent OTP was locked due to attempt exhaustion
      const latestAny = await db
        .select()
        .from(otps)
        .where(eq(otps.identifier, normalizedIdentifier))
        .orderBy(desc(otps.createdAt))
        .limit(1);

      if (latestAny.length > 0 && latestAny[0].status === 'locked') {
        return {
          success: false,
          error: 'CHALLENGE_LOCKED',
          message: 'Maximum verification attempts exceeded. Challenge locked. Please request a new code.',
          remainingAttempts: 0,
        };
      }

      return {
        success: false,
        error: 'INVALID_CHALLENGE',
        message: 'No active OTP request found or code has expired. Please request a new one.',
      };
    }

    const currentRecord = existing[0];

    // 2. Check attempt limit before verifying (brute force protection)
    if (currentRecord.attempts >= config.otp.maxAttempts) {
      await db
        .update(otps)
        .set({ status: 'locked' })
        .where(eq(otps.id, currentRecord.id));

      return {
        success: false,
        error: 'CHALLENGE_LOCKED',
        message: 'Maximum verification attempts exceeded. Challenge locked. Please request a new code.',
        remainingAttempts: 0,
      };
    }

    // 3. Verify hash using timing-safe comparison
    const submittedHash = hashOtp(submittedCode.trim(), config.jwtSecret);
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(submittedHash, 'hex'),
      Buffer.from(currentRecord.codeHash, 'hex')
    );

    if (!isMatch) {
      const newAttempts = currentRecord.attempts + 1;
      const isNowLocked = newAttempts >= config.otp.maxAttempts;

      await db
        .update(otps)
        .set({
          attempts: newAttempts,
          status: isNowLocked ? 'locked' : 'pending',
        })
        .where(eq(otps.id, currentRecord.id));

      if (isNowLocked) {
        return {
          success: false,
          error: 'CHALLENGE_LOCKED',
          message: 'Maximum verification attempts exceeded. Challenge locked. Please request a new code.',
          remainingAttempts: 0,
        };
      }

      const remaining = config.otp.maxAttempts - newAttempts;
      return {
        success: false,
        error: 'INVALID_OTP',
        message: `Invalid code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
        remainingAttempts: remaining,
      };
    }

    // 4. Mark as verified
    await db
      .update(otps)
      .set({
        verifiedAt: now,
        status: 'verified',
      })
      .where(eq(otps.id, currentRecord.id));

    const isEmail = normalizedIdentifier.includes('@');
    return {
      success: true,
      message: 'Verification successful',
      identifier: normalizedIdentifier,
      type: isEmail ? 'email' : 'phone',
    };
  }

  /**
   * Dispatcher helper: logs structured mock delivery payloads and executes external provider stubs.
   */
  private static async dispatchNotification(
    identifier: string,
    type: 'phone' | 'email',
    code: string
  ): Promise<void> {
    const webOtpOrigin = process.env.WEBOTP_DOMAIN || 'localhost';
    const webOtpSmsBody = `Your FastPass Wi-Fi verification code is ${code}\n\n@${webOtpOrigin} #${code}`;

    console.log('\n======================================================');
    console.log(`[PASSPOINT OTP DISPATCH] -> Target: ${identifier} (${type})`);
    console.log(`[PASSPOINT OTP DISPATCH] -> CODE: [ ${code} ]`);
    console.log(`[PASSPOINT OTP DISPATCH] -> Valid for: ${config.otp.ttlSeconds / 60} minutes`);
    if (type === 'phone') {
      console.log(`[PASSPOINT WEB-OTP SMS FORMAT]:\n${webOtpSmsBody}`);
    }
    console.log('======================================================\n');

    // Integration stub for Twilio SMS
    if (type === 'phone' && config.twilio.accountSid && config.twilio.authToken) {
      try {
        console.log(`[Twilio SMS Stub] Sending WebOTP SMS to ${identifier} via ${config.twilio.fromNumber}:`);
        console.log(webOtpSmsBody);
      } catch (err) {
        console.error('[Twilio SMS Error]', err);
      }
    }

    // Integration stub for Resend Email
    if (type === 'email' && config.resend.apiKey) {
      try {
        console.log(`[Resend Email Stub] Sending OTP email to ${identifier} from ${config.resend.fromEmail}...`);
      } catch (err) {
        console.error('[Resend Email Error]', err);
      }
    }
  }
}
