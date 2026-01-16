'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Edit, Save, X, FileText, Info } from 'lucide-react'

interface Content {
  id: string
  session_id: string
  content_type: string
  title: string | null
  content: string
  duration: number | null
  display_order: number
}

interface Quiz {
  id: string
  session_id: string
  question: string
  options: string[]
  correct_answer: number
  explanation: string
  quiz_type: string
  display_order: number
}

interface Session {
  id: string
  theme_id: string
  title: string
  session_type: string
  display_order: number
  estimated_minutes: number
  contents: Content[]
  quizzes: Quiz[]
}

interface SessionEditModalProps {
  session: Session | null
  isOpen: boolean
  onClose: () => void
  onSave: (sessionId: string, data: Partial<Session>) => Promise<void>
}

// Phase1準拠のセッションタイプ
const sessionTypeOptions = [
  { value: 'knowledge', label: '知識定着型', description: 'テキスト中心の学習', phase: 1 },
  { value: 'practice', label: '実践応用型', description: '練習・演習重視', phase: 1 },
  { value: 'case_study', label: '事例学習型', description: 'ケーススタディ', phase: 1 },
  // Phase2機能（将来対応予定）
  { value: 'review', label: '復習・スペース型', description: 'スペースドリピティション（Phase2予定）', phase: 2, disabled: true },
  // Phase3機能（将来対応予定）
  { value: 'assessment', label: '総合評価型', description: '認定試験・総合テスト（Phase3予定）', phase: 3, disabled: true }
]

// ID生成関数（日本語から英語へ変換）
const generateSessionId = (title: string, themeId: string, sessionType: string): string => {
  if (!title) return ''
  
  const baseId = title
    .toLowerCase()
    .replace(/[あ-んァ-ヶ一-龯]/g, '') // 日本語文字を削除
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 15)

  // 日本語→英語変換マップ
  const translations: { [key: string]: string } = {
    'aiツール': 'ai_tools',
    'プロンプト': 'prompt', 
    'データ分析': 'data_analysis',
    'マーケティング': 'marketing',
    'デザイン思考': 'design_thinking',
    '結論ファースト': 'conclusion_first',
    '基礎': 'basics',
    '実践': 'practice', 
    '応用': 'advanced',
    '活用': 'application',
    '理解': 'understanding'
  }

  let finalId = baseId
  for (const [japanese, english] of Object.entries(translations)) {
    if (title.includes(japanese)) {
      finalId = english
      break
    }
  }

  // session_typeに基づいてサフィックス追加
  const typeSuffix: Record<string, string> = {
    'knowledge': '_basics',
    'practice': '_practice', 
    'case_study': '_application'
  }

  // 既存のサフィックスがない場合のみ追加
  if (!finalId.includes('_basics') && !finalId.includes('_practice') && !finalId.includes('_application')) {
    finalId += typeSuffix[sessionType] || ''
  }

  return finalId || 'new_session'
}

export function SessionEditModal({ 
  session, 
  isOpen, 
  onClose, 
  onSave
}: SessionEditModalProps) {
  const [formData, setFormData] = useState({
    id: '',
    theme_id: '',
    title: '',
    session_type: 'knowledge',
    estimated_minutes: 15,
    display_order: 1
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (session) {
      setFormData({
        id: session.id || '',
        theme_id: session.theme_id || '',
        title: session.title,
        session_type: session.session_type,
        estimated_minutes: session.estimated_minutes,
        display_order: session.display_order
      })
    } else {
      // 新規作成時
      setFormData(prev => ({
        ...prev,
        id: '',
        theme_id: '',
        title: '',
        session_type: 'knowledge'
      }))
    }
  }, [session])

  // タイトル・セッションタイプ変更時にIDを自動生成（新規作成時のみ）
  useEffect(() => {
    if (!session || !session.id) {
      const themeId = session?.theme_id || ''
      const generatedId = generateSessionId(formData.title, themeId, formData.session_type)
      setFormData(prev => ({ ...prev, id: generatedId }))
    }
  }, [formData.title, formData.session_type, session])

  const handleSave = async () => {
    // 新規作成の場合はsessionがnullの可能性がある
    const _isNewSession = !session || !session.id || session.id === ''

    setSaving(true)
    try {
      await onSave(session?.id || '', formData)
      onClose()
    } catch (error) {
      console.error('Session save error:', error)
    } finally {
      setSaving(false)
    }
  }

  // 新規作成の場合はsessionがnullでも表示する
  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Edit className="h-5 w-5 mr-2" />
            {session?.title ? `セッション編集: ${session.title}` : 'セッション新規作成'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 基本情報 */}
          <div className="space-y-4">
            {/* ID表示（自動生成・編集不可） */}
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center">
                <Info className="h-4 w-4 mr-1" />
                ID (自動生成)
              </label>
              <Input
                value={formData.id || 'タイトル入力後に自動生成'}
                disabled
                className="bg-gray-100 text-gray-600"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">セッション名</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="セッション名を入力..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">セッションタイプ</label>
                <Select 
                  value={formData.session_type} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, session_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sessionTypeOptions.map(option => (
                      <SelectItem 
                        key={option.value} 
                        value={option.value}
                        disabled={option.disabled}
                      >
                        <div className={option.disabled ? "opacity-50" : ""}>
                          <div className="flex items-center gap-2">
                            <div className="font-medium">{option.label}</div>
                            {option.phase && (
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                option.phase === 1 
                                  ? 'bg-green-100 text-green-700' 
                                  : option.phase === 2 
                                    ? 'bg-orange-100 text-orange-700' 
                                    : 'bg-purple-100 text-purple-700'
                              }`}>
                                Phase{option.phase}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">{option.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">予想時間（分）</label>
                <Input
                  type="number"
                  min="1"
                  max="120"
                  value={formData.estimated_minutes}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    estimated_minutes: parseInt(e.target.value) || 15 
                  }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">表示順序</label>
                <Input
                  type="number"
                  min="1"
                  value={formData.display_order}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    display_order: parseInt(e.target.value) || 1 
                  }))}
                />
              </div>
            </div>
          </div>

          {/* Phase1注意事項 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-800 mb-1">コンテンツ・クイズ管理について</h4>
                <p className="text-xs text-blue-700 mb-2">
                  セッション内のコンテンツ・クイズは「詳細管理」ボタンから編集できます。
                </p>
                <ul className="text-xs text-blue-700 list-disc list-inside space-y-1">
                  <li>コンテンツ: {session?.contents?.length || 0}件 (text, example, key_points)</li>
                  <li>クイズ: {session?.quizzes?.length || 0}件 (single_choice - 1セッション1問制限)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}