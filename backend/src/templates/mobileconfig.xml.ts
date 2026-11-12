import { v4 as uuidv4 } from 'uuid';
import { Subscriber } from '../db/schema.js';
import { config } from '../config.js';

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export interface MobileConfigOptions {
  subscriber: Subscriber;
  operatorName?: string;
  domain?: string;
  realm?: string;
  roamingOIs?: string[];
  radiusServerName?: string;
}

/**
 * Dynamically builds an Apple .mobileconfig XML profile for Wi-Fi Passpoint (Hotspot 2.0).
 * PayloadType: com.apple.wifi.managed with EAP-TTLS/MSCHAPv2 credentials.
 */
export function generatePasspointMobileConfig(options: MobileConfigOptions): string {
  const {
    subscriber,
    operatorName = config.passpoint.operatorName,
    domain = config.passpoint.domain,
    realm = config.passpoint.realm,
    roamingOIs = config.passpoint.roamingConsortiumOIs,
    radiusServerName = config.passpoint.radiusServerName,
  } = options;

  const profileUuid = uuidv4();
  const wifiPayloadUuid = uuidv4();

  const roamingOIsXml = roamingOIs
    .map((oi) => `        <string>${escapeXml(oi)}</string>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <!-- Top-level Profile Metadata -->
  <key>PayloadDisplayName</key>
  <string>${escapeXml(operatorName)} Passpoint Wi-Fi</string>
  <key>PayloadDescription</key>
  <string>Automatic Hotspot 2.0 (Passpoint) profile for secure high-speed Wi-Fi access</string>
  <key>PayloadIdentifier</key>
  <string>com.passpoint.profile.${escapeXml(domain)}.${profileUuid}</string>
  <key>PayloadOrganization</key>
  <string>${escapeXml(operatorName)}</string>
  <key>PayloadRemovalDisallowed</key>
  <false/>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadUUID</key>
  <string>${profileUuid}</string>
  <key>PayloadVersion</key>
  <integer>1</integer>

  <!-- Profile Content Payloads -->
  <key>PayloadContent</key>
  <array>
    <dict>
      <!-- Managed Wi-Fi Payload for Passpoint Release 2 -->
      <key>PayloadType</key>
      <string>com.apple.wifi.managed</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
      <key>PayloadIdentifier</key>
      <string>com.apple.wifi.managed.${wifiPayloadUuid}</string>
      <key>PayloadUUID</key>
      <string>${wifiPayloadUuid}</string>
      <key>PayloadDisplayName</key>
      <string>${escapeXml(operatorName)}</string>
      <key>PayloadDescription</key>
      <string>Passpoint Hotspot 2.0 credentials and roaming consortium policy</string>
      <key>PayloadOrganization</key>
      <string>${escapeXml(operatorName)}</string>

      <!-- Passpoint Core Identifiers -->
      <key>IsHotspot</key>
      <true/>
      <key>AutoJoin</key>
      <true/>
      <key>CaptiveBypass</key>
      <false/>
      <key>EncryptionType</key>
      <string>WPA2</string>
      <key>DisplayedOperatorName</key>
      <string>${escapeXml(operatorName)}</string>
      <key>DomainName</key>
      <string>${escapeXml(domain)}</string>
      <key>NAIRealm</key>
      <string>${escapeXml(realm)}</string>
      <key>ServiceProviderRoamingEnabled</key>
      <true/>

      <!-- Roaming Consortium Organization Identifiers (OIs) -->
      <key>RoamingConsortiumList</key>
      <array>
${roamingOIsXml}
      </array>

      <!-- 802.1X / EAP Authentication Settings -->
      <key>EAPClientConfiguration</key>
      <dict>
        <key>AcceptEAPTypes</key>
        <array>
          <!-- 21 corresponds to EAP-TTLS -->
          <integer>21</integer>
        </array>
        <key>TTLSInnerAuthentication</key>
        <string>MSCHAPv2</string>
        <key>UserName</key>
        <string>${escapeXml(subscriber.username)}</string>
        <key>UserPassword</key>
        <string>${escapeXml(subscriber.password)}</string>
        <key>OuterIdentity</key>
        <string>anonymous@${escapeXml(realm)}</string>
        <key>TLSTrustedServerNames</key>
        <array>
          <string>${escapeXml(radiusServerName)}</string>
        </array>
      </dict>
    </dict>
  </array>
</dict>
</plist>`;
}

