# 格言カード ビジュアルリソース構成

## 📁 フォルダ構成

```
public/images/wisdom-cards/
├── backgrounds/           # 背景画像
│   ├── common/           # コモン（共通）用背景
│   ├── rare/             # レア用背景  
│   ├── epic/             # エピック用背景
│   └── legendary/        # レジェンダリー用背景
├── portraits/            # 著者ポートレート画像
├── frames/               # レアリティフレーム画像
├── animations/           # アニメーション動画・GIF
└── icons/                # カテゴリーアイコン
```

## 🎨 ビジュアル要素種類

### 背景画像 (backgrounds/)
- **用途**: カードの背景・テーマ表現
- **サイズ**: 推奨 800x600px または 4:3比率
- **形式**: JPG, PNG
- **命名**: `[テーマ名]-bg.jpg`

### ポートレート (portraits/)
- **用途**: 著者の顔写真・イラスト
- **サイズ**: 推奨 200x200px (正方形)
- **形式**: JPG, PNG
- **命名**: `[著者名ローマ字].jpg`

### フレーム (frames/)
- **用途**: レアリティを表すカード枠
- **サイズ**: 推奨 850x650px
- **形式**: PNG (透明背景)
- **命名**: `[rarity]-frame.png`

### アニメーション (animations/)
- **用途**: カード表示時のエフェクト
- **形式**: MP4, GIF, WebM
- **サイズ**: 軽量化推奨
- **命名**: `[エフェクト名].mp4`

### アイコン (icons/)
- **用途**: カテゴリー表示
- **サイズ**: 64x64px
- **形式**: SVG, PNG
- **命名**: `[category_id].svg`

## 📋 現在の設定状況

### 移行済みパス (database/insert_wisdom_cards_data.sql より)

#### レアリティ別背景:
- **コモン**: `/images/wisdom-cards/backgrounds/common/process-bg.jpg`
- **レア**: `/images/wisdom-cards/backgrounds/rare/[theme]-bg.jpg`
- **エピック**: `/images/wisdom-cards/backgrounds/epic/[theme]-bg.jpg`  
- **レジェンダリー**: `/images/wisdom-cards/backgrounds/legendary/[theme]-supreme.jpg`

#### フレーム:
- **コモン**: `/images/wisdom-cards/frames/common-frame.png`
- **レア**: `/images/wisdom-cards/frames/rare-frame.png`
- **エピック**: `/images/wisdom-cards/frames/epic-frame.png`
- **レジェンダリー**: `/images/wisdom-cards/frames/legendary-frame.png`

#### ポートレート例:
- `drucker.jpg`, `jobs.jpg`, `buffett.jpg`, `welch.jpg`
- `porter.jpg`, `toyota-sakichi.jpg`, `musk.jpg`
- `sandberg.jpg`, `inamori.jpg`, `knight.jpg`
- `dalio.jpg`, `son-masayoshi.jpg`

## 🔄 次のステップ

1. **プレースホルダー画像作成**: 各レアリティのフレーム・背景
2. **著者ポートレート収集**: ライセンスフリー素材調達
3. **アニメーションエフェクト**: パーティクル・グロー効果
4. **カテゴリーアイコン**: 戦略・財務・リーダーシップ等

## ⚠️ 注意事項

- **著作権**: 著者のポートレートは商用利用可能な素材を使用
- **ファイルサイズ**: ページ読み込み速度考慮で最適化必須
- **フォールバック**: 画像読み込み失敗時のデフォルト表示準備
- **レスポンシブ**: 異なる画面サイズでの適切な表示確認

---
*作成日: 2025年10月16日*
*目的: 格言カードDB化Phase1 ビジュアルリソース準備*