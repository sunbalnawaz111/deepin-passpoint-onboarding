import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',

  // Wi-Fi Passpoint (Hotspot 2.0 / Release 2) parameters
  passpoint: {
    // Realm identifying the network operator (FQDN format)
    realm: process.env.PASSPOINT_REALM || 'wifi.example.com',
    // Domain Name matching AAA / RADIUS FQDN
    domain: process.env.PASSPOINT_DOMAIN || 'wifi.example.com',
    // Displayed Operator Name in Wi-Fi Picker / OS Settings
    operatorName: process.env.PASSPOINT_OPERATOR_NAME || 'FastPass Free Wi-Fi',
    // Roaming Consortium Organization Identifiers (OIs)
    // Common examples: 5A03BA0000 (OpenRoaming), 004096 (Wi-Fi Alliance test)
    roamingConsortiumOIs: (process.env.PASSPOINT_ROAMING_OIS || '5A03BA0000,004096')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    // AAA / RADIUS server hostname expected during EAP-TTLS outer handshake
    radiusServerName: process.env.RADIUS_SERVER_NAME || 'radius.wifi.example.com',
    // EAP parameters
    eapType: 21, // 21 = EAP-TTLS, 25 = EAP-PEAP, 13 = EAP-TLS
    innerAuth: 'MSCHAPv2', // TTLS inner method: MSCHAPv2 or PAP
    // Subscriber credential duration (in days)
    credentialDurationDays: parseInt(process.env.PASSPOINT_DURATION_DAYS || '30', 10),
  },

  // Security & Token Secret
  jwtSecret: process.env.JWT_SECRET || 'dev-passpoint-secret-key-change-in-prod-987456321',

  // OTP Configuration
  otp: {
    ttlSeconds: 300, // 5 minutes
    cooldownSeconds: 60, // Minimum delay between resend requests (Experiment 7)
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10), // 5 failed attempts lockout (Experiment 8)
  },

  // External Provider API Keys (optional stubs)
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    fromNumber: process.env.TWILIO_FROM_NUMBER || '',
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY || '',
    fromEmail: process.env.RESEND_FROM_EMAIL || 'wifi-onboarding@example.com',
  },
};

