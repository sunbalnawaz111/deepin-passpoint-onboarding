import Foundation
import Capacitor
import NetworkExtension

/**
 * Production-grade Capacitor Plugin for iOS Wi-Fi Passpoint (Hotspot 2.0).
 * Uses Apple's NetworkExtension framework (NEHotspotConfigurationManager)
 * to natively trigger the system prompt: "Join Wi-Fi Network '[NetworkName]'?"
 * with zero manual profile downloads or navigating to iOS Settings.
 */
@objc(WifiPasspointPlugin)
public class WifiPasspointPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WifiPasspointPlugin"
    public let jsName = "WifiPasspoint"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "connect", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "suggestPasspoint", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "connectHotspot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "installPasspointProfile", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "disconnect", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isSupported", returnType: CAPPluginReturnPromise)
    ]

    @objc func isSupported(_ call: CAPPluginCall) {
        if #available(iOS 11.0, *) {
            call.resolve([
                "supported": true,
                "platform": "ios",
                "framework": "NetworkExtension (NEHotspotConfigurationManager)"
            ])
        } else {
            call.resolve(["supported": false])
        }
    }

    @objc func connect(_ call: CAPPluginCall) {
        applyPasspoint(call)
    }

    @objc func suggestPasspoint(_ call: CAPPluginCall) {
        applyPasspoint(call)
    }

    @objc func connectHotspot(_ call: CAPPluginCall) {
        applyPasspoint(call)
    }

    @objc func installPasspointProfile(_ call: CAPPluginCall) {
        applyPasspoint(call)
    }

    private func applyPasspoint(_ call: CAPPluginCall) {
        guard #available(iOS 11.0, *) else {
            call.reject("NEHotspotConfigurationManager requires iOS 11.0 or higher")
            return
        }

        var fqdn = call.getString("fqdn") ?? "wifi.example.com"
        var username = call.getString("username") ?? ""
        var password = call.getString("password") ?? ""
        var realm = call.getString("realm") ?? fqdn

        if let homeSp = call.getObject("homeSp") {
            if let fqdnVal = homeSp["fqdn"] as? String { fqdn = fqdnVal }
        }

        if let credential = call.getObject("credential") {
            if let realmVal = credential["realm"] as? String { realm = realmVal }
            if let userCred = credential["userCredential"] as? [String: Any] {
                if let u = userCred["username"] as? String { username = u }
                if let p = userCred["password"] as? String { password = p }
            }
        }

        guard !username.isEmpty, !password.isEmpty else {
            call.reject("Missing required username or password for EAP-TTLS Wi-Fi authentication.")
            return
        }

        var roamingOis: [String] = ["5A03BA0000", "004096"]
        if let oisArray = call.getArray("roamingConsortiumOis", String.self) {
            roamingOis = oisArray
        } else if let homeSp = call.getObject("homeSp"),
                  let ois = homeSp["roamingConsortiumOis"] as? [String] {
            roamingOis = ois
        }

        let hs20Settings = NEHotspotHS20Settings(domainName: fqdn, roamingEnabled: true)
        hs20Settings.roamingConsortiumOIs = roamingOis

        let eapSettings = NEHotspotEAPSettings()
        eapSettings.username = username
        eapSettings.password = password
        eapSettings.supportedEAPTypes = [NEHotspotConfigurationEAPType.EAPTTLS.rawValue as NSNumber]
        eapSettings.innerAuthenticationType = .ttlsMSCHAPv2
        eapSettings.outerIdentity = "anonymous@\(realm)"

        let hotspotConfig = NEHotspotConfiguration(hs20Settings: hs20Settings, eapSettings: eapSettings)
        hotspotConfig.joinOnce = false

        NEHotspotConfigurationManager.shared.apply(hotspotConfig) { (error) in
            if let error = error {
                let nsError = error as NSError
                if nsError.domain == NEHotspotConfigurationErrorDomain {
                    switch nsError.code {
                    case NEHotspotConfigurationError.userDenied.rawValue:
                        call.reject("User declined the Wi-Fi connection prompt.", "USER_CANCELLED")
                        return
                    case NEHotspotConfigurationError.alreadyAssociated.rawValue:
                        call.resolve([
                            "success": true,
                            "status": "ALREADY_ASSOCIATED",
                            "message": "Device is already associated with this Passpoint Wi-Fi network."
                        ])
                        return
                    case NEHotspotConfigurationError.networkNotFound.rawValue:
                        call.resolve([
                            "success": true,
                            "status": "SAVED",
                            "message": "Passpoint credentials saved. Device will auto-join as soon as the network is in range."
                        ])
                        return
                    default:
                        break
                    }
                }
                call.reject("Failed to apply Wi-Fi configuration: \(error.localizedDescription)", "\(nsError.code)")
            } else {
                call.resolve([
                    "success": true,
                    "status": "CONNECTED",
                    "message": "Passpoint profile successfully installed in iOS Wi-Fi stack. Connecting..."
                ])
            }
        }
    }

    @objc func disconnect(_ call: CAPPluginCall) {
        guard #available(iOS 11.0, *) else {
            call.reject("Not supported on this iOS version")
            return
        }

        let fqdn = call.getString("fqdn") ?? "wifi.example.com"
        NEHotspotConfigurationManager.shared.removeConfiguration(forHS20DomainName: fqdn)
        call.resolve([
            "success": true,
            "message": "Passpoint configuration removed from iOS Wi-Fi settings."
        ])
    }
}
