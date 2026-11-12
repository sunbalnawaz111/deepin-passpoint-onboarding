import { Subscriber } from '../db/schema.js';
import { config } from '../config.js';
import { generatePasspointMobileConfig } from '../templates/mobileconfig.xml.js';

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export interface AndroidPasspointConfigPayload {
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
      eapType: number; // 21 = EAP-TTLS
      nonEapInnerMethod: string; // "MS-CHAP-V2"
    };
  };
  expirationTime: string;
  autoJoin: boolean;
}

export class PasspointService {
  /**
   * Generates the dynamic Apple iOS / macOS .mobileconfig payload.
   */
  static generateAppleMobileConfig(subscriber: Subscriber): string {
    return generatePasspointMobileConfig({
      subscriber,
      operatorName: config.passpoint.operatorName,
      domain: config.passpoint.domain,
      realm: subscriber.realm,
      roamingOIs: config.passpoint.roamingConsortiumOIs,
      radiusServerName: config.passpoint.radiusServerName,
    });
  }

  /**
   * Builds standard OMA-DM SyncML XML containing the PerProviderSubscription (PPS-MO) tree
   * for Android Passpoint Release 2 (EAP-TTLS / MS-CHAP-V2) and returns it encoded as Base64.
   *
   * This is required by Android OS / Chrome for application/x-wifi-config interception
   * so that Android installs the Wi-Fi profile directly without "problem with downloaded file" errors.
   */
  static generateAndroidPasspointXml(subscriber: Subscriber): string {
    const fqdn = escapeXml(config.passpoint.domain);
    const friendlyName = escapeXml(config.passpoint.operatorName);
    const realm = escapeXml(subscriber.realm || config.passpoint.realm);
    const username = escapeXml(subscriber.username);
    // In PPS-MO, the password value in the UsernamePassword node is Base64 encoded
    const base64Password = Buffer.from(subscriber.password, 'utf-8').toString('base64');
    const roamingOIs = config.passpoint.roamingConsortiumOIs.join(',');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<MgmtTree xmlns="syncml:dmddf1.2">
  <VerDTD>1.2</VerDTD>
  <Node>
    <NodeName>PerProviderSubscription</NodeName>
    <Node>
      <NodeName>HomeSP</NodeName>
      <Node>
        <NodeName>FQDN</NodeName>
        <Value>${fqdn}</Value>
      </Node>
      <Node>
        <NodeName>FriendlyName</NodeName>
        <Value>${friendlyName}</Value>
      </Node>
      <Node>
        <NodeName>RoamingConsortiumOI</NodeName>
        <Value>${roamingOIs}</Value>
      </Node>
    </Node>
    <Node>
      <NodeName>Credential</NodeName>
      <Node>
        <NodeName>Realm</NodeName>
        <Value>${realm}</Value>
      </Node>
      <Node>
        <NodeName>UsernamePassword</NodeName>
        <Node>
          <NodeName>Username</NodeName>
          <Value>${username}</Value>
        </Node>
        <Node>
          <NodeName>Password</NodeName>
          <Value>${base64Password}</Value>
        </Node>
        <Node>
          <NodeName>EAPMethod</NodeName>
          <Node>
            <NodeName>EAPType</NodeName>
            <Value>21</Value>
          </Node>
          <Node>
            <NodeName>InnerMethod</NodeName>
            <Value>MS-CHAP-V2</Value>
          </Node>
        </Node>
      </Node>
    </Node>
  </Node>
</MgmtTree>`;

    return Buffer.from(xml, 'utf-8').toString('base64');
  }

  /**
   * Generates the Android Passpoint configuration structure required by
   * android.net.wifi.hotspot2.PasspointConfiguration and WifiNetworkSuggestion.Builder.
   */
  static generateAndroidPasspointConfig(subscriber: Subscriber): AndroidPasspointConfigPayload {
    return {
      homeSp: {
        fqdn: config.passpoint.domain,
        friendlyName: config.passpoint.operatorName,
        roamingConsortiumOis: config.passpoint.roamingConsortiumOIs,
      },
      credential: {
        realm: subscriber.realm,
        userCredential: {
          username: subscriber.username,
          password: subscriber.password,
          eapType: config.passpoint.eapType, // 21 = EAP-TTLS
          nonEapInnerMethod: 'MS-CHAP-V2',
        },
      },
      expirationTime: subscriber.expirationTime.toISOString(),
      autoJoin: true,
    };
  }
}
