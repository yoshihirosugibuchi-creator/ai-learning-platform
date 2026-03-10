import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // ログアウトフラグがUserDefaultsにある場合、WKWebViewのデータを同期削除
        // WKWebViewはlocalStorage.clear()をディスクに書かずに終了することがあるため、
        // ネイティブ側でSupabaseセッションデータを確実に削除する
        let defaults = UserDefaults.standard
        if defaults.string(forKey: "ale_logged_out") == "true" {
            NSLog("🚪 ALE: Logged out flag found, deleting WebKit data files synchronously")

            // ⚠️ フラグはAuthProviderが確認後に削除するため、ここでは残す

            // 1. WebKitデータディレクトリを同期的にファイルシステムから削除
            //    WKWebView作成前に実行されるため、localStorage復元を確実に防ぐ
            let libraryPath = NSSearchPathForDirectoriesInDomains(.libraryDirectory, .userDomainMask, true).first!
            let fileManager = FileManager.default

            // WebKit/WebsiteData（localStorage, IndexedDB, cookies等）
            let webkitDataPath = (libraryPath as NSString).appendingPathComponent("WebKit/WebsiteData")
            if fileManager.fileExists(atPath: webkitDataPath) {
                do {
                    try fileManager.removeItem(atPath: webkitDataPath)
                    NSLog("🚪 ALE: Deleted WebKit/WebsiteData")
                } catch {
                    NSLog("🚪 ALE: Failed to delete WebKit/WebsiteData: \(error)")
                }
            }

            // Caches内のWebKitデータも削除
            let cachesPath = NSSearchPathForDirectoriesInDomains(.cachesDirectory, .userDomainMask, true).first!
            let webkitCachePath = (cachesPath as NSString).appendingPathComponent("WebKit")
            if fileManager.fileExists(atPath: webkitCachePath) {
                do {
                    try fileManager.removeItem(atPath: webkitCachePath)
                    NSLog("🚪 ALE: Deleted Caches/WebKit")
                } catch {
                    NSLog("🚪 ALE: Failed to delete Caches/WebKit: \(error)")
                }
            }

            // 2. 非同期WKWebsiteDataStoreクリアも念のため実行
            let dataTypes = WKWebsiteDataStore.allWebsiteDataTypes()
            WKWebsiteDataStore.default().removeData(
                ofTypes: dataTypes,
                modifiedSince: Date(timeIntervalSince1970: 0)
            ) {
                NSLog("🚪 ALE: WKWebsiteDataStore also cleared via API")
            }

            NSLog("🚪 ALE: Synchronous WebKit data deletion complete")
        }

        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
