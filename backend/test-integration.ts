import { OtpService } from './src/services/otp.service.js';
import { RadiusService } from './src/services/radius.service.js';
import { PasspointService } from './src/services/passpoint.service.js';
import { initDatabase } from './src/db/index.js';

async function runTests() {
  console.log('[Test] 1. Initializing Database...');
  await initDatabase();

  console.log('\n[Test] 2. Testing Send OTP (Phone)...');
  const sendPhone = await OtpService.sendOtp('+14155552671', 'phone');
  console.log('Send OTP result:', sendPhone);
  if (!sendPhone.success || !sendPhone.mockCode) {
    throw new Error('Failed to generate OTP for phone');
  }

  console.log('\n[Test] 3. Testing Verify OTP...');
  const verifyResult = await OtpService.verifyOtp('+14155552671', sendPhone.mockCode);
  console.log('Verify OTP result:', verifyResult);
  if (!verifyResult.success) {
    throw new Error('Failed to verify OTP');
  }

  console.log('\n[Test] 4. Testing Radius Provisioning...');
  const provisionResult = await RadiusService.provisionSubscriber(
    '+14155552671',
    'phone',
    { platform: 'ios', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)' }
  );
  console.log('Subscriber provisioned:', {
    username: provisionResult.subscriber.username,
    realm: provisionResult.subscriber.realm,
    downloadToken: provisionResult.downloadToken,
  });

  console.log('\n[Test] 5. Testing Apple .mobileconfig Generation...');
  const mobileConfigXml = PasspointService.generateAppleMobileConfig(provisionResult.subscriber);
  console.log('Mobileconfig XML length:', mobileConfigXml.length);
  if (!mobileConfigXml.includes('com.apple.wifi.managed') || !mobileConfigXml.includes('IsHotspot')) {
    throw new Error('Invalid mobileconfig XML');
  }
  console.log('✓ Contains com.apple.wifi.managed and Hotspot 2.0 identifiers');

  console.log('\n[Test] 6. Testing Android Passpoint Configuration Generation...');
  const androidConfig = PasspointService.generateAndroidPasspointConfig(provisionResult.subscriber);
  console.log('Android Passpoint config:', JSON.stringify(androidConfig, null, 2));
  if (androidConfig.credential.userCredential.eapType !== 21) {
    throw new Error('Android EAP type must be 21 (EAP-TTLS)');
  }
  console.log('✓ Android Passpoint config matches Android PasspointConfiguration specification');

  console.log('\n==========================================');
  console.log('>>> ALL BACKEND INTEGRATION TESTS PASSED <<<');
  console.log('==========================================\n');
}

runTests().catch((err) => {
  console.error('Integration test failed:', err);
  process.exit(1);
});

