'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Save, X, Text, Target, Lightbulb } from 'lucide-react'

// Phase1仕様: 制限されたコンテンツタイプのみ
type Phase1ContentType = 'text' | 'example' | 'key_points'

interface Content {
  id: string
  session_id: string
  content_type: Phase1ContentType
  title: string | null
  content: string
  duration: number | null
  display_order: number
}

interface Phase1ContentEditModalProps {
  content: Content | null
  isOpen: boolean
  onClose: () => void
  onSave: (contentData: {
    session_id: string
    content_type: Phase1ContentType
    title: string
    content: string
    duration?: number
  }) => Promise<void>
  sessionId?: string
}

// Phase1コンテンツタイプ定義
const phase1ContentTypeOptions = [
  { 
    value: 'text' as Phase1ContentType, 
    label: 'テキスト',
    icon: <Text className="h-4 w-4 text-blue-600" />,
    description: '基本的な説明文・解説文'
  },
  { 
    value: 'example' as Phase1ContentType, 
    label: '事例',
    icon: <Target className="h-4 w-4 text-green-600" />,
    description: '具体的な事例・ケーススタディ'
  },
  { 
    value: 'key_points' as Phase1ContentType, 
    label: '重要ポイント',
    icon: <Lightbulb className="h-4 w-4 text-orange-600" />,
    description: '要点整理・まとめ'
  }
]

export function Phase1ContentEditModal({
  content,
  isOpen,
  onClose,
  onSave,
  sessionId
}: Phase1ContentEditModalProps) {
  const [formData, setFormData] = useState({
    content_type: 'text' as Phase1ContentType,
    title: '',
    content: '',
    duration: 5
  })
  const [saving, setSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  useEffect(() => {
    if (content) {
      setFormData({
        content_type: content.content_type,
        title: content.title || '',
        content: content.content,
        duration: content.duration || 5
      })
    } else {
      setFormData({
        content_type: 'text',
        title: '',
        content: '',
        duration: 5
      })
    }
    setHasUnsavedChanges(false)
  }, [content])

  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      const shouldClose = window.confirm('編集中の内容が失われます。モーダルを閉じますか？')
      if (!shouldClose) return
    }
    setHasUnsavedChanges(false)
    onClose()
  }, [hasUnsavedChanges, onClose])

  const handleSave = async () => {
    if (!sessionId && !content?.session_id) return

    setSaving(true)
    try {
      await onSave({
        session_id: sessionId || content!.session_id,
        content_type: formData.content_type,
        title: formData.title,
        content: formData.content,
        duration: formData.duration
      })
      setHasUnsavedChanges(false)
      onClose()
    } catch (error) {
      console.error('Content save error:', error)
    } finally {
      setSaving(false)
    }
  }

  const selectedOption = phase1ContentTypeOptions.find(opt => opt.value === formData.content_type)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {selectedOption?.icon}
            <span>
              {content ? 'コンテンツ編集' : 'コンテンツ新規作成'} (Phase1仕様)
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="content_type" className="text-sm font-medium">
                コンテンツタイプ
              </Label>
              <Select 
                value={formData.content_type} 
                onValueChange={(value: Phase1ContentType) => {
                  setFormData(prev => ({ ...prev, content_type: value }))
                  setHasUnsavedChanges(true)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {phase1ContentTypeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center space-x-2">
                        {option.icon}
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">{option.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-1 text-xs text-blue-600">
                ✓ Phase1対応済み (3種類のみ利用可能)
              </div>
            </div>

            <div>
              <Label htmlFor="duration" className="text-sm font-medium">
                予想時間（分）
              </Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="60"
                value={formData.duration}
                onChange={(e) => {
                  setFormData(prev => ({ 
                    ...prev, 
                    duration: parseInt(e.target.value) || 5 
                  }))
                  setHasUnsavedChanges(true)
                }}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="title" className="text-sm font-medium">
              タイトル
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, title: e.target.value }))
                setHasUnsavedChanges(true)
              }}
              placeholder="コンテンツのタイトルを入力..."
            />
          </div>

          <div>
            <Label htmlFor="content" className="text-sm font-medium">
              内容
            </Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, content: e.target.value }))
                setHasUnsavedChanges(true)
              }}
              placeholder={`${selectedOption?.label}の内容を入力...`}
              rows={8}
              className="resize-none"
            />
            <div className="mt-1 text-xs text-muted-foreground">
              {selectedOption?.description}
            </div>
          </div>

          {/* Phase制約と拡張予定 */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-semibold text-blue-800 mb-3">コンテンツタイプ制限・拡張予定</h4>
            
            <div className="space-y-2 text-xs">
              {/* Phase 1 現在の制限 */}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="font-medium text-blue-800">Phase 1（現在）:</span>
                <span className="text-blue-700">text, example, key_points のみ利用可能</span>
              </div>
              
              {/* Phase 2 拡張予定 */}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="font-medium text-green-800">Phase 2（予定）:</span>
                <span className="text-green-700">+ image（画像・図表）, video（動画解説）</span>
              </div>
              
              {/* Phase 3 拡張予定 */}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span className="font-medium text-purple-800">Phase 3（将来）:</span>
                <span className="text-purple-700">+ interactive（ドラッグ&ドロップ・シミュレーション）</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            <X className="h-4 w-4 mr-2" />
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={saving || !formData.content.trim()}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}