import { Hono } from 'hono';
import { z } from 'zod';
import { OtpService } from '../services/otp.service.js';
import { RadiusService, DeviceInfo } from '../services/radius.service.js';

export const authRouter = new Hono();

// Validation Schemas
const sendOtpSchema = z
  .object({
    identifier: z.string().optional(),
    type: z.enum(['phone', 'email']).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  })
  .refine(
    (data) => (data.identifier && data.type) || data.email || data.phone,
    {
      message: "Must provide either 'identifier' with 'type', 'email', or 'phone'",
    }
  );

const verifyOtpSchema = z.object({
  identifier: z.string().min(3).max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  code: z.string().regex(/^\d{6}$/, 'Code must be exactly 6 digits'),
  venueId: z.string().optional(),
  confirmRecovery: z.boolean().optional(),
  deviceInfo: z
    .object({
      deviceId: z.string().optional(),
      deviceName: z.string().optional(),
      venueId: z.string().optional(),
      platform: z.enum(['ios', 'android', 'macos', 'windows', 'generic_web']).default('generic_web'),
      userAgent: z.string().optional(),
    })
    .optional(),
});

const requestPhoneUpdateSchema = z.object({
  currentPhone: z.string().min(6).max(20),
  newPhone: z.string().min(6).max(20),
});

const confirmPhoneUpdateSchema = z.object({
  currentPhone: z.string().min(6).max(20),
  newPhone: z.string().min(6).max(20),
  code: z.string().regex(/^\d{6}$/, 'Code must be exactly 6 digits'),
});

function normalizePhone(input: string): string {
  const cleaned = input.replace(/[\s\-()]/g, '');
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

/**
 * POST /api/auth/send-otp
 * Generates and stores 6-digit cryptographic OTP.
 * Enforces 60s cooldown and challenge replacement (Experiment 7).
 */
authRouter.post('/send-otp', async (c) => {
  try {
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return c.json(
        {
          success: false,
          error: 'INVALID_JSON',
          message: 'Request body must be a valid JSON object.',
        },
        400
      );
    }

    const parseResult = sendOtpSchema.safeParse(body);

    if (!parseResult.success) {
      return c.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: parseResult.error.errors.map((e) => e.message).join(', '),
        },
        400
      );
    }

    let identifier = parseResult.data.identifier?.trim() || '';
    let type = parseResult.data.type;

    if (!identifier) {
      if (parseResult.data.email) {
        identifier = parseResult.data.email.trim().toLowerCase();
        type = 'email';
      } else if (parseResult.data.phone) {
        identifier = parseResult.data.phone.trim();
        type = 'phone';
      }
    }

    if (!type) {
      type = identifier.includes('@') ? 'email' : 'phone';
    }

    if (type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(identifier)) {
        return c.json(
          { success: false, error: 'INVALID_EMAIL', message: 'Please provide a valid email address.' },
          400
        );
      }
    } else if (type === 'phone') {
      const phoneRegex = /^\+?[1-9]\d{6,14}$/;
      const cleaned = identifier.replace(/[\s\-()]/g, '');
      if (!phoneRegex.test(cleaned)) {
        return c.json(
          { success: false, error: 'INVALID_PHONE', message: 'Please provide a valid phone number with country code.' },
          400
        );
      }
      identifier = normalizePhone(cleaned);
    }

    const result = await OtpService.sendOtp(identifier, type);

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: result.error || 'RATE_LIMITED',
          message: result.message,
          cooldownSeconds: result.cooldownSeconds,
          expiresInSeconds: 0,
        },
        429
      );
    }

    return c.json(
      {
        success: true,
        message: result.message || 'Verification code sent',
        expiresInSeconds: result.expiresInSeconds,
        cooldownSeconds: result.cooldownSeconds,
        mockCode: result.mockCode,
      },
      200
    );
  } catch (error: any) {
    console.error('[Error in /send-otp]', error);
    return c.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: error?.message || 'Failed to process OTP request.',
      },
      500
    );
  }
});

/**
 * POST /api/auth/verify-otp
 * Validates OTP code, binds customer/device record, and provisions or reuses Passpoint credentials.
 * Handles Experiments 1 (QR Dedup), 2 (Multi-Venue), 4 (Multi-Device), 5 (Recovery), and 8 (Lockout).
 */
authRouter.post('/verify-otp', async (c) => {
  try {
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return c.json(
        {
          success: false,
          error: 'INVALID_JSON',
          message: 'Request body must be a valid JSON object.',
        },
        400
      );
    }

    const parseResult = verifyOtpSchema.safeParse(body);

    if (!parseResult.success) {
      return c.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: parseResult.error.errors.map((e) => e.message).join(', '),
        },
        400
      );
    }

    const { code, deviceInfo, venueId, confirmRecovery } = parseResult.data;
    let identifier = (parseResult.data.identifier || parseResult.data.email || parseResult.data.phone || '').trim();

    if (!identifier) {
      return c.json(
        {
          success: false,
          error: 'MISSING_IDENTIFIER',
          message: 'An identifier (phone or email) is required.',
        },
        400
      );
    }

    if (!identifier.includes('@')) {
      identifier = normalizePhone(identifier);
    }

    // 1. Verify OTP code (Experiment 8: 5-attempt limit lockout)
    const verification = await OtpService.verifyOtp(identifier, code);
    if (!verification.success) {
      const statusCode = verification.error === 'CHALLENGE_LOCKED' ? 429 : 400;
      return c.json(
        {
          success: false,
          error: verification.error || 'INVALID_OTP',
          message: verification.message,
          remainingAttempts: verification.remainingAttempts,
        },
        statusCode
      );
    }

    // 2. Extract client IP and user agent + x-device-id and x-venue-id headers
    const userAgent = deviceInfo?.userAgent || c.req.header('user-agent') || 'Unknown';
    const forwardedFor = c.req.header('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';

    const headerDeviceId = c.req.header('x-device-id');
    const headerVenueId = c.req.header('x-venue-id');
    const idempotencyKey = c.req.header('idempotency-key');

    const clientDevice: DeviceInfo = {
      deviceId: deviceInfo?.deviceId || headerDeviceId,
      deviceName: deviceInfo?.deviceName,
      venueId: deviceInfo?.venueId || venueId || headerVenueId,
      platform: deviceInfo?.platform || 'generic_web',
      userAgent,
      ipAddress,
    };

    // 3. Provision or Deduplicate RADIUS / Passpoint subscriber
    const provisionResult = await RadiusService.provisionSubscriber(
      verification.identifier!,
      verification.type!,
      clientDevice,
      {
        confirmRecovery: !!confirmRecovery,
        idempotencyKey,
      }
    );

    // Experiment 5: Recycled SIM / Security Recovery conflict
    if (provisionResult.status === 'RECOVERY_REQUIRED') {
      return c.json(
        {
          success: false,
          status: 'RECOVERY_REQUIRED',
          recoveryRequired: true,
          message: provisionResult.message || 'Account exists. Confirm secondary verification or reset profile history.',
        },
        409
      );
    }

    return c.json(
      {
        success: true,
        message: provisionResult.alreadyProvisioned
          ? 'FastPass Wi-Fi Ready / Already Configured: Existing active profile recognized for this device.'
          : 'Authentication successful. New Passpoint profile generated.',
        alreadyProvisioned: provisionResult.alreadyProvisioned,
        status: provisionResult.status,
        isExisting: provisionResult.isExisting,
        venueVisited: provisionResult.venueVisited,
        venueVisitRecorded: provisionResult.venueVisitRecorded,
        venueVisitReason: provisionResult.venueVisitReason,
        subscriber: provisionResult.subscriber
          ? {
              id: provisionResult.subscriber.id,
              username: provisionResult.subscriber.username,
              realm: provisionResult.subscriber.realm,
              expirationTime: provisionResult.subscriber.expirationTime,
            }
          : undefined,
        downloadToken: provisionResult.downloadToken,
        endpoints: provisionResult.endpoints,
      },
      200
    );
  } catch (error: any) {
    console.error('[Error in /verify-otp]', error);
    return c.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: error?.message || 'Failed to complete verification.',
      },
      500
    );
  }
});

/**
 * POST /api/auth/reissue-profile
 * Re-issues credentials for a customer device, revoking prior FreeRADIUS credentials (Experiment 6).
 */
authRouter.post('/reissue-profile', async (c) => {
  try {
    const body = await c.req.json();
    let identifier = (body.identifier || body.phone || body.email || '').trim();
    if (!identifier) {
      return c.json({ success: false, error: 'MISSING_IDENTIFIER', message: 'Identifier is required.' }, 400);
    }

    if (!identifier.includes('@')) {
      identifier = normalizePhone(identifier);
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
    console.error('[Error in /reissue-profile]', error);
    return c.json({ success: false, error: 'INTERNAL_ERROR', message: error?.message }, 500);
  }
});

/**
 * POST /api/auth/revoke-profile
 * Revokes a subscriber profile and disables FreeRADIUS radcheck entry (Experiment 6).
 */
authRouter.post('/revoke-profile', async (c) => {
  try {
    const body = await c.req.json();
    const tokenOrId = body.token || body.subscriberId || body.downloadToken;
    if (!tokenOrId) {
      return c.json({ success: false, error: 'MISSING_PARAM', message: 'Token or subscriberId is required.' }, 400);
    }

    const success = await RadiusService.revokeSubscriber(tokenOrId);
    if (!success) {
      return c.json({ success: false, error: 'NOT_FOUND', message: 'Subscriber profile not found.' }, 404);
    }

    return c.json({ success: true, message: 'Subscriber profile successfully revoked from FreeRADIUS.' });
  } catch (error: any) {
    console.error('[Error in /revoke-profile]', error);
    return c.json({ success: false, error: 'INTERNAL_ERROR', message: error?.message }, 500);
  }
});

/**
 * Experiment 10: Phone Number Update with OTP Verification
 * POST /api/auth/request-phone-update & alias /api/account/change-phone/request
 */
const handlePhoneUpdateRequest = async (c: any) => {
  try {
    const body = await c.req.json();
    const parsed = requestPhoneUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: 'VALIDATION_ERROR', message: parsed.error.errors.map(e => e.message).join(', ') }, 400);
    }

    const currentPhone = normalizePhone(parsed.data.currentPhone);
    const newPhone = normalizePhone(parsed.data.newPhone);

    if (currentPhone === newPhone) {
      return c.json({ success: false, error: 'SAME_NUMBER', message: 'New phone number must be different from current phone number.' }, 400);
    }

    // Verify current customer exists
    const devices = await RadiusService.getCustomerDevices(currentPhone);
    if (devices.length === 0) {
      return c.json({ success: false, error: 'CUSTOMER_NOT_FOUND', message: `Customer with phone ${currentPhone} not found.` }, 404);
    }

    // Send OTP to new phone number
    const otpResult = await OtpService.sendOtp(newPhone, 'phone');
    if (!otpResult.success) {
      return c.json({
        success: false,
        error: otpResult.error || 'RATE_LIMITED',
        message: otpResult.message,
        cooldownSeconds: otpResult.cooldownSeconds,
      }, 429);
    }

    return c.json({
      success: true,
      message: `Verification code sent to new phone number ${newPhone}. Please verify to complete update.`,
      expiresInSeconds: otpResult.expiresInSeconds,
      cooldownSeconds: otpResult.cooldownSeconds,
      mockCode: otpResult.mockCode,
    });
  } catch (error: any) {
    console.error('[Error in request phone update]', error);
    return c.json({ success: false, error: 'INTERNAL_ERROR', message: error?.message }, 500);
  }
};

/**
 * Experiment 10: Phone Number Update Confirmation
 * POST /api/auth/confirm-phone-update & alias /api/account/change-phone/verify
 */
const handlePhoneUpdateConfirm = async (c: any) => {
  try {
    const body = await c.req.json();
    const parsed = confirmPhoneUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: 'VALIDATION_ERROR', message: parsed.error.errors.map(e => e.message).join(', ') }, 400);
    }

    const currentPhone = normalizePhone(parsed.data.currentPhone);
    const newPhone = normalizePhone(parsed.data.newPhone);
    const code = parsed.data.code;

    // 1. Verify OTP for the NEW phone number
    const verifyResult = await OtpService.verifyOtp(newPhone, code);
    if (!verifyResult.success) {
      return c.json({
        success: false,
        error: verifyResult.error || 'INVALID_OTP',
        message: verifyResult.message,
        remainingAttempts: verifyResult.remainingAttempts,
      }, verifyResult.error === 'CHALLENGE_LOCKED' ? 429 : 400);
    }

    // 2. Migrate customer, preserving all devices and profiles
    await RadiusService.updateCustomerPhone(currentPhone, newPhone);

    return c.json({
      success: true,
      message: `Phone number updated successfully from ${currentPhone} to ${newPhone}. All devices and Passpoint profiles preserved.`,
      customer: {
        phone: newPhone,
      },
    });
  } catch (error: any) {
    console.error('[Error in confirm phone update]', error);
    return c.json({ success: false, error: 'INTERNAL_ERROR', message: error?.message }, 500);
  }
};

authRouter.post('/request-phone-update', handlePhoneUpdateRequest);
authRouter.post('/confirm-phone-update', handlePhoneUpdateConfirm);

// Dedicated account router for Experiment 10
export const accountRouter = new Hono();
accountRouter.post('/change-phone/request', handlePhoneUpdateRequest);
accountRouter.post('/change-phone/verify', handlePhoneUpdateConfirm);
