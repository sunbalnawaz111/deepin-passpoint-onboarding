#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

/**
 * Registers the Swift WifiPasspointPlugin with Capacitor's runtime bridge.
 */
CAP_PLUGIN(WifiPasspointPlugin, "WifiPasspoint",
    CAP_PLUGIN_METHOD(connect, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(suggestPasspoint, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(connectHotspot, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(installPasspointProfile, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(disconnect, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(isSupported, CAPPluginReturnPromise);
)
