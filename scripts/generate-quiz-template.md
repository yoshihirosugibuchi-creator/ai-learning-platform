# クイズ問題生成テンプレート

## 使い方
1. このテンプレートをClaude（チャット版）にコピー
2. パラメータを調整
3. 生成された問題をコピー
4. quiz-import.jsonとして保存
5. 管理画面からインポート

## プロンプトテンプレート

```
以下の条件で日本語のクイズ問題を生成してください。
出力はJSON形式でお願いします。

【条件】
- カテゴリー: [CATEGORY_NAME]
- サブカテゴリー: [SUBCATEGORY_NAME]
- 難易度: [beginner/intermediate/advanced/expert]
- 問題数: [NUMBER]問
- 業界: [INDUSTRY_NAME]（オプション）

【出力形式】
{
  "questions": [
    {
      "id": "generated_[timestamp]_[index]",
      "question": "問題文",
      "options": {
        "A": "選択肢1",
        "B": "選択肢2", 
        "C": "選択肢3",
        "D": "選択肢4"
      },
      "correctAnswer": "A",
      "explanation": "解説文",
      "category": "カテゴリーID",
      "subcategory": "サブカテゴリーID",
      "difficulty": "難易度",
      "tags": ["タグ1", "タグ2"],
      "metadata": {
        "generated_by": "Claude",
        "generated_at": "2024-10-19",
        "reviewed": false
      }
    }
  ]
}

【品質基準】
- 正確性: 誤った情報を含まない
- 明確性: 曖昧な表現を避ける
- 教育的: 解説で学習効果を高める
- 適切性: 指定難易度に合致
```

## 実例

### プログラミング・JavaScript・intermediate の例

```json
{
  "questions": [
    {
      "id": "generated_20241019_001",
      "question": "JavaScriptのPromise.all()について、正しい説明はどれですか？",
      "options": {
        "A": "すべてのPromiseが解決されるまで待機し、すべての結果を配列で返す",
        "B": "最初に解決されたPromiseの結果のみを返す",
        "C": "最後に解決されたPromiseの結果のみを返す",
        "D": "Promiseを順番に実行する"
      },
      "correctAnswer": "A",
      "explanation": "Promise.all()は、渡されたすべてのPromiseが解決されるまで待機し、すべての結果を配列として返します。一つでも拒否された場合は、全体が拒否されます。",
      "category": "programming",
      "subcategory": "javascript",
      "difficulty": "intermediate",
      "tags": ["非同期処理", "Promise", "並列処理"],
      "metadata": {
        "generated_by": "Claude",
        "generated_at": "2024-10-19",
        "reviewed": false
      }
    }
  ]
}
```