// プロフィール編集用のマスターデータ

// 経験年数選択肢（オンボーディングと同じ）
export const EXPERIENCE_OPTIONS = [
  { value: 0, label: '1年未満' },
  { value: 2, label: '1-3年' },
  { value: 5, label: '4-7年' },
  { value: 10, label: '8-15年' },
  { value: 16, label: '16年以上' }
]

// 職種選択肢（オンボーディングと同じ）
export const JOB_TITLES = [
  '経営・管理職',
  '営業・マーケティング',
  '企画・戦略',
  'エンジニア・技術職',
  'コンサルタント',
  '人事・総務',
  '財務・経理',
  'その他'
]

// 学習目標選択肢（オンボーディングと同じ）
export const LEARNING_GOALS = [
  'スキルアップ・キャリア向上',
  '資格取得・認定試験対策', 
  '転職・就職準備',
  '業務効率化',
  '新しい知識の習得',
  'チームメンバーの育成'
]

// 週間学習目標
export const WEEKLY_GOALS = [
  { id: 'light', label: 'ライト', description: '週2-3回、1回10分程度' },
  { id: 'medium', label: 'ミディアム', description: '週4-5回、1回15分程度' },
  { id: 'heavy', label: 'ヘビー', description: '毎日、1回20分以上' }
]

// 職位レベル（新規追加）
export const POSITION_LEVELS = [
  { value: 'entry', label: '新入社員・エントリーレベル' },
  { value: 'junior', label: 'ジュニア・アシスタント' },
  { value: 'mid', label: 'ミドル・シニア' },
  { value: 'senior', label: 'シニア・エキスパート' },
  { value: 'lead', label: 'リーダー・マネージャー' },
  { value: 'director', label: 'ディレクター・部長' },
  { value: 'executive', label: '役員・エグゼクティブ' }
]

// 学習レベル（新規追加）
export const LEARNING_LEVELS = [
  { value: 'beginner', label: '初心者', description: '基礎から学びたい' },
  { value: 'intermediate', label: '中級者', description: '基礎知識はある' },
  { value: 'advanced', label: '上級者', description: '専門知識を深めたい' },
  { value: 'expert', label: 'エキスパート', description: '最新動向を追いたい' }
]