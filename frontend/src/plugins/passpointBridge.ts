import { registerPlugin, Capacitor } from '@capacitor/core';
import { AndroidPasspointConfig } from '../types';

export interface WifiPasspointOptions {
  fqdn?: string;
  friendlyName?: string;
  realm?: string;
  username?: string;
  password?: string;
  roamingConsortiumOis?: string[];
  eapType?: number;
  nonEapInnerMethod?: string;
  caCertificate?: string;
  homeSp?: {
    fqdn: string;
    friendlyName: string;
    roamingConsortiumOis?: string[];
  };
  credential?: {
    realm: string;
    caCertificate?: string;
    userCredential: {
      username: string;
      password: string;
      eapType?: number;
      nonEapInnerMethod?: string;
    };
  };
}

export interface WifiPasspointResult {
  success: boolean;
  status?: string;
  message: string;
}

export interface WifiPasspointPlugin {
  /**
   * One-tap native Wi-Fi connection method:
   * - On iOS: triggers NEHotspotConfigurationManager "Join Wi-Fi Network" native system dialog.
   * - On Android: registers WifiNetworkSuggestion with PasspointConfiguration.
   */
  connect(options: WifiPasspointOptions | AndroidPasspointConfig): Promise<WifiPasspointResult>;

  /**
   * Android-specific direct suggestion alias
   */
  suggestPasspoint(options: WifiPasspointOptions | AndroidPasspointConfig): Promise<WifiPasspointResult>;

  /**
   * iOS-specific hotspot connection alias
   */
  connectHotspot(options: WifiPasspointOptions | AndroidPasspointConfig): Promise<WifiPasspointResult>;

  installPasspointProfile(options: WifiPasspointOptions | AndroidPasspointConfig): Promise<WifiPasspointResult>;

  isSupported(): Promise<{ supported: boolean; platform?: string; reason?: string }>;

  disconnect(options?: { fqdn?: string }): Promise<{ success: boolean; message: string }>;
}

export const WifiPasspoint = registerPlugin<WifiPasspointPlugin>('WifiPasspoint', {
  web: {
    async connect(options: WifiPasspointOptions | AndroidPasspointConfig) {
      console.log('[WifiPasspoint Web Mock] Native connection invoked with options:', options);
      return {
        success: true,
        status: 'WEB_SIMULATED',
        message: 'Running in browser. In native app builds, this immediately opens the iOS/Android Wi-Fi prompt.',
      };
    },
    async suggestPasspoint(options: WifiPasspointOptions | AndroidPasspointConfig) {
      return this.connect(options);
    },
    async connectHotspot(options: WifiPasspointOptions | AndroidPasspointConfig) {
      return this.connect(options);
    },
    async installPasspointProfile(options: WifiPasspointOptions | AndroidPasspointConfig) {
      return this.connect(options);
    },
    async isSupported() {
      return {
        supported: false,
        platform: 'web',
        reason: 'Native 802.1X Wi-Fi join requires native Capacitor iOS or Android app build.',
      };
    },
    async disconnect() {
      return { success: true, message: 'Disconnected (web simulated).' };
    },
  },
});

export const NativeWifiService = {
  isNative(): boolean {
    return Capacitor.isNativePlatform();
  },

  getPlatform(): string {
    return Capacitor.getPlatform();
  },

  async connect(config: AndroidPasspointConfig): Promise<WifiPasspointResult> {
    if (Capacitor.isNativePlatform()) {
      const platform = Capacitor.getPlatform();
      if (platform === 'android') {
        return await WifiPasspoint.suggestPasspoint(config);
      } else if (platform === 'ios') {
        return await WifiPasspoint.connectHotspot(config);
      }
      return await WifiPasspoint.connect(config);
    }

    return {
      success: true,
      status: 'WEB_FALLBACK',
      message: 'Running in web environment. Use the download buttons or manual setup below.',
    };
  },
};
