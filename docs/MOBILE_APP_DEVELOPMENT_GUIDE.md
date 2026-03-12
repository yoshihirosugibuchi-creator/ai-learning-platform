# ALE学習 モバイルアプリ開発ガイド

**プロジェクト**: AI Learning Enterprise (ALE学習)
**最終更新**: 2026-03-12

---

## 全体ロードマップ

| ステップ | 内容 | 状態 |
|---------|------|------|
| **Step 1** | PWA化 | 完了 |
| **Step 2** | Capacitor iOSアプリ + Face ID + GitHub Actions | 完了 |
| **Step 3** | 実機テスト（AdHoc配布） | 完了（ログイン/ログアウト/Face ID確認済み） |
| **Step 4** | ローカルDB化（WatermelonDB + SW有効化） | 設計完了・実装未着手 |
| **Step 5** | React Native移行（必要に応じて） | 未着手 |

---

## Step 1: PWA化 [完了]

### 概要
Next.jsアプリをProgressive Web App化。ブラウザから「ホーム画面に追加」でネイティブアプリ風に使える。

### 実装ファイル一覧

| ファイル | 役割 |
|---------|------|
| `app/manifest.ts` | PWAマニフェスト定義 |
| `public/sw.js` | Service Worker |
| `components/pwa/ServiceWorkerRegistration.tsx` | SW登録コンポーネント |
| `app/offline/page.tsx` | オフラインページ |
| `app/layout.tsx` | PWAメタデータ設定 |
| `public/icons/icon-192x192.png` | PWAアイコン（小） |
| `public/icons/icon-512x512.png` | PWAアイコン（大） |
| `public/icons/apple-touch-icon.png` | iOS用アイコン |

### マニフェスト設定 (`app/manifest.ts`)

```typescript
{
  name: 'AI Learning Enterprise - AIパーソナライズ学習プラットフォーム',
  short_name: 'ALE学習',
  start_url: '/',
  display: 'standalone',    // ブラウザUIなし
  background_color: '#ffffff',
  theme_color: '#4f46e5',   // インディゴ
  orientation: 'portrait',
  icons: [
    { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
  ]
}
```

### Service Worker (`public/sw.js`)

キャッシュ戦略:
- **ナビゲーション（HTMLページ）**: ネットワークファースト → キャッシュ → オフラインページ
- **静的アセット（`/_next/static/`、画像）**: Stale-While-Revalidate
- **APIルート・Supabase**: 常にネットワーク（キャッシュなし）
- **非GETリクエスト**: スキップ

```javascript
const CACHE_NAME = 'ale-v1'
const OFFLINE_URL = '/offline'
// install時にオフラインページのみプリキャッシュ
// activate時に古いキャッシュを削除
```

### SW登録 (`components/pwa/ServiceWorkerRegistration.tsx`)

- 本番環境のみSW登録
- ネイティブアプリ（Capacitor）内ではSW登録をスキップ（WebViewとの競合回避）

### レイアウト設定 (`app/layout.tsx`)

```typescript
// PWAメタデータ
appleWebApp: {
  capable: true,
  statusBarStyle: 'default',
  title: 'ALE学習',
}
// ビューポート
viewport: {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',  // ノッチ対応
}
```

---

## Step 2: Capacitor iOSアプリ化 [一部完了]

### アーキテクチャ

**WebView（server.url）方式**を採用:
- Capacitorの`server.url`でVercel本番URLをWebViewに読み込む
- Next.jsのAPIルート・サーバーコンポーネントをそのまま活用
- ネイティブプラグイン（Face ID等）はCapacitorブリッジ経由

```
[iOS App (Capacitor)] → [WebView] → [Vercel本番URL]
                      ↕
              [ネイティブAPI]
              (Face ID, Keychain, StatusBar)
```

### Phase A: Capacitorプロジェクトセットアップ [完了]

#### A1. インストール済みパッケージ

```json
{
  "@capacitor/core": "8.2.0",
  "@capacitor/cli": "8.2.0",
  "@capacitor/ios": "8.2.0",
  "@capacitor/status-bar": "8.0.1",
  "@capacitor/splash-screen": "8.0.1",
  "@aparajita/capacitor-biometric-auth": "10.0.0",
  "@aparajita/capacitor-secure-storage": "8.0.0"
}
```

注意: package.jsonのoverridesでCapacitor coreパッケージを8.2.0に固定

#### A2. Capacitor設定 (`capacitor.config.ts`)

```typescript
const config: CapacitorConfig = {
  appId: 'com.ale.learning',
  appName: 'ALE学習',
  webDir: 'out',
  server: {
    url: 'https://ai-learning-platform-next.vercel.app',
    cleartext: false,
    hostname: 'ai-learning-platform-next.vercel.app',
  },
  ios: {
    scheme: 'ALE学習',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#4f46e5',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#4f46e5',
    },
  },
}
```

#### A3. プラットフォーム検出 (`lib/capacitor-utils.ts`)

```typescript
isNativeApp()   // Capacitorネイティブ環境か判定
isIOSNative()   // iOSネイティブか判定
isBrowser()     // ブラウザ（PWA含む）か判定
```

#### A4. iOSプロジェクト構造

```
ios/
├── App/
│   ├── App.xcodeproj/        ← Xcodeプロジェクト
│   ├── App/
│   │   ├── AppDelegate.swift ← アプリデリゲート（OAuth対応済み）
│   │   ├── Assets.xcassets/  ← アイコン・スプラッシュ画像
│   │   ├── Base.lproj/       ← Storyboard
│   │   ├── Info.plist        ← アプリ設定（Face ID許可含む）
│   │   └── capacitor.config.json  ← 生成された設定
│   └── CapApp-SPM/           ← Swift Package Manager統合
└── capacitor-cordova-ios-plugins/
```

#### A5. 設定ファイル変更

- `tsconfig.json` — `exclude`に`ios/**/*`, `out/**/*`追加
- `.gitignore` — `out/`追加（`ios/`はGitHub Actions用にコミット）
- `eslint.config.mjs` — `ios/**`をignoresに追加

---

### Phase B: Face ID / 生体認証 [コード完了・実機テスト未]

#### B1. 生体認証サービス (`lib/biometric-auth.ts`)

```typescript
// Face ID / Touch IDの対応状況チェック
checkBiometricAvailability()
// → { isAvailable: boolean, biometryType: 'faceId'|'touchId'|'none', reason: string }

// 生体認証プロンプト表示
authenticateWithBiometric()
// → { success: boolean, error?: string }
// 認証理由: "ALE学習にログインするために認証してください"
// デバイス認証（PIN/パスワード）へのフォールバックあり

// ラベル取得
getBiometryLabel(type) // → 'Face ID' | 'Touch ID' | '生体認証'
```

#### B2. UserDefaultsラッパー (`lib/native-secure-storage.ts`)

ALESimpleStorageカスタムCapacitorプラグイン経由でUserDefaultsに保存。

```typescript
// 保存データ
KEYS = {
  REFRESH_TOKEN: 'refresh_token',         // 認証トークン（Face ID用）
  USER_EMAIL: 'user_email',               // メールアドレス
  BIOMETRIC_ENABLED: 'biometric_enabled', // 生体認証ON/OFF
  SESSION_ACTIVE: 'session_active',       // セッション有効フラグ（ログアウト永続化用）
}

// 関数一覧
storeRefreshToken(token)        // トークン保存
getRefreshToken()               // トークン取得
storeUserEmail(email)           // メール保存
getUserEmail()                  // メール取得
setBiometricEnabled(bool)       // 生体認証フラグ保存
isBiometricEnabled()            // 生体認証フラグ取得
clearSecureStorage()            // 全データクリア
setSessionActiveFlag(active)    // セッション有効フラグ設定/解除
isSessionActive()               // セッション有効フラグ確認
```

**重要**: ブラウザ環境では全関数がno-op（何もしない）。`isSessionActive()` のみブラウザでは `true` を返す。

#### B3. Face ID有効化ダイアログ (`components/native/BiometricEnableDialog.tsx`)

- Radix UI Dialog使用
- 指紋アイコン表示
- 「{Face ID}を有効にする」ボタン + 「あとで」ボタン

#### B4. ネイティブ検出 (`components/native/NativeAppDetector.tsx`)

アプリ起動時に自動実行:
1. `body`に`native-app`クラス追加
2. iOS時: `native-ios`クラス追加
3. ステータスバーをDarkスタイルに設定
4. スプラッシュスクリーンを非表示

#### B5. Face ID認証フロー（設計）

```
初回ログイン:
  email/password入力 → 認証成功
  → Face ID対応端末？ → 「Face IDを有効にしますか？」ダイアログ
  → 有効にする → Keychainにトークン・メール・フラグ保存

次回以降:
  アプリ起動 → 生体認証有効？
  → Yes → Face IDプロンプト → 成功 → Keychainのトークンでセッション復元
  → No → 通常のemail/passwordログイン画面

トークン期限切れ:
  Face ID認証成功 → トークン失効 → email/passwordにフォールバック
```

#### B6. ログイン/ログアウト永続化の設計と注意点（2026-03-11 実績）

Capacitor `server.url`方式（WebView）でのログイン/ログアウト永続化は、ブラウザとは根本的に異なる課題がある。以下は実際にはまった問題と最終的な解決策の記録。

##### 根本問題: WKWebView の localStorage は信頼できない

Capacitor `server.url`モードでは、WKWebViewが別プロセスのVercel URLを読み込む。この環境で `localStorage` には以下の問題がある:

1. **localStorage.clear() がディスクに反映されない場合がある**: ログアウト時に `localStorage.clear()` を呼んでも、アプリをすぐキルするとフラッシュが間に合わず、次回起動時に古いデータが復元される
2. **WKWebViewのデータは別プロセスが管理**: `Library/WebKit/WebsiteData/` をファイルシステムから直接削除しても、実行中のWKWebViewプロセスには反映されない（iOS新版では効果なし）
3. **Supabase は localStorage からセッションを復元する**: `onAuthStateChange(INITIAL_SESSION)` がモジュールロード時に同期的に発火し、localStorage のゴーストセッションで自動ログインしてしまう

##### 試して失敗した方法

| 方法 | なぜダメか |
|------|-----------|
| localStorage にログアウトフラグを保存 | localStorage 自体が信頼できない（上記1番の問題） |
| AppDelegateで WKWebsiteDataStore.removeData() | 非同期処理がWebView読み込みに間に合わない |
| AppDelegateで WebKit ディレクトリを直接削除 | iOS新版では別プロセス管理のため効果なし |
| Supabase のカスタムストレージアダプタ（ALESimpleStorage → UserDefaults） | ログイン自体ができなくなった（Supabaseの内部動作と非互換） |
| `supabase.auth.signOut({ scope: 'global' })` のみ | サーバー側トークン無効化はするが、access tokenは約1時間有効なまま。localStorage のセッションデータも残る |
| `supabase.auth.signOut({ scope: 'local' })` | **ドキュメント上はローカルのみクリアとされるが、実際にはサーバー側のrefresh_tokenも無効化される**（2026-03-12確認）。Face ID用トークンが使えなくなる |

##### 最終解決策: UserDefaults `session_active` フラグ + JS側チェック

```
■ ログイン時:
  Supabase onAuthStateChange(SIGNED_IN)
  → UserDefaults に session_active = true を保存
  → Face ID有効時: 最新のrefresh_tokenもUserDefaultsに保存

■ ログアウト時（AuthProvider.signOut）:
  1. UserDefaults の session_active を削除
  2. Face ID有効時: supabase.auth.signOut() を呼ばない（トークン保持）
     Face ID無効時: supabase.auth.signOut({ scope: 'global' })
  3. localStorage.clear()
  4. React 状態クリア

■ アプリ再起動時（AuthProvider.initializeAuth）:
  1. UserDefaults の session_active をチェック
  2. false の場合 → localStorage.clear()のみ（signOut()は呼ばない）
  3. true の場合 → 通常のセッション復元フロー
```

##### 重要な実装ポイント

**1. `nativeCheckDoneRef` による INITIAL_SESSION ブロック**

Supabase の `onAuthStateChange(INITIAL_SESSION)` は AuthProvider の `initializeAuth`（非同期）よりも先に発火する。UserDefaults チェック完了前にユーザー状態がセットされてしまうのを防ぐ:

```typescript
const nativeCheckDoneRef = useRef(false)

// onAuthStateChange ハンドラ内:
if (event === 'INITIAL_SESSION' && !nativeCheckDoneRef.current) {
  return // UserDefaults チェック完了まで無視
}

// initializeAuth 内:
const active = await isSessionActive() // UserDefaults チェック
if (!active) { /* ゴーストセッション破棄 */ }
nativeCheckDoneRef.current = true // チェック完了、以降のイベントは通常処理
```

**2. 全ログアウト経路の統一**

ログアウトボタンが複数箇所にある場合、**全て同じ `AuthProvider.signOut` を呼ぶこと**。別のログアウト関数（例: `useUserContext().logout` = localStorage のキー1つだけ削除）を使うと、UserDefaults フラグが解除されず再起動時にログイン画面にならない。

```
❌ MobileNav で useUserContext().logout を使用
   → logoutUser() = localStorage.removeItem() のみ
   → session_active フラグ未解除 → 再起動時にホーム画面表示

✅ MobileNav で useAuth().signOut を使用
   → setSessionActiveFlag(false) + localStorage.clear()
   → Face ID有効時: signOut()スキップ（トークン保持）
   → Face ID無効時: signOut({ scope: 'global' })
   → 正しくログアウト永続化
```

**3. Supabase のストレージアダプタは変更しない**

Supabase クライアントの `storage` オプションにカスタムアダプタ（UserDefaults等）を設定すると、Supabase 内部の同期的な読み書きと非同期な UserDefaults アクセスの間で不整合が起きる。localStorage をそのまま使い、UserDefaults は「セッション有効フラグ」としてのみ使用する。

##### 関連ファイル

| ファイル | 役割 |
|---------|------|
| `lib/supabase.ts` | onAuthStateChange で session_active フラグ同期 |
| `components/auth/AuthProvider.tsx` | initializeAuth で UserDefaults チェック、signOut で全クリア |
| `lib/native-secure-storage.ts` | UserDefaults ラッパー（setSessionActiveFlag / isSessionActive） |
| `ios/App/App/AppDelegate.swift` | WebKit 削除コードは効果なしと判明、コメントのみ残存 |

#### B7. Face ID / 生体認証の注意点

##### 現在の状態
- Face ID のコード実装は完了（`lib/biometric-auth.ts`, `lib/native-secure-storage.ts`）
- **実機テストは未実施**（TestFlight配布後に確認予定）

##### 押さえるべきポイント

**1. Face ID はログインの「ショートカット」であり、セッション管理の代替ではない**

Face ID が成功したら Keychain に保存済みの refresh token で Supabase セッションを復元する。Face ID 自体がセッション状態を管理するわけではない。

```
Face ID 成功 → Keychain から refresh_token 取得
→ supabase.auth.refreshSession({ refresh_token }) でセッション復元
→ 失敗した場合（トークン期限切れ等）→ email/password ログインにフォールバック
```

**2. Face ID 有効化のタイミング**

- 初回 email/password ログイン成功後に「Face ID を有効にしますか？」ダイアログを表示
- ユーザーが「有効にする」を選んだら:
  - Keychain に refresh_token + email を保存
  - UserDefaults に biometric_enabled = true を保存
- 設定画面から ON/OFF 切り替え可能にする

**3. Face ID有効時のログアウトではトークンを削除しない（重要）**

Face ID有効時のログアウトでは、UserDefaultsの`refresh_token`・`user_email`・`biometric_enabled`を**保持**する。`supabase.auth.signOut()`も呼ばない。理由:
- `signOut()`は`scope: 'local'`でもサーバー側のrefresh_tokenを無効化する（2026-03-12確認）
- トークンが無効化されるとFace IDログイン時の`refreshSession()`が「refresh token not found」で失敗する
- `session_active`フラグのみ`false`にすることで、ログアウト状態の制御とトークン保持を両立

Face IDを**無効化**する場合（設定画面からOFF）のみ`clearSecureStorage()`で全データクリアする。

**4. Info.plist の `NSFaceIDUsageDescription` は必須**

App Store 審査で Face ID の使用理由が必要。現在の設定:
```xml
<key>NSFaceIDUsageDescription</key>
<string>Face IDを使用して素早くログインします</string>
```
この説明文がないと審査リジェクトされる。

**5. シミュレータでは Face ID テストに限界がある**

Xcode シミュレータでは `Features > Face ID > Enrolled` で Face ID を有効化できるが、Keychain の挙動は実機と異なる場合がある。最終確認は必ず実機（TestFlight）で行う。

#### B8. iOS Info.plist 設定

```xml
<!-- Face ID使用説明（App Store審査で必須） -->
<key>NSFaceIDUsageDescription</key>
<string>Face IDを使用して素早くログインします</string>

<!-- 暗号化の非使用宣言（Export Compliance） -->
<key>ITSAppUsesNonExemptEncryption</key>
<false/>

<!-- アプリ表示名 -->
<key>CFBundleDisplayName</key>
<string>ALE学習</string>
```

---

### Phase C: GitHub Actions iOSビルド [完了]

#### C1. Apple Developer Portal 事前準備（手動で実施済み）

Apple Developer Program（年額$99/12,980円）への加入が前提。

##### 1. App ID登録
1. [developer.apple.com](https://developer.apple.com) → Certificates, Identifiers & Profiles
2. Identifiers → 「+」ボタン
3. App IDs → Continue
4. Platform: iOS → Bundle ID: `com.ale.learning` (Explicit)
5. Description: `ALE Learning`
6. Capabilities: 必要なものにチェック（Face IDは自動）
7. Register

##### 2. Distribution証明書作成
1. Certificates → 「+」ボタン
2. 「Apple Distribution」を選択 → Continue
3. CSR（Certificate Signing Request）の作成:
   ```bash
   # Mac の場合: キーチェーンアクセス → 証明書アシスタント → CAに証明書を要求
   # Mac がない場合: OpenSSLで生成
   openssl req -nodes -newkey rsa:2048 -keyout distribution.key -out distribution.csr \
     -subj "/emailAddress=your@email.com/CN=ALE Distribution/C=JP"
   ```
4. CSRファイルをアップロード → Download (.cer)
5. .p12ファイルに変換:
   ```bash
   # .cerをPEMに変換
   openssl x509 -in distribution.cer -inform DER -out distribution.pem -outform PEM
   # .p12にパッケージ化
   openssl pkcs12 -export -out distribution.p12 \
     -inkey distribution.key -in distribution.pem \
     -password pass:YOUR_PASSWORD
   ```
6. Base64エンコード（GitHub Secrets用）:
   ```bash
   base64 -i distribution.p12 | pbcopy  # macOS
   # または
   base64 distribution.p12 > distribution_base64.txt  # Linux
   ```

##### 3. Provisioning Profile作成
1. Profiles → 「+」ボタン
2. Distribution → App Store Connect → Continue
3. App ID: `com.ale.learning` を選択
4. Certificate: 上で作成したDistribution証明書を選択
5. Profile Name: `ALE Learning Distribution`
6. Generate → Download (.mobileprovision)
7. Base64エンコード:
   ```bash
   base64 -i ALE_Learning_Distribution.mobileprovision > profile_base64.txt
   ```

##### 4. App Store Connectでアプリ登録
1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → My Apps
2. 「+」→ 新規App
3. プラットフォーム: iOS
4. Name: `ALE学習`
5. Primary Language: Japanese
6. Bundle ID: `com.ale.learning`
7. SKU: `ale-learning`（任意の一意ID）
8. Create

##### 5. App Store Connect API Key作成
1. App Store Connect → Users and Access → Integrations → App Store Connect API
2. 「+」ボタン → Name: `GitHub Actions` → Access: Admin
3. Generate → Download (.p8ファイル)
4. **Key ID** と **Issuer ID** をメモ（画面上部に表示）
5. .p8ファイルをBase64エンコード:
   ```bash
   base64 -i AuthKey_XXXXXXXXXX.p8 > apikey_base64.txt
   ```
6. **注意**: .p8ファイルは一度しかダウンロードできない

#### C2. GitHub Secrets 登録（実施済み）

リポジトリ → Settings → Secrets and variables → Actions → New repository secret

| Secret名 | 値の取得元 | 説明 |
|-----------|-----------|------|
| `APPLE_CERTIFICATE_BASE64` | distribution.p12をBase64エンコード | 署名証明書 |
| `APPLE_CERTIFICATE_PASSWORD` | .p12作成時のパスワード | 証明書パスワード |
| `APPLE_PROVISIONING_PROFILE_BASE64` | .mobileprovisionをBase64エンコード | プロビジョニングプロファイル |
| `APPLE_TEAM_ID` | Apple Developer → Membership → Team ID | チームID（10桁英数字） |
| `APP_STORE_CONNECT_API_KEY_ID` | API Key作成時に表示 | APIキーID |
| `APP_STORE_CONNECT_API_ISSUER_ID` | API Key画面上部に表示 | Issuer ID |
| `APP_STORE_CONNECT_API_KEY_BASE64` | .p8ファイルをBase64エンコード | APIキー本体 |

#### C3. GitHub Actions ワークフロー (`.github/workflows/ios-build.yml`)

**トリガー:**
- `workflow_dispatch` — GitHub画面から手動実行
- `v*-ios` タグプッシュ — `git tag v1.0.0-ios && git push --tags`

**ビルド環境:**
- ランナー: `macos-15`
- Xcode: `26.2`
- Node.js: `v22`

**ビルドフロー:**
```
1. チェックアウト & npm ci
2. npx cap sync ios（Web→iOS同期）
3. Swift Package依存解決
4. 一時Keychain作成 → 証明書(.p12)インポート
5. Provisioning Profileインストール（UUID自動抽出）
6. xcodebuild archive（Release, Manual署名）
7. IPA Export（ExportOptions.plist: app-store-connect方式）
8. altool でTestFlightアップロード
   - AuthKeyは ~/.private_keys/ に配置（altoolの検索パス）
9. IPAをGitHub Artifactsに保存（30日間）
10. クリーンアップ（Keychain・証明書削除）
```

**手動ビルド実行方法:**
1. GitHub → リポジトリ → Actions タブ
2. 「iOS Build & TestFlight Upload」を選択
3. 「Run workflow」→ Branch: main → 「Run workflow」

**タグでビルド実行:**
```bash
git tag v1.0.1-ios
git push origin v1.0.1-ios
```

---

### Phase D: ネイティブUI調整 [完了]

- Safe area CSS変数追加（`app/globals.css`）— iPhoneノッチ/Dynamic Island対応
- `NativeAppDetector`コンポーネント（`components/native/NativeAppDetector.tsx`）
- `app/layout.tsx`に`<NativeAppDetector />`追加

#### SplashScreen（スプラッシュ画面）について [保留]

**現状**: `capacitor.config.ts`にSplashScreen設定あり。`NativeAppDetector`で`SplashScreen.hide()`を呼んでいるが、**実機では表示されていない**。

**原因**: `server.url`モード（Vercel URLをWebViewで読み込む方式）では、CapacitorのSplashScreenプラグインのJS制御がWebView読み込み完了前に間に合わない。一般的なネイティブアプリではローカルリソースの読み込み中にブランドロゴを表示する用途で使われる（LINE、メルカリ等）が、ALEのようなWebView方式ではプラグインではなく、Xcode側の`LaunchScreen.storyboard`にALEロゴを設定する方式が確実。

**対応方針**: ローカルDB対応（Step 4）でネイティブ側の変更が増えるタイミングでまとめて対応予定。IPA再ビルドが必要。現状でも実用上の問題はない（起動→白画面→ページ表示、の流れで普通に使える）。

---

## Step 3: 実機テスト [AdHoc配布で完了]

### 現在の状態

TestFlightは審査が通らず、**AdHoc配布**で実機テストを実施。

| 項目 | 状態 |
|------|------|
| GitHub ActionsでIPAビルド | 完了 |
| TestFlightアップロード | 審査未通過（AdHocに切替） |
| **AdHoc配布・実機インストール** | **完了** |
| ログイン/ログアウト動作確認 | **完了（2026-03-11）** |
| ログアウト後→アプリキル→再起動→ログイン画面表示 | **完了（2026-03-11）** |
| Face ID実機テスト | **完了（AdHocインストールで確認済み）** |
| ステータスバー・ノッチ表示確認 | 完了 |

### TestFlight設定手順（実施済み）

#### 内部テスト設定
1. App Store Connect → TestFlight → Internal Testing
2. 「+」でグループ作成 → テスターのApple IDメールを追加
3. ビルドをグループに割り当て
4. テスターに招待メールが届く → TestFlightアプリからインストール

#### 外部テスト設定
1. App Store Connect → TestFlight → External Testing
2. 「+」でグループ作成 → テスターのメールを追加
3. ビルドをグループに割り当て → **Appleの審査が必要**（初回24-48時間）
4. 審査通過後、テスターに招待メールが届く
5. 外部テストでは「公開リンク」も生成可能（メール不要でインストール可能）

#### 既知の問題
- 内部テストの招待メールが届かない（Apple IDメール、迷惑メール設定は問題なし）
- 外部テストは審査待ち
- TestFlightアプリで「コードを使う」画面が表示される（内部テスターとして認識されていない可能性）

### 実機テスト確認項目（AdHoc配布で確認済み）

- [x] アプリ起動 → Vercel URLが正常読み込み
- [x] ログイン画面表示 → email/passwordでログイン
- [x] ログアウト → アプリキル → 再起動 → ログイン画面表示（ヘッダー・サイドメニュー両方）
- [x] Face ID有効化ダイアログ表示 → 有効にする
- [x] Face IDによる認証動作確認
- [x] Face ID有効→ログアウト→Face IDで再ログイン成功（2026-03-12）
- [x] ステータスバー表示（ダークスタイル）
- [x] ノッチ/Dynamic Island周りのレイアウト
- [ ] スプラッシュスクリーン表示（2秒 → 自動非表示）
- [ ] オフライン時の動作確認

---

## Step 4: ローカルデータベース化 [設計完了・実装未着手]

### 目的

1. **オフライン対応**: ネットワーク切断時でもクイズ・学習・ケーススタディを実行可能にする
2. **パフォーマンス改善**: コレクションページ等のN+1クエリ問題を解消（現状: 200+クエリ → ローカルJOIN 1発）
3. **React Native移行準備**: データ層をWatermelonDBで構築し、将来のRN移行時にアダプタ切替のみで再利用

### 合わせて対応する項目（IPA再ビルド必要）

- **SplashScreen**: `LaunchScreen.storyboard`にALEロゴ設定（Phase D参照）
- **AppDelegate.swift整理**: 不要コメント除去（2026-03-11にWebKit削除コードを整理済み）

### 技術選定

**WatermelonDB** を採用。

| 方式 | 判定 | 理由 |
|------|------|------|
| **WatermelonDB** | **採用** | 内部SQLite、同期プロトコル内蔵、Lazy Loading、RN移行時アダプタ切替のみ |
| SQLite直接 | 不採用 | 同期・ORM・React連携を全て自作する必要がある |
| IndexedDB | 不採用 | 複雑なクエリ・大量データに弱い、RN/Flutter非対応 |

#### WatermelonDBの構造

```
WatermelonDB = SQLite + ORM + 同期プロトコル + React連携 + Lazy Loading

現環境（Capacitor WebView）: LokiJS + IndexedDB永続化アダプタ
将来（React Native）:       Native SQLiteアダプタ（JSI経由、高速）
```

#### 選定理由の詳細

- **同期プロトコル内蔵**: `synchronize()` でpull/push型の差分同期。自作不要
- **Lazy Loading**: コレクション表示で効果大。表示分だけロード
- **Observable queries**: データ変更時にReactコンポーネントが自動再描画
- **RN移行パス**: モデル定義・クエリ・同期ロジックがそのまま使える

---

### Phase 0: Service Worker有効化（アプリシェルのオフラインキャッシュ）

#### 背景

現在のアプリは `server.url` でVercelからすべて読み込むため、オフラインではアプリ画面自体が表示できない。Service Workerでアプリシェル（HTML/JS/CSS）をキャッシュし、オフラインでも画面表示を可能にする。

#### キャッシュの動作

```
■ 初回起動（オンライン必須）
  Vercelからアプリ全体をダウンロード → SWがキャッシュに保存

■ 2回目以降の起動
  オンライン時: Vercelから取得しつつ、キャッシュも更新
  オフライン時: キャッシュから表示

■ アプリ終了（キル）
  キャッシュは保持される（消えない）

■ アプリ削除 / iOSストレージ圧迫時
  キャッシュは消える → 再度オンラインでの読み込みが必要
```

#### 実装内容

1. `components/pwa/ServiceWorkerRegistration.tsx` — ネイティブアプリでのSWスキップを解除
2. `public/sw.js` — プリキャッシュマニフェストを拡充（全ページ、JSチャンク、CSS）
3. オフライン時のフォールバック表示の改善

#### 注意点

- WKWebViewでのSW動作は完全な保証はない（iOSバージョン依存）
- 確実なオフラインアプリシェルはRN移行時に解決（アプリ自体がローカル）
- Phase 0は「通常利用ではオフラインでも動く」レベルの対応

---

### Phase 1: WatermelonDB導入（マスタデータのローカル化）

#### ローカル化対象テーブル（マスタデータ: サーバー→ローカル同期、読み取り専用）

##### クイズ関連

| テーブル | 内容 | 備考 |
|---------|------|------|
| `quiz_questions` | クイズ問題（問題文、選択肢4つ、正解、解説、ヒント3段階） | メインの問題プール |
| `quiz_packs` | クイズパック定義（カテゴリ・難易度のフィルタ設定） | |
| `session_quizzes` | コース内埋め込みクイズ | learning_sessionsに紐づく |

##### ケーススタディ関連

| テーブル | 内容 | 備考 |
|---------|------|------|
| `case_study_problems` | ケーススタディ問題（シナリオ本文、難易度、業界、テンプレート種別） | |
| `case_study_steps` | 問題内ステップ定義（質問、選択肢、模範解答、スキル軸、配点） | problems に1:N |
| `case_study_rubric_axes` | 18軸評価ルーブリック（スコアアンカー1-5） | 全問題共通 |
| `case_study_options` | 設定オプション（テンプレート種別、業務フェーズ等の列挙値） | |
| `case_study_course_links` | コースとの紐付け（どのセッション後に表示するか） | |

##### 学習コンテンツ

| テーブル | 内容 | 備考 |
|---------|------|------|
| `learning_courses` | コース | 最上位 |
| `learning_genres` | ジャンル | courses に1:N |
| `learning_themes` | テーマ（reward_card_data含む） | genres に1:N |
| `learning_sessions` | セッション | themes に1:N |
| `session_contents` | コンテンツ本文（Markdown） | sessions に1:N |

##### デコード・lookup

| テーブル | 内容 | 備考 |
|---------|------|------|
| `skill_levels` | スキルレベル（名前、色、表示順） | |
| `categories` | カテゴリ | |
| `subcategories` | サブカテゴリ | |
| `xp_settings` | XP設定（計算パラメータ） | |
| `wisdom_cards` | 格言カードマスタ（名言、著者、レアリティ等） | |

**マスタデータ合計: 約16テーブル**

#### 同期戦略（マスタデータ）

```
■ アプリ起動時（オンライン）
  サーバーの updated_at と ローカルの最終同期日時を比較
  → 差分があるテーブルのみ pull 同期
  → WatermelonDB の synchronize() で実行

■ アプリ起動時（オフライン）
  ローカルDBのキャッシュをそのまま使用
  → 次回オンライン時に同期

■ 同期頻度
  マスタデータ: アプリ起動時 + バックグラウンド復帰時
  問題データが大量の場合: カテゴリ単位で差分同期
```

---

### Phase 2: ユーザーデータのローカルキャッシュ＋書き込みキュー

#### ローカル化対象テーブル（ユーザーデータ: ローカルキャッシュ＋サーバー送信）

##### クイズ

| テーブル | 内容 | 同期方向 |
|---------|------|---------|
| `quiz_sessions` | クイズセッション記録（スコア、正答率、所要時間） | ローカル→サーバー |
| `quiz_answers` | 個別回答記録（正誤、獲得XP、ヒント使用） | ローカル→サーバー |

##### ケーススタディ

| テーブル | 内容 | 同期方向 |
|---------|------|---------|
| `case_study_sessions` | セッション記録（スコア、XP、SKP） | ローカル→サーバー |
| `case_study_step_details` | ステップ別回答・採点 | ローカル→サーバー |
| `case_study_thinking_logs` | 思考プロセスログ | ローカル→サーバー |

##### コレクション

| テーブル | 内容 | 同期方向 |
|---------|------|---------|
| `wisdom_card_collection` | 格言カード所持（card_id, count, obtained_at） | 双方向 |
| `user_knowledge_collection_v2` | ナレッジカード所持（theme_id, obtained_at） | 双方向 |

##### 統計・進捗

| テーブル | 内容 | 同期方向 |
|---------|------|---------|
| `user_xp_stats_v2` | XP統計 | サーバー→ローカル（参照用） |
| `course_session_completions` | コース完了記録 | ローカル→サーバー |

**ユーザーデータ合計: 約9テーブル**

#### 書き込みキュー設計

```
■ オンライン時
  クイズ完了 → ローカルDB保存 + サーバーAPIに即送信
  → 既存の saveQuizWithRetry() のリトライ機構を活用

■ オフライン時
  クイズ完了 → ローカルDB保存 + キューに追加
  → ユーザーにはローカルの結果を即表示（楽観的UI）

■ オンライン復帰時
  キュー内の未送信データ → FIFO順でサーバーAPIに送信
  → XP/SKP計算はサーバー側で実行（クライアント側では計算しない）
  → 成功したらキューから削除

■ 競合解決
  クイズ結果・完了記録は append-only（INSERT）のため競合リスクは低い
  コレクションデータはサーバー側タイムスタンプ優先
```

#### XP/SKP計算について

**クライアント側でのXP計算は行わない。** 理由:
- `xp_settings` テーブルの複雑な計算パラメータ
- ストリークボーナス、ヒントペナルティ、時間効率計算
- 複数テーブルへのアトミック更新（`user_xp_stats_v2`, `daily_xp_records` 等）
- サーバー側でのみ整合性を保証

---

### ローカル化不要テーブル

| テーブル | 理由 |
|---------|------|
| `quiz_questions_review` | 管理者QA画面専用 |
| `quiz_review_history` / `quiz_review_batches` | QA監査ログ |
| `case_study_generation_logs` | AI生成ログ（管理者用） |
| `case_study_problem_stats` | ビュー（ローカルで集計可能） |
| `precomputed_quiz_sets` | サーバー側キャッシュ（ローカルDBがあれば不要） |

---

### 実装順序

```
Phase 0（SW有効化）
  1. ServiceWorkerRegistration.tsx のネイティブスキップ解除
  2. sw.js のプリキャッシュ拡充
  3. 動作確認（オフラインでアプリ画面表示）

Phase 1（マスタデータのローカル化）
  1. WatermelonDB インストール・初期設定
  2. モデル定義（約16テーブル分のスキーマ）
  3. 同期API構築（サーバー側: pull エンドポイント）
  4. データフェッチ層の改修（ローカルDB優先 → フォールバックでサーバー）
  5. コレクションページのパフォーマンス改善確認

Phase 2（ユーザーデータ＋書き込みキュー）
  1. ユーザーデータのモデル定義（約9テーブル）
  2. 書き込みキュー実装
  3. オンライン復帰時の同期処理
  4. QuizSession.tsx の既存localStorage退避をWatermelonDB移行
  5. オフラインでクイズ実行→復帰後同期のE2Eテスト

品質チェック
  npm run typecheck && npm run lint && npm run build
```

---

### 現在のパフォーマンス問題（ローカル化で解消予定）

#### コレクションページのN+1クエリ問題

```
■ ナレッジカード表示（現状）
  50テーマ × 3クエリ（genre, course, session） = 150+ サーバークエリ

■ 格言カード表示（現状）
  100カード × 2クエリ（hasCard, getCount） = 200+ サーバークエリ

■ ローカル化後
  ローカルJOIN 1発 → 瞬時に全カード+所持状態を表示
```

---

## Step 5: React Native移行 [未着手]

### 判断基準

Step 4のローカル化完了後、WebViewのパフォーマンスを実機評価して判断。以下の場合に検討:
- Capacitor WebView方式でパフォーマンスが不足
- ネイティブUIが必要（リスト仮想化、ジェスチャー等）
- オフラインアプリシェルの確実性が必要

### 選択肢比較

| 方式 | コード再利用 | ネイティブ性能 | 開発コスト | OTAアップデート |
|------|------------|--------------|-----------|----------------|
| **Capacitor継続** | 100%（現行コード） | 中（WebView） | 低 | Vercelデプロイで即反映 |
| **React Native** | WatermelonDB層はそのまま | 高 | 中（UI書き直し） | CodePush等で可能 |
| **Expo** | WatermelonDB層はそのまま | 高 | 中 | EAS Update対応 |
| **Flutter** | 不可（Dart書き直し） | 高 | 最高 | Shorebird等で可能 |

### 現時点の推奨

**Capacitor + WatermelonDB** で Step 4 を完了させ、実機パフォーマンスを評価する。RN移行時はWatermelonDBのアダプタ切替（LokiJS→Native SQLite）のみでデータ層を再利用。UI層のみ書き直し。

```
Capacitor WebView + WatermelonDB（LokiJSアダプタ）
  ↓ パフォーマンス評価後、必要に応じて
React Native + WatermelonDB（Native SQLiteアダプタ）
  ↓ データ層そのまま、UI層のみ書き直し
```

---

## 参考: 重要ファイルマップ

### PWA関連
| ファイル | 役割 |
|---------|------|
| `app/manifest.ts` | PWAマニフェスト定義 |
| `public/sw.js` | Service Worker |
| `components/pwa/ServiceWorkerRegistration.tsx` | SW登録 |
| `app/offline/page.tsx` | オフラインページ |

### Capacitor / iOS関連
| ファイル | 役割 |
|---------|------|
| `capacitor.config.ts` | Capacitor設定（ソース） |
| `ios/App/App/Info.plist` | iOSアプリ設定 |
| `ios/App/App/AppDelegate.swift` | アプリデリゲート |
| `ios/App/App/capacitor.config.json` | Capacitor設定（生成） |
| `ios/App/App/Assets.xcassets/` | アイコン・スプラッシュ |

### ネイティブ機能
| ファイル | 役割 |
|---------|------|
| `lib/capacitor-utils.ts` | プラットフォーム検出 |
| `lib/biometric-auth.ts` | Face ID/Touch IDサービス |
| `lib/native-secure-storage.ts` | iOS Keychainラッパー |
| `components/native/NativeAppDetector.tsx` | ネイティブUI検出・設定 |
| `components/native/BiometricEnableDialog.tsx` | Face ID有効化ダイアログ |

### ローカルDB（Step 4で新規作成予定）
| ファイル | 役割 |
|---------|------|
| `lib/offline/models/` | WatermelonDBモデル定義（約25テーブル） |
| `lib/offline/sync.ts` | 同期ロジック（pull/push） |
| `lib/offline/cache.ts` | キャッシュ管理・TTL制御 |
| `lib/offline/queue.ts` | 書き込みキュー（オフライン時の未送信データ） |
| `hooks/useNetworkStatus.ts` | オンライン/オフライン状態検出 |
| `app/api/sync/pull/route.ts` | 同期API（サーバー→ローカル差分取得） |
| `app/api/sync/push/route.ts` | 同期API（ローカル→サーバー送信） |

### CI/CD
| ファイル | 役割 |
|---------|------|
| `.github/workflows/ios-build.yml` | iOSビルド & TestFlightアップロード |

---

## 参考: 証明書・プロファイルの更新

Apple Distribution証明書とProvisioning Profileには有効期限があります（通常1年）。

### 証明書の更新手順
1. Apple Developer Portal → Certificates → 期限切れの証明書を確認
2. 新しいCSRを作成 → 新しい証明書を発行
3. .p12に変換 → Base64エンコード
4. GitHub Secrets → `APPLE_CERTIFICATE_BASE64` と `APPLE_CERTIFICATE_PASSWORD` を更新

### Provisioning Profileの更新手順
1. Apple Developer Portal → Profiles → 該当プロファイルをEdit
2. 新しい証明書を選択 → Generate → Download
3. Base64エンコード → GitHub Secrets → `APPLE_PROVISIONING_PROFILE_BASE64` を更新

### App Store Connect API Keyの更新
- API Keyには有効期限がない（無効化しない限り有効）
- 必要に応じて新しいキーを作成し、古いキーを無効化
