import Capacitor
import Foundation
import WebKit

@objc(ALEClearWebData)
public class ALEClearWebData: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ALEClearWebData"
    public let jsName = "ALEClearWebData"
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
