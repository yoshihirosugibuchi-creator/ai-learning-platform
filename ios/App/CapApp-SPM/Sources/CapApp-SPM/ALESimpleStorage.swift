import Capacitor
import Foundation

@objc(ALESimpleStorage)
public class ALESimpleStorage: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ALESimpleStorage"
    public let jsName = "ALESimpleStorage"
    public let pluginMethods: [CAPPluginMethod] = [
        .init(#selector(setItem)),
        .init(#selector(getItem)),
        .init(#selector(removeItem)),
        .init(#selector(clear))
    ]

    private let defaults = UserDefaults.standard
    private let prefix = "ale_"

    @objc func setItem(_ call: CAPPluginCall) {
        guard let key = call.getString("key"),
              let value = call.getString("value") else {
            call.reject("key and value are required")
            return
        }
        defaults.set(value, forKey: prefix + key)
        defaults.synchronize()
        call.resolve()
    }

    @objc func getItem(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else {
            call.reject("key is required")
            return
        }
        let value = defaults.string(forKey: prefix + key)
        call.resolve(["value": value as Any])
    }

    @objc func removeItem(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else {
            call.reject("key is required")
            return
        }
        defaults.removeObject(forKey: prefix + key)
        defaults.synchronize()
        call.resolve()
    }

    @objc func clear(_ call: CAPPluginCall) {
        let allKeys = defaults.dictionaryRepresentation().keys
        for key in allKeys where key.hasPrefix(prefix) {
            defaults.removeObject(forKey: key)
        }
        defaults.synchronize()
        call.resolve()
    }
}
