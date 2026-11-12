export type AuthMethod = 'phone' | 'email';

export type PlatformType = 'ios' | 'android' | 'macos' | 'windows' | 'generic_web';

export interface SendOtpPayload {
  identifier: string;
  type: AuthMethod;
}

export interface SendOtpResponse {
  success: boolean;
  message: string;
  expiresInSeconds: number;
  cooldownSeconds: number;
  mockCode?: string;
  error?: string;
}

export interface VerifyOtpPayload {
  identifier: string;
  code: string;
  venueId?: string;
  confirmRecovery?: boolean;
  deviceInfo?: {
    deviceId?: string;
    deviceName?: string;
    venueId?: string;
    platform: PlatformType;
    userAgent: string;
  };
}

export interface SubscriberData {
  id: string;
  username: string;
  realm: string;
  expirationTime: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
  subscriber?: SubscriberData;
  downloadToken?: string;
  alreadyProvisioned?: boolean;
  isExisting?: boolean;
  venueVisited?: string;
  venueVisitRecorded?: boolean;
  venueVisitReason?: string;
  endpoints?: {
    iosMobileConfig: string;
    androidConfig: string;
  };
  error?: string;
  remainingAttempts?: number;
}

export interface AndroidPasspointConfig {
  homeSp: {
    fqdn: string;
    friendlyName: string;
    roamingConsortiumOis: string[];
  };
  credential: {
    realm: string;
    userCredential: {
      username: string;
      password: string;
      eapType: number;
      nonEapInnerMethod: string;
    };
  };
  expirationTime: string;
  autoJoin: boolean;
}

export interface CountryCode {
  name: string;
  dialCode: string;
  code: string;
  flag: string;
}

export interface ConnectionStatusResponse {
  state: 'CONNECTED' | 'CONFIGURED_NOT_CONNECTED' | 'NOT_CONFIGURED';
  message: string;
  subscriber?: {
    id: string;
    username: string;
    realm: string;
    expirationTime: string;
    customerPhone?: string;
  };
  session?: {
    acctsessionid: string;
    framedipaddress?: string | null;
    callingstationid?: string | null;
    acctstarttime?: string | null;
    connectedSinceFormatted?: string;
    sessionDuration?: string;
    subscriberUsername?: string;
    assignedIp?: string;
    dataUsedFormatted?: string;
    activeSessionsCount?: number;
  };
  lastSession?: {
    acctsessionid: string;
    framedipaddress?: string | null;
    callingstationid?: string | null;
    acctstoptime?: string | null;
    lastDisconnectedFormatted?: string;
  };
  connectedSinceFormatted?: string;
  sessionDuration?: string;
  subscriberUsername?: string;
  assignedIp?: string;
  dataUsedFormatted?: string;
  activeSessionsCount?: number;
  lastDisconnectedFormatted?: string;
}

