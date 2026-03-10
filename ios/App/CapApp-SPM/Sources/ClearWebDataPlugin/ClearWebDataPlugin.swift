import Capacitor
import Foundation
import WebKit

@objc(ClearWebDataPlugin)
public class ClearWebDataPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ClearWebDataPlugin"
    public let jsName = "ClearWebDataPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        .init(#selector(clearAllData))
    ]

    @objc func clearAllData(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let dataTypes = WKWebsiteDataStore.allWebsiteDataTypes()
            let dateFrom = Date(timeIntervalSince1970: 0)
            WKWebsiteDataStore.default().removeData(
                ofTypes: dataTypes,
                modifiedSince: dateFrom
            ) {
                call.resolve(["cleared": true])
            }
        }
    }
}
