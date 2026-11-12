package com.passpoint.onboarding.plugin

import android.content.Context
import android.net.wifi.WifiManager
import android.net.wifi.WifiNetworkSuggestion
import android.net.wifi.hotspot2.PasspointConfiguration
import android.net.wifi.hotspot2.pps.Credential
import android.net.wifi.hotspot2.pps.HomeSp
import android.os.Build
import androidx.annotation.RequiresApi
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Production-grade Capacitor Native Plugin for Android Wi-Fi Passpoint (Hotspot 2.0).
 * Registers Passpoint Release 2 configurations using WifiNetworkSuggestion (API 29+)
 * or legacy PasspointConfiguration (API 26-28).
 */
@CapacitorPlugin(name = "PasspointBridge")
class PasspointBridgePlugin : Plugin() {

    @PluginMethod
    fun isPasspointSupported(call: PluginCall) {
        val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
        val ret = JSObject()
        if (wifiManager == null) {
            ret.put("supported", false)
            ret.put("reason", "WifiManager service unavailable on this device")
            call.resolve(ret)
            return
        }

        // Passpoint / Hotspot 2.0 is supported from Android 8.0 (API 26) onwards
        val isSupported = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
        ret.put("supported", isSupported)
        ret.put("apiLevel", Build.VERSION.SDK_INT)
        call.resolve(ret)
    }

    @PluginMethod
    fun installPasspointProfile(call: PluginCall) {
        val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
        if (wifiManager == null) {
            call.reject("WifiManager unavailable")
            return
        }

        try {
            // Extract JSON parameters
            val homeSpJson = call.getObject("homeSp") ?: run {
                call.reject("Missing 'homeSp' in configuration payload")
                return
            }
            val credentialJson = call.getObject("credential") ?: run {
                call.reject("Missing 'credential' in configuration payload")
                return
            }
            val userCredJson = credentialJson.getJSObject("userCredential") ?: run {
                call.reject("Missing 'userCredential' in configuration payload")
                return
            }

            val fqdn = homeSpJson.getString("fqdn") ?: "wifi.example.com"
            val friendlyName = homeSpJson.getString("friendlyName") ?: "FastPass Free Wi-Fi"
            val realm = credentialJson.getString("realm") ?: fqdn
            val username = userCredJson.getString("username") ?: run {
                call.reject("Missing subscriber username")
                return
            }
            val password = userCredJson.getString("password") ?: run {
                call.reject("Missing subscriber password")
                return
            }
            val eapType = userCredJson.getInteger("eapType") ?: 21 // 21 = EAP-TTLS

            // Extract Roaming Consortium OIs
            val roamingOisArray = homeSpJson.getJSONArray("roamingConsortiumOis")
            val roamingOis = mutableListOf<Long>()
            if (roamingOisArray != null) {
                for (i in 0 until roamingOisArray.length()) {
                    val oiString = roamingOisArray.getString(i).replace("0x", "")
                    try {
                        val oiLong = oiString.toLong(16)
                        roamingOis.add(oiLong)
                    } catch (e: Exception) {
                        // ignore malformed OI
                    }
                }
            }

            // Build PasspointConfiguration object
            val passpointConfig = PasspointConfiguration().apply {
                homeSp = HomeSp().apply {
                    this.fqdn = fqdn
                    this.friendlyName = friendlyName
                    if (roamingOis.isNotEmpty()) {
                        this.roamingConsortiumOIs = roamingOis.toLongArray()
                    }
                }

                credential = Credential().apply {
                    this.realm = realm
                    this.userCredential = Credential.UserCredential().apply {
                        this.username = username
                        this.password = android.util.Base64.encodeToString(
                            password.toByteArray(Charsets.UTF_8),
                            android.util.Base64.NO_WRAP
                        )
                        this.eapType = eapType
                        this.nonEapInnerMethod = "MS-CHAP-V2"
                    }
                }
            }

            // Modern Android 10+ (API 29+) Network Suggestion Path
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                installViaNetworkSuggestion(wifiManager, passpointConfig, call)
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                // Android 8.0 - 9.0 Legacy Passpoint API
                wifiManager.addOrUpdatePasspointConfiguration(passpointConfig)
                val ret = JSObject()
                ret.put("success", true)
                ret.put("message", "Passpoint network profile added via legacy WifiManager.")
                call.resolve(ret)
            } else {
                call.reject("Passpoint (Hotspot 2.0) requires Android 8.0 (API 26) or higher.")
            }
        } catch (e: Exception) {
            call.reject("Failed to configure Passpoint network: ${e.message}", e)
        }
    }

    @RequiresApi(Build.VERSION_CODES.Q)
    private fun installViaNetworkSuggestion(
        wifiManager: WifiManager,
        passpointConfig: PasspointConfiguration,
        call: PluginCall
    ) {
        val suggestion = WifiNetworkSuggestion.Builder()
            .setPasspointConfig(passpointConfig)
            .setIsAppInteractionRequired(false)
            .setIsUserInteractionRequired(false)
            .build()

        val status = wifiManager.addNetworkSuggestions(listOf(suggestion))
        val ret = JSObject()

        when (status) {
            WifiManager.STATUS_NETWORK_SUGGESTIONS_SUCCESS -> {
                ret.put("success", true)
                ret.put("message", "Passpoint network successfully added to Android system suggestions.")
                call.resolve(ret)
            }
            WifiManager.STATUS_NETWORK_SUGGESTIONS_ERROR_ADD_DUPLICATE -> {
                ret.put("success", true)
                ret.put("message", "Passpoint profile is already registered and active.")
                call.resolve(ret)
            }
            WifiManager.STATUS_NETWORK_SUGGESTIONS_ERROR_ADD_EXCEEDS_MAX_PER_APP -> {
                call.reject("Suggestion limit exceeded for application.")
            }
            else -> {
                call.reject("Failed to register network suggestion (Status code: $status)")
            }
        }
    }
}

