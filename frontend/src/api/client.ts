import { Capacitor } from '@capacitor/core';
import {
  SendOtpPayload,
  SendOtpResponse,
  VerifyOtpPayload,
  VerifyOtpResponse,
  PlatformType,
  AndroidPasspointConfig,
  ConnectionStatusResponse,
} from '../types';

export function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem('deepin_device_id') || localStorage.getItem('passpoint_device_id');
    if (!id) {
      id = 'deepin_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      localStorage.setItem('deepin_device_id', id);
    }
    return id;
  } catch {
    return 'deepin_fallback_dev';
  }
}

export function detectPlatform(): PlatformType {
  const ua = navigator.userAgent || '';

  // iOS check (iPhone, iPad, iPod, or Safari on iPadOS)
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (isIOS) return 'ios';

  // Android check
  if (/Android/i.test(ua)) return 'android';

  // macOS
  if (/Macintosh|Mac OS X/i.test(ua)) return 'macos';

  // Windows
  if (/Windows/i.test(ua)) return 'windows';

  return 'generic_web';
}

// Set your laptop's backend address here
const BACKEND_URL = 'http://192.168.18.193:3000';

export const API_BASE_URL = Capacitor.isNativePlatform()
  ? BACKEND_URL
  : (import.meta.env.VITE_API_URL || '');

const API_BASE = `${API_BASE_URL}/api`;

/**
 * Robust HTTP response parser:
 * Prevents "Failed to execute 'json' on 'Response': Unexpected end of JSON input"
 * by reading response text first and checking for empty/non-JSON payloads.
 */
async function parseJsonResponse<T = any>(res: Response): Promise<T> {
  const text = await res.text();
  let data: any = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!res.ok) {
    const errorMsg = data.message || data.error || `Server error: ${res.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const apiClient = {
  /**
   * Request 6-digit OTP code to Phone or Email (Experiment 7)
   */
  async sendOtp(payload: SendOtpPayload): Promise<SendOtpResponse> {
    const res = await fetch(`${API_BASE}/auth/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-device-id': getOrCreateDeviceId(),
      },
      body: JSON.stringify(payload),
    });

    const data = await parseJsonResponse<SendOtpResponse>(res);
    return data;
  },

  /**
   * Verify 6-digit OTP code and retrieve Passpoint credentials (Experiments 1, 2, 4, 5, 8)
   */
  async verifyOtp(payload: VerifyOtpPayload): Promise<VerifyOtpResponse> {
    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-device-id': getOrCreateDeviceId(),
      },
      body: JSON.stringify({
        ...payload,
        deviceInfo: {
          ...payload.deviceInfo,
          deviceId: payload.deviceInfo?.deviceId || getOrCreateDeviceId(),
        },
      }),
    });

    const data = await parseJsonResponse<VerifyOtpResponse>(res);
    return data;
  },

  /**
   * Fetch Android Passpoint configuration payload (Experiment 9)
   */
  async getAndroidConfig(downloadToken: string): Promise<AndroidPasspointConfig> {
    const res = await fetch(`${API_BASE}/profile/android-config?token=${downloadToken}`, {
      headers: {
        'Accept': 'application/json',
        'x-device-id': getOrCreateDeviceId(),
        'idempotency-key': `idem_${getOrCreateDeviceId()}_${Date.now()}`,
      },
    });

    const data = await parseJsonResponse<{ success: boolean; data: AndroidPasspointConfig }>(res);
    return data.data;
  },

  /**
   * Check Live Wi-Fi Connection vs Profile Saved status (Experiment 3)
   */
  async getConnectionStatus(token?: string, deviceId?: string): Promise<ConnectionStatusResponse> {
    const targetDevId = deviceId || getOrCreateDeviceId();
    const tokenParam = token ? `token=${encodeURIComponent(token)}&` : '';
    const res = await fetch(`${API_BASE}/profile/connection-status?${tokenParam}deviceId=${encodeURIComponent(targetDevId)}`, {
      headers: {
        'Accept': 'application/json',
        'x-device-id': targetDevId,
      },
    });

    return parseJsonResponse<ConnectionStatusResponse>(res);
  },

  /**
   * Simulate RADIUS accounting session start/stop (Experiment 3 testing)
   */
  async simulateRadiusSession(username: string, action: 'start' | 'stop'): Promise<any> {
    const res = await fetch(`${API_BASE}/profile/simulate-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ username, action }),
    });
    return parseJsonResponse(res);
  },

  /**
   * Build absolute URL for Apple .mobileconfig download
   */
  getIosProfileUrl(downloadToken: string): string {
    return `${API_BASE}/profile/ios-passpoint?token=${downloadToken}`;
  },

  /**
   * Build absolute URL for Android system intercept download (application/x-wifi-config)
   */
  getAndroidConnectUrl(downloadToken: string): string {
    return `${API_BASE}/profile/android-connect?token=${downloadToken}`;
  },

  /**
   * Reissue fresh Passpoint profile (Experiment 6)
   */
  async reissueProfile(identifier: string, platform: PlatformType, deviceName?: string): Promise<VerifyOtpResponse> {
    const res = await fetch(`${API_BASE}/profile/reissue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-device-id': getOrCreateDeviceId(),
      },
      body: JSON.stringify({
        identifier,
        deviceId: getOrCreateDeviceId(),
        deviceName,
        platform,
        userAgent: navigator.userAgent,
      }),
    });
    return parseJsonResponse<VerifyOtpResponse>(res);
  },

  /**
   * Revoke existing profile (Experiment 6)
   */
  async revokeProfile(tokenOrId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/profile/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-device-id': getOrCreateDeviceId(),
      },
      body: JSON.stringify({ token: tokenOrId }),
    });
    return parseJsonResponse<{ success: boolean; message: string }>(res);
  },

  /**
   * Request phone update OTP (Experiment 10)
   */
  async requestPhoneUpdate(currentPhone: string, newPhone: string): Promise<SendOtpResponse> {
    const res = await fetch(`${API_BASE}/account/change-phone/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-device-id': getOrCreateDeviceId(),
      },
      body: JSON.stringify({ currentPhone, newPhone }),
    });
    return parseJsonResponse<SendOtpResponse>(res);
  },

  /**
   * Confirm phone update with OTP (Experiment 10)
   */
  async confirmPhoneUpdate(currentPhone: string, newPhone: string, code: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/account/change-phone/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-device-id': getOrCreateDeviceId(),
      },
      body: JSON.stringify({ currentPhone, newPhone, code }),
    });
    return parseJsonResponse<{ success: boolean; message: string }>(res);
  },
};
