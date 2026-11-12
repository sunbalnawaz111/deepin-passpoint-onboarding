package com.passpoint.onboarding;

import android.content.Context;
import android.content.Intent;
import android.net.wifi.WifiManager;
import android.net.wifi.WifiNetworkSuggestion;
import android.net.wifi.hotspot2.PasspointConfiguration;
import android.net.wifi.hotspot2.pps.Credential;
import android.net.wifi.hotspot2.pps.HomeSp;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Base64;
import android.util.Log;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;
import org.json.JSONArray;

/**
 * Production-grade Capacitor Plugin for Android Wi-Fi Passpoint (Hotspot 2.0).
 * Registers Passpoint Release 2 configurations directly into Android "Saved Networks"
 * using ACTION_WIFI_ADD_NETWORKS (API 30+), WifiNetworkSuggestion (API 29),
 * or legacy PasspointConfiguration (API 26-28) with EAP-TTLS and MS-CHAP-V2.
 */
@CapacitorPlugin(
    name = "WifiPasspoint",
    permissions = {
        @Permission(
            alias = "wifi",
            strings = {
                "android.permission.ACCESS_FINE_LOCATION",
                "android.permission.ACCESS_COARSE_LOCATION",
                "android.permission.ACCESS_WIFI_STATE",
                "android.permission.CHANGE_WIFI_STATE"
            }
        )
    }
)
public class WifiPasspointPlugin extends Plugin {

    private static final String TAG = "WifiPasspoint";

    @PluginMethod
    public void isSupported(PluginCall call) {
        WifiManager wifiManager = getWifiManager();
        JSObject ret = new JSObject();
        if (wifiManager == null) {
            ret.put("supported", false);
            ret.put("reason", "WifiManager service unavailable on this device");
            call.resolve(ret);
            return;
        }

        boolean supported = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O;
        ret.put("supported", supported);
        ret.put("apiLevel", Build.VERSION.SDK_INT);
        ret.put("platform", "android");
        call.resolve(ret);
    }

    @PluginMethod
    public void connect(PluginCall call) {
        installPasspoint(call);
    }

    @PluginMethod
    public void suggestPasspoint(PluginCall call) {
        installPasspoint(call);
    }

    @PluginMethod
    public void connectHotspot(PluginCall call) {
        installPasspoint(call);
    }

    @PluginMethod
    public void installPasspointProfile(PluginCall call) {
        installPasspoint(call);
    }

    private void installPasspoint(PluginCall call) {
        WifiManager wifiManager = getWifiManager();
        if (wifiManager == null) {
            call.reject("WifiManager unavailable on this device");
            return;
        }

        try {
            String fqdn = call.getString("fqdn", "wifi.example.com");
            String friendlyName = call.getString("friendlyName", "FastPass Free Wi-Fi");
            String realm = call.getString("realm", fqdn);
            String username = call.getString("username");
            String password = call.getString("password");
            int eapType = call.getInt("eapType", 21);
            String nonEapInnerMethod = call.getString("nonEapInnerMethod", "MS-CHAP-V2");
            String caCertStr = call.getString("caCertificate");

            JSObject homeSpJson = call.getObject("homeSp");
            if (homeSpJson != null) {
                if (homeSpJson.has("fqdn") && homeSpJson.getString("fqdn") != null) fqdn = homeSpJson.getString("fqdn");
                if (homeSpJson.has("friendlyName") && homeSpJson.getString("friendlyName") != null) friendlyName = homeSpJson.getString("friendlyName");
            }

            JSObject credentialJson = call.getObject("credential");
            if (credentialJson != null) {
                if (credentialJson.has("realm") && credentialJson.getString("realm") != null) realm = credentialJson.getString("realm");
                if (credentialJson.has("caCertificate") && credentialJson.getString("caCertificate") != null) caCertStr = credentialJson.getString("caCertificate");
                JSObject userCredJson = credentialJson.getJSObject("userCredential");
                if (userCredJson != null) {
                    if (userCredJson.has("username") && userCredJson.getString("username") != null) username = userCredJson.getString("username");
                    if (userCredJson.has("password") && userCredJson.getString("password") != null) password = userCredJson.getString("password");
                    if (userCredJson.has("eapType")) eapType = userCredJson.getInteger("eapType", 21);
                    if (userCredJson.has("nonEapInnerMethod") && userCredJson.getString("nonEapInnerMethod") != null) nonEapInnerMethod = userCredJson.getString("nonEapInnerMethod");
                }
            }

            if (fqdn == null || fqdn.trim().isEmpty()) fqdn = "wifi.example.com";
            if (friendlyName == null || friendlyName.trim().isEmpty()) friendlyName = "FastPass Free Wi-Fi";
            if (realm == null || realm.trim().isEmpty()) realm = fqdn;

            if (username == null || username.trim().isEmpty() || password == null || password.trim().isEmpty()) {
                call.reject("Missing required username or password for Passpoint subscriber.");
                return;
            }

            // 1. HomeSp
            HomeSp homeSp = new HomeSp();
            homeSp.setFqdn(fqdn.trim());
            homeSp.setFriendlyName(friendlyName.trim());

            // Extract Roaming Consortium OIs if provided
            List<Long> roamingOisList = new ArrayList<>();
            JSONArray oisArray = call.getArray("roamingConsortiumOis");
            if (oisArray == null && homeSpJson != null && homeSpJson.has("roamingConsortiumOis")) {
                oisArray = homeSpJson.optJSONArray("roamingConsortiumOis");
            }

            if (oisArray != null && oisArray.length() > 0) {
                final long maxOiValue = ((1L << 40) - 1);
                for (int i = 0; i < oisArray.length(); i++) {
                    try {
                        String item = oisArray.getString(i);
                        if (item == null) continue;
                        String oiStr = item.replace("0x", "").replace("0X", "").trim();
                        if (oiStr.isEmpty()) continue;
                        long oiVal = Long.parseLong(oiStr, 16);
                        if (oiVal > 0 && oiVal <= maxOiValue) {
                            roamingOisList.add(oiVal);
                        }
                    } catch (Exception ex) {
                        Log.w(TAG, "Skipping unparseable OI: " + ex.getMessage());
                    }
                }
            }

            if (!roamingOisList.isEmpty()) {
                long[] oisArr = new long[roamingOisList.size()];
                for (int i = 0; i < roamingOisList.size(); i++) {
                    oisArr[i] = roamingOisList.get(i);
                }
                homeSp.setRoamingConsortiumOis(oisArr);
            }

            // 2. Credential
            Credential credential = new Credential();
            credential.setRealm(realm.trim());
            Credential.UserCredential userCred = new Credential.UserCredential();
            userCred.setUsername(username.trim());
            userCred.setPassword(password);
            userCred.setEapType(eapType);
            userCred.setNonEapInnerMethod(nonEapInnerMethod != null && !nonEapInnerMethod.isEmpty() ? nonEapInnerMethod : "MS-CHAP-V2");
            credential.setUserCredential(userCred);

            X509Certificate rootCa = getOrLoadRootCertificate(caCertStr);
            if (rootCa != null) {
                credential.setCaCertificate(rootCa);
            }

            // 3. Assemble Passpoint Configuration
            PasspointConfiguration passpointConfig = new PasspointConfiguration();
            passpointConfig.setHomeSp(homeSp);
            passpointConfig.setCredential(credential);

            // 4. Save directly to Android "Saved Networks" using ACTION_WIFI_ADD_NETWORKS (API 30+)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                WifiNetworkSuggestion suggestion = new WifiNetworkSuggestion.Builder()
                    .setPasspointConfig(passpointConfig)
                    .build();

                ArrayList<WifiNetworkSuggestion> suggestionsList = new ArrayList<>();
                suggestionsList.add(suggestion);

                Bundle bundle = new Bundle();
                bundle.putParcelableArrayList(Settings.EXTRA_WIFI_NETWORK_LIST, suggestionsList);

                Intent intent = new Intent(Settings.ACTION_WIFI_ADD_NETWORKS);
                intent.putExtras(bundle);

                startActivityForResult(call, intent, "handleSaveNetworkResult");
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Android 10 fallback
                WifiNetworkSuggestion suggestion = new WifiNetworkSuggestion.Builder()
                    .setPasspointConfig(passpointConfig)
                    .build();
                wifiManager.addNetworkSuggestions(Collections.singletonList(suggestion));
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("status", "SUCCESS");
                ret.put("message", "Passpoint Wi-Fi registered. Android will auto-connect.");
                call.resolve(ret);
            } else {
                wifiManager.addOrUpdatePasspointConfiguration(passpointConfig);
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("status", "SUCCESS");
                ret.put("message", "Passpoint Wi-Fi profile added via legacy WifiManager.");
                call.resolve(ret);
            }

        } catch (Exception e) {
            Log.e(TAG, "Save network error: ", e);
            call.reject("Failed to configure Passpoint network: " + e.getMessage());
        }
    }

    @ActivityCallback
    private void handleSaveNetworkResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        JSObject ret = new JSObject();

        Intent data = result.getData();
        boolean alreadyExists = false;
        if (data != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            ArrayList<Integer> resultList = data.getIntegerArrayListExtra(Settings.EXTRA_WIFI_NETWORK_RESULT_LIST);
            if (resultList != null && !resultList.isEmpty()) {
                int resCode = resultList.get(0);
                if (resCode == Settings.ADD_WIFI_RESULT_ALREADY_EXISTS) {
                    alreadyExists = true;
                }
            }
        }

        if (alreadyExists) {
            ret.put("success", true);
            ret.put("status", "ALREADY_REGISTERED");
            ret.put("message", "Network is already registered in device Saved Networks.");
            call.resolve(ret);
        } else if (result.getResultCode() == android.app.Activity.RESULT_OK) {
            ret.put("success", true);
            ret.put("status", "SAVED");
            ret.put("message", "Network saved successfully to Saved Networks.");
            call.resolve(ret);
        } else {
            ret.put("success", false);
            ret.put("status", "CANCELLED");
            ret.put("message", "User cancelled saving the network.");
            call.reject("User cancelled saving the network");
        }
    }

    private X509Certificate getOrLoadRootCertificate(String caCertStr) {
        try {
            if (caCertStr != null && !caCertStr.trim().isEmpty()) {
                CertificateFactory cf = CertificateFactory.getInstance("X.509");
                byte[] certBytes = caCertStr.contains("-----BEGIN CERTIFICATE-----")
                        ? caCertStr.getBytes(StandardCharsets.UTF_8)
                        : Base64.decode(caCertStr, Base64.DEFAULT);
                ByteArrayInputStream bis = new ByteArrayInputStream(certBytes);
                X509Certificate cert = (X509Certificate) cf.generateCertificate(bis);
                bis.close();
                return cert;
            }

            // Android 11+ requirement: Load default system trust store certificate
            KeyStore keyStore = KeyStore.getInstance("AndroidCAStore");
            keyStore.load(null, null);
            Enumeration<String> aliases = keyStore.aliases();
            if (aliases.hasMoreElements()) {
                return (X509Certificate) keyStore.getCertificate(aliases.nextElement());
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not set CA certificate: " + e.getMessage());
        }
        return null;
    }

    private WifiManager getWifiManager() {
        Context context = getContext().getApplicationContext();
        return (WifiManager) context.getSystemService(Context.WIFI_SERVICE);
    }
}
