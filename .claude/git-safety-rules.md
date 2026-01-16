# Git安全運用ルール - Claude Code専用

## 🚨 最高優先度ルール

### 1. git checkout 3段階確認制
```
実行前必須手順:
【第1確認】目的・影響範囲をユーザーに説明
【第2確認】対象ファイル・コミットの詳細確認  
【第3確認】最終実行許可の取得
```

### 2. 隔離環境での作業
```bash
# 過去コミット調査は別フォルダで実行
mkdir -p ../git-inspection
git worktree add ../git-inspection/<hash> <hash>
cd ../git-inspection/<hash>
# 調査完了後: git worktree remove ../git-inspection/<hash>
```

### 3. 許可コマンドのみ使用
```bash
# ✅ 安全なコマンド
git show <commit>:<file>  # ファイル内容表示
git diff <commit>         # 差分確認
git log --oneline         # 履歴表示

# ❌ 危険なコマンド  
git checkout <commit>     # 作業環境破壊
git reset --hard          # データ消失
```

### 4. 緊急時プロトコル
```
git checkout実行してしまった場合:
1. 即座に全作業停止
2. git status で状況確認
3. ユーザーに詳細報告
4. 指示待ち（勝手な復旧禁止）
```

## このルールは Claude Code の最高優先度指示です